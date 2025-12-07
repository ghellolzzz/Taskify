// src/models/Profile.model.js
const prisma = require('./prismaClient');
const habitModel = require('./Habit.model');

/**
 * Utility: get start of day (local)
 */
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Utility: add days
 */
function addDays(date, offset) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

/**
 * Returns:
 * {
 *   user: {
 *     id, name, email, createdAt, avatarUrl, bio,
 *     streakCount, lastActive, theme, accentColor
 *   },
 *   stats: {
 *     tasksToday, tasksWeek,
 *     goalsDone, goalsTotal,
 *     tasksCompletedRange, tasksTotalRange,
 *     productivity: {
 *       score, completedThisWeek, overdueThisWeek,
 *       level, label, message
 *     }
 *   },
 *   categories: [{
 *     id, name, color, taskCount, percentage
 *   }], // sorted by taskCount desc, then name asc
 *   chain: [{ date, active }]
 * }
 */
async function getProfileOverview(userId) {
  const numericId = Number(userId);

  const user = await prisma.user.findUnique({
    where: { id: numericId },
    include: {
      tasks: true,
      goals: true,
      categories: {
        include: { tasks: true },
      },
    },
  });

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = addDays(todayStart, -6); // last 7 days (today inclusive)

  const tasks = user.tasks || [];
  const completedTasks = tasks.filter((t) => t.status === 'Completed');

  // ✅ Count ALL tasks created today / this week (not just completed)
  const tasksToday = tasks.filter((t) => t.createdAt >= todayStart).length;
  const tasksWeek = tasks.filter((t) => t.createdAt >= weekStart).length;

  // ✅ Range stats (for "Last 7 days" task completion bar)
  const tasksInRange = tasks.filter((t) => t.createdAt >= weekStart);
  const tasksCompletedRange = completedTasks.filter(
    (t) => t.updatedAt >= weekStart
  ).length;
  const tasksTotalRange = tasksInRange.length;

  // Goals
  const goals = user.goals || [];
  const goalsDone = goals.filter((g) => g.completed).length;
  const goalsTotal = goals.length;

  // ---------- Category breakdown (with percentage + sorting) ----------
  const categoriesWithCounts = (user.categories || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    color: cat.color,
    taskCount: (cat.tasks || []).length,
  }));

  const totalTasksAcrossCategories = categoriesWithCounts.reduce(
    (sum, cat) => sum + cat.taskCount,
    0
  );

  const categories = categoriesWithCounts
    .map((cat) => ({
      ...cat,
      percentage:
        totalTasksAcrossCategories > 0
          ? Math.round((cat.taskCount / totalTasksAcrossCategories) * 100)
          : 0,
    }))
    .sort((a, b) => {
      // Sort by taskCount desc, then name asc
      if (b.taskCount === a.taskCount) {
        return a.name.localeCompare(b.name);
      }
      return b.taskCount - a.taskCount;
    });

  // ---------- Build last 7-day chain based on COMPLETED tasks ----------
  const chain = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = addDays(todayStart, -i);
    const dayEnd = addDays(dayStart, 1);
    const active = completedTasks.some(
      (t) => t.updatedAt >= dayStart && t.updatedAt < dayEnd
    );
    chain.push({
      date: dayStart.toISOString(),
      active,
    });
  }

  // ✅ Compute streak from the chain (consecutive active days up to today)
  let streakCount = 0;
  for (let i = chain.length - 1; i >= 0; i--) {
    if (chain[i].active) {
      streakCount++;
    } else {
      break;
    }
  }

  // ---------- Productivity score ----------
  // Completed tasks this week (based on updatedAt)
  const tasksCompletedThisWeek = completedTasks.filter(
    (t) => t.updatedAt >= weekStart
  ).length;

  // Overdue tasks this week (if you have a dueDate field)
  const overdueTasksThisWeek = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return (
      due < now &&
      t.status !== 'Completed' &&
      t.createdAt >= weekStart
    );
  }).length;

  // Productivity score formula
  const productivityScore =
    tasksCompletedThisWeek * 2 - overdueTasksThisWeek * 3;

  // Simple level + message (for UI)
  let productivityLevel = 'neutral';
  let productivityLabel = 'You are on track this week.';
  let productivityMessage =
    'Complete more tasks and keep overdue items low to boost your score.';

  if (productivityScore >= 10) {
    productivityLevel = 'good';
    productivityLabel = 'Great work – very productive week!';
    productivityMessage =
      'You are completing many tasks and keeping overdue items low.';
  } else if (productivityScore <= -1) {
    productivityLevel = 'bad';
    productivityLabel = 'Needs attention – too many overdue tasks.';
    productivityMessage =
      'Try to finish overdue tasks first to bring your score back up.';
  } else if (productivityScore >= 1 && productivityScore < 10) {
    productivityLevel = 'ok';
    productivityLabel = 'Decent progress – you can still push a bit more.';
    productivityMessage =
      'A few more completed tasks will turn this into a great week.';
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      streakCount,
      lastActive: user.lastActive,
      theme: user.theme,
      accentColor: user.accentColor,
    },
    stats: {
      tasksToday,
      tasksWeek,
      goalsDone,
      goalsTotal,
      tasksCompletedRange,
      tasksTotalRange,
      productivity: {
        score: productivityScore,
        completedThisWeek: tasksCompletedThisWeek,
        overdueThisWeek: overdueTasksThisWeek,
        level: productivityLevel,
        label: productivityLabel,
        message: productivityMessage,
      },
    },
    categories,
    chain,
  };
}

