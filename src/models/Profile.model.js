// src/models/Profile.model.js
const prisma = require('./prismaClient');

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
 *   user: { id, name, email, createdAt, avatarUrl, bio, streakCount, lastActive, theme, accentColor },
 *   stats: { tasksToday, tasksWeek, goalsDone, goalsTotal, tasksCompletedRange, tasksTotalRange },
 *   categories: [{ id, name, color, taskCount }],
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

  const tasksToday = completedTasks.filter(
    (t) => t.updatedAt >= todayStart
  ).length;

  const tasksWeek = completedTasks.filter(
    (t) => t.updatedAt >= weekStart
  ).length;

  // Range stats (for the "Last 7 days" bar)
  const tasksInRange = tasks.filter((t) => t.createdAt >= weekStart);
  const tasksCompletedRange = completedTasks.filter(
    (t) => t.updatedAt >= weekStart
  ).length;
  const tasksTotalRange = tasksInRange.length;

  // Goals
  const goals = user.goals || [];
  const goalsDone = goals.filter((g) => g.completed).length;
  const goalsTotal = goals.length;

  // Categories breakdown
  const categories = (user.categories || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    color: cat.color,
    taskCount: (cat.tasks || []).length,
  }));

  // Last 7 days chain
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

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      streakCount: user.streakCount,
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

  const [allBadges, userBadges] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({
      where: { userId: numericId },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    }),
  ]);

  const unlocked = userBadges.map((ub) => ({
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