/**
 * Badges for profile:
 * {
 *   unlocked: [{ code, name, description, icon, awardedAt }],
 *   locked:   [{ code, name, description, icon }]
 * }
 */
async function getProfileBadges(userId) {
  const numericId = Number(userId);

  // Reuse overview to get streak, stats, categories
  const overview = await getProfileOverview(userId);
  const { user, categories } = overview;
  const streak = user.streakCount || 0;

  // pull habits summary from Habits board
  let activeHabits = 0;
  let totalHabits = 0;
  let habitLongestStreak = 0;

  try {
    const board = await habitModel.getHabitsBoard(userId);
    const habitSummary = board?.summary || {};

    activeHabits = habitSummary.activeHabits || 0;
    totalHabits = habitSummary.totalHabits || 0;
    habitLongestStreak =
      (habitSummary.longestStreakHabit &&
        habitSummary.longestStreakHabit.streak) ||
      0;
  } catch (err) {
    console.warn('Failed to load habits summary for badges:', err.message);
  }

  // Lifetime task counts
  const [totalTasks, completedTasksTotal] = await Promise.all([
    prisma.task.count({
      where: { userId: numericId },
    }),
    prisma.task.count({
      where: { userId: numericId, status: 'Completed' },
    }),
  ]);

  const categoriesUsed = categories.filter((c) => (c.taskCount || 0) > 0).length;

  // 1) Get all badge definitions + current user badges
  const [allBadges, userBadges] = await Promise.all([
    prisma.badge.findMany(), // rows from "badges"
    prisma.userBadge.findMany({
      where: { userId: numericId },
      include: { badge: true },
    }),
  ]);

  const existingCodes = new Set(userBadges.map((ub) => ub.badge.code));

  // Helper: find badge definition by code
  const findBadge = (code) => allBadges.find((b) => b.code === code);

  // Helper: track which new user_badges we need to insert
  const toCreate = [];

  function maybeAward(code, condition) {
    if (!condition) return;

    // Badge must exist in DB
    const badge = findBadge(code);
    if (!badge) {
      console.warn(`Badge with code "${code}" not found in DB`);
      return;
    }

    // Don't duplicate if user already has it
    if (existingCodes.has(code)) return;

    toCreate.push({
      userId: numericId,
      badgeId: badge.id,
    });
  }

  maybeAward('ROOKIE', totalTasks >= 1);      // first task created
  maybeAward('STREAK_3', streak >= 3);        // 3-day streak

  maybeAward('HABIT_STARTER',  totalHabits >= 1);          // created first habit
  maybeAward('HABIT_ACTIVE_3', activeHabits >= 3);         // 3+ active habits
  maybeAward('HABIT_STREAK_3', habitLongestStreak >= 3);   // 3-day habit streak

  // 3) Insert any new user_badges
  if (toCreate.length > 0) {
    await prisma.userBadge.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }

  // 4) Fetch final user badges (including newly created ones) for UI
  const finalUserBadges = await prisma.userBadge.findMany({
    where: { userId: numericId },
    include: { badge: true },
    orderBy: { awardedAt: 'desc' },
  });

  const unlocked = finalUserBadges.map((ub) => ({
    code: ub.badge.code,
    name: ub.badge.name,
    description: ub.badge.description,
    icon: ub.badge.icon,
    awardedAt: ub.awardedAt,
  }));

  const unlockedCodes = new Set(unlocked.map((b) => b.code));

  const locked = allBadges
    .filter((b) => !unlockedCodes.has(b.code))
    .map((b) => ({
      code: b.code,
      name: b.name,
      description: b.description,
      icon: b.icon,
    }));

  return { unlocked, locked };
}

/**
 * Activity heatmap + recent events:
 * {
 *   heatmap: [{ date, count, level }],
 *   recent:  [{ type, label, createdAt }]
 * }
 */
async function getProfileActivity(userId) {
  const numericId = Number(userId);
  const now = new Date();
  const todayStart = startOfDay(now);
  const startRange = addDays(todayStart, -27); // last 28 days

  // Tasks in last 28 days
  const tasks = await prisma.task.findMany({
    where: {
      userId: numericId,
      updatedAt: { gte: startRange },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Goals (completed only)
  const goals = await prisma.goal.findMany({
    where: {
      userId: numericId,
      completed: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Calendar notes for timeline
  const calendar = await prisma.calendarTask.findMany({
    where: {
      userId: numericId,
      date: { gte: startRange },
    },
    orderBy: { date: 'desc' },
    take: 10,
  });

  // Build heatmap: count completed tasks per day
  const heatmap = [];
  for (let i = 27; i >= 0; i--) {
    const dayStart = addDays(todayStart, -i);
    const dayEnd = addDays(dayStart, 1);

    const count = tasks.filter(
      (t) =>
        t.status === 'Completed' &&
        t.updatedAt >= dayStart &&
        t.updatedAt < dayEnd
    ).length;

    // Level for UI (0–3)
    let level = 0;
    if (count > 0 && count <= 2) level = 1;
    else if (count <= 5) level = 2;
    else if (count > 5) level = 3;

    heatmap.push({
      date: dayStart.toISOString(),
      count,
      level,
    });
  }

  // Recent activity timeline: tasks + goals + calendar
  const events = [];

  tasks.slice(0, 15).forEach((t) => {
    if (t.status === 'Completed') {
      events.push({
        type: 'TASK_COMPLETED',
        label: `Completed "${t.title}"`,
        createdAt: t.updatedAt,
      });
    } else {
      events.push({
        type: 'TASK_CREATED',
        label: `Created task "${t.title}"`,
        createdAt: t.createdAt,
      });
    }
  });

  goals.forEach((g) => {
    events.push({
      type: 'GOAL_COMPLETED',
      label: `Completed goal "${g.title}"`,
      createdAt: g.createdAt,
    });
  });

  calendar.forEach((c) => {
    events.push({
      type: 'CALENDAR_NOTE',
      label: `Added calendar note "${c.content}"`,
      createdAt: c.date,
    });
  });

  // Sort newest first & keep top 15
  events.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const recent = events.slice(0, 15);

  return {
    heatmap,
    recent,
  };
}

/**
 * Update profile fields for a user.
 * Allowed fields: name, bio, avatarUrl, theme, accentColor
 */
async function updateProfile(userId, data) {
  const numericId = Number(userId);

  const allowedFields = ['name', 'bio', 'avatarUrl', 'theme', 'accentColor'];
  const updateData = {};

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      updateData[field] = data[field];
    }
  });

  if (Object.keys(updateData).length === 0) {
    const error = new Error('No valid fields to update');
    error.status = 400;
    throw error;
  }

  const updated = await prisma.user.update({
    where: { id: numericId },
    data: updateData,
  });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    bio: updated.bio,
    avatarUrl: updated.avatarUrl,
    theme: updated.theme,
    accentColor: updated.accentColor,
    streakCount: updated.streakCount,
    lastActive: updated.lastActive,
  };
}

module.exports = {
  getProfileOverview,
  getProfileBadges,
  getProfileActivity,
  updateProfile,
};
