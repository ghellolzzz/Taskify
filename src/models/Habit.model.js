// src/models/Habit.model.js
const prisma = require('./prismaClient');

/** Start of day helper (UTC) */
function startOfDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/** Add days helper (keeps at midnight UTC) */
function addDays(date, offset) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

function nextDateTimeFromHHmm(hhmm) {
  const safe = typeof hhmm === 'string' && hhmm.includes(':') ? hhmm : '09:00';
  const [h, m] = safe.split(':').map(Number);

  const now = new Date();
  const dt = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    Number.isFinite(h) ? h : 9,
    Number.isFinite(m) ? m : 0,
    0,
    0
  );

  // if time already passed today, schedule for tomorrow
  if (dt <= now) dt.setDate(dt.getDate() + 1);
  return dt;
}

/** ISO week start (Monday) for a given date */
function getMonday(d) {
  const date = startOfDay(d);
  const day = date.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // move back to Monday
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

/**
 * Build the "Habits Board" for the current user
 * Adds: per-habit target progress + onTrack status (DT)
 */
async function getHabitsBoard(userId) {
  const numericId = Number(userId);

  const now = new Date();
  const todayStart = startOfDay(now);

  // Week is always Mon–Sun containing "today"
  const weekStart = getMonday(todayStart);
  const weekEnd = addDays(weekStart, 7); // exclusive

  // Previous week (for future delta stats)
  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekEnd = weekStart;

  // For correct streaks, fetch more than just this week
  const streakWindowDays = 180;
  const streakStart = addDays(todayStart, -streakWindowDays);
  const tomorrowStart = addDays(todayStart, 1); // exclusive upper bound

  const [
    activeHabits,
    archivedHabits,
    weekLogs,
    prevWeekLogs,
    streakLogs,
  ] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: numericId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.habit.findMany({
      where: { userId: numericId, isArchived: true },
      orderBy: { createdAt: 'asc' },
    }),

    // Logs for THIS WEEK grid + weekly stats
    prisma.habitLog.findMany({
      where: {
        habit: { userId: numericId },
        date: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { date: 'asc' },
    }),

    // Logs for PREVIOUS WEEK (not shown in UI yet, but used for stats later)
    prisma.habitLog.findMany({
      where: {
        habit: { userId: numericId },
        date: { gte: prevWeekStart, lt: prevWeekEnd },
      },
      orderBy: { date: 'asc' },
    }),

    // Logs for streak calculation (history window)
    prisma.habitLog.findMany({
      where: {
        habit: { userId: numericId },
        date: { gte: streakStart, lt: tomorrowStart },
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  // Build 7 day labels
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    weekDays.push({
      date: d.toISOString().slice(0, 10), // 'YYYY-MM-DD'
      label: d.toLocaleDateString('en-SG', { weekday: 'short' }),
      isToday: d.getTime() === todayStart.getTime(),
    });
  }

  // Index WEEK logs by "habitId-YYYY-MM-DD"
  const weekLogsByKey = new Map();
  weekLogs.forEach((log) => {
    const key = `${log.habitId}-${log.date.toISOString().slice(0, 10)}`;
    weekLogsByKey.set(key, log);
  });

  // Index PREV WEEK logs by "habitId-YYYY-MM-DD"
  const prevWeekLogsByKey = new Map();
  prevWeekLogs.forEach((log) => {
    const key = `${log.habitId}-${log.date.toISOString().slice(0, 10)}`;
    prevWeekLogsByKey.set(key, log);
  });

  // Index STREAK logs by "habitId-YYYY-MM-DD"
  const streakLogsByKey = new Map();
  streakLogs.forEach((log) => {
    const key = `${log.habitId}-${log.date.toISOString().slice(0, 10)}`;
    streakLogsByKey.set(key, log);
  });

  const todayKey = todayStart.toISOString().slice(0, 10);

  const activeHabitsCount = activeHabits.length;
  const totalHabitsCount = activeHabitsCount + archivedHabits.length;

  let todayCompleted = 0;
  const todayTotal = activeHabitsCount;

  // For overall weekly %
  let totalCompletedChecksThisWeek = 0;
  const totalPossibleChecksThisWeek = activeHabitsCount * 7;

  // For prev week %
  let totalCompletedChecksPrevWeek = 0;
  const totalPossibleChecksPrevWeek = activeHabitsCount * 7;

  let longestStreakHabit = null;

  // Helper: day index (Mon=0 ... Sun=6) for "expected by today"
  const dayIndex = Math.max(
    0,
    Math.min(
      6,
      Math.floor((todayStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
    )
  );
  const daysElapsedInWeek = dayIndex + 1; // inclusive (today counts)

  const habitDtos = activeHabits.map((h) => {
    // ✅ Correct streak: uses streakLogsByKey (history)
    let streak = 0;
    for (let i = 0; ; i++) {
      const d = addDays(todayStart, -i);
      const dateKey = d.toISOString().slice(0, 10);
      const key = `${h.id}-${dateKey}`;
      const hasLog = streakLogsByKey.has(key);

      if (hasLog) streak++;
      else break;

      if (i > streakWindowDays) break; // safety stop
    }

    if (!longestStreakHabit || streak > longestStreakHabit.streak) {
      longestStreakHabit = {
        habitId: h.id,
        title: h.title,
        streak,
      };
    }

    // Week grid + week totals
    const week = weekDays.map((day) => {
      const key = `${h.id}-${day.date}`;
      const hasLog = weekLogsByKey.has(key);

      if (day.date === todayKey && hasLog) todayCompleted++;
      if (hasLog) totalCompletedChecksThisWeek++;

      return { date: day.date, completed: hasLog };
    });

    const completionThisWeek = week.filter((d) => d.completed).length;

    // Prev week completion count (same habit)
    let completionPrevWeek = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(prevWeekStart, i);
      const k = `${h.id}-${d.toISOString().slice(0, 10)}`;
      if (prevWeekLogsByKey.has(k)) completionPrevWeek++;
    }
    totalCompletedChecksPrevWeek += completionPrevWeek;

    // ---------- NEW: Target progress + On-track ----------
    const target = Number.isFinite(h.targetPerWeek) && h.targetPerWeek > 0
      ? Math.min(7, Math.max(1, h.targetPerWeek))
      : null;

    const done = completionThisWeek;

    // If no target: treat as flexible, show progress but badge is "Flexible"
    let progressPct = 0;
    if (target) progressPct = Math.round((done / target) * 100);
    progressPct = Math.max(0, Math.min(100, progressPct));

    // Expected by today (only if target exists)
    // Example: target=5, Wed (dayIndex=2 -> daysElapsed=3)
    // expected = ceil(5 * 3 / 7) = 3
    let expectedByToday = null;
    if (target) {
      expectedByToday = Math.ceil((target * daysElapsedInWeek) / 7);
    }

    let onTrack = {
      status: 'flex',        // flex | ontrack | atrisk | behind | completed
      label: 'Flexible',
      hint: 'No fixed weekly target set.',
      riskScore: 0,          // used later for sorting
    };

    if (target) {
      const remaining = Math.max(0, target - done);
      const gap = Math.max(0, (expectedByToday || 0) - done); // how many behind schedule

      // riskScore: heavier penalty if further behind schedule
      const riskScore = gap * 10 + remaining;

      if (done >= target) {
        onTrack = {
          status: 'completed',
          label: 'Target hit',
          hint: `Completed ${done}/${target} this week.`,
          riskScore: 0,
        };
      } else if (gap === 0) {
        onTrack = {
          status: 'ontrack',
          label: 'On track',
          hint: `Completed ${done}/${target} this week.`,
          riskScore,
        };
      } else if (gap === 1) {
        onTrack = {
          status: 'behind',
          label: 'Slightly behind',
          hint: `Try 1 more check-in to catch up.`,
          riskScore,
        };
      } else {
        onTrack = {
          status: 'atrisk',
          label: 'At risk',
          hint: `You’re behind pace by ${gap}.`,
          riskScore,
        };
      }
    }

    return {
      id: h.id,
      title: h.title,
      color: h.color,
      targetPerWeek: h.targetPerWeek,
      createdAt: h.createdAt,

      week,
      streak,
      completionThisWeek,

      // ✅ NEW fields used by Habits UI
      targetProgress: {
        done,
        target,        // null = flexible
        pct: target ? progressPct : null,
        expectedByToday, // null if flexible
      },
      onTrack, // {status,label,hint,riskScore}

      reminderEnabled: h.reminderEnabled,
      reminderTime: h.reminderTime,
      reminderRepeat: h.reminderRepeat,
    };
  });

  const avgWeeklyCompletion =
    totalPossibleChecksThisWeek > 0
      ? Math.round((totalCompletedChecksThisWeek / totalPossibleChecksThisWeek) * 100)
      : 0;

  const prevWeekCompletionPct =
    totalPossibleChecksPrevWeek > 0
      ? Math.round((totalCompletedChecksPrevWeek / totalPossibleChecksPrevWeek) * 100)
      : 0;

  const summary = {
    totalHabits: totalHabitsCount,
    activeHabits: activeHabitsCount,
    archivedCount: archivedHabits.length,
    todayCompleted,
    todayTotal,
    avgWeeklyCompletion,
    prevWeekCompletionPct, // used later for delta card
    longestStreakHabit,
  };

  return {
    week: { start: weekStart.toISOString(), days: weekDays },
    habits: habitDtos,
    archivedHabits: archivedHabits.map((h) => ({
      id: h.id,
      title: h.title,
      color: h.color,
      targetPerWeek: h.targetPerWeek,
      archivedAt: h.createdAt,
    })),
    summary,
  };
}


/** Create a new habit for the user */
async function createHabit(userId, data) {
  const numericId = Number(userId);

  const reminderEnabled = !!data.reminderEnabled;
  const reminderTime = reminderEnabled
    ? String(data.reminderTime || '09:00').trim()
    : null;

  // Habit.reminderRepeat is NOT NULL in schema, so never write null
  const reminderRepeat = reminderEnabled
    ? String(data.reminderRepeat || 'daily')
    : 'daily';

  const created = await prisma.habit.create({
    data: {
      userId: numericId,
      title: (data.title || 'Untitled habit').trim(),
      color: data.color || null,
      targetPerWeek:
        data.targetPerWeek !== undefined && data.targetPerWeek !== ''
          ? Number(data.targetPerWeek)
          : null,

      reminderEnabled,
      reminderTime,
      reminderRepeat,
    },
  });

  // Create linked reminder row (delete first not needed for new habit)
  if (created.reminderEnabled) {
    const remindAt = nextDateTimeFromHHmm(created.reminderTime || '09:00');

    await prisma.reminder.create({
      data: {
        userId: numericId,
        habitId: created.id,
        title: `Habit: ${created.title}`,
        notes: 'Auto reminder from habit',
        remindAt,
        repeatType: created.reminderRepeat || 'daily',
        isDone: false,

        // optional consistency fields (won't break if unused)
        sourceType: 'habit',
        sourceDate: null,
      },
    });
  }
}

/** Toggle completion for a given habit on a given date */
async function toggleHabitCheck(userId, habitId, dateStr) {
  const numericUserId = Number(userId);
  const numericHabitId = Number(habitId);

  const habit = await prisma.habit.findFirst({
    where: { id: numericHabitId, userId: numericUserId, isArchived: false },
  });

  if (!habit) {
    const err = new Error('Habit not found');
    err.status = 404;
    throw err;
  }

  // Always normalize to UTC day start (matches @db.Date expectation)
  let dateStart;
  if (dateStr) {
    const [year, month, day] = String(dateStr).split('-').map(Number);
    dateStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  } else {
    dateStart = startOfDay(new Date());
  }
  const todayStart = startOfDay(new Date());
if (dateStart > todayStart) {
  const err = new Error('Cannot toggle future dates.');
  err.status = 400;
  throw err;
}


  // Use composite unique key: @@unique([habitId, date])
  const whereUnique = {
    habitId_date: {
      habitId: numericHabitId,
      date: dateStart,
    },
  };

  const existing = await prisma.habitLog.findUnique({ where: whereUnique });

  if (existing) {
    await prisma.habitLog.delete({ where: whereUnique });
  } else {
    await prisma.habitLog.create({
      data: { habitId: numericHabitId, date: dateStart, completed: true },
    });
  }
}

/** Update habit metadata (title/colour/target/isArchived + reminder fields) */
async function updateHabitMeta(userId, habitId, data) {
  const numericUserId = Number(userId);
  const numericHabitId = Number(habitId);

  const existing = await prisma.habit.findFirst({
    where: { id: numericHabitId, userId: numericUserId },
  });

  if (!existing) {
    const err = new Error('Habit not found');
    err.status = 404;
    throw err;
  }

  const payload = {};

  if (typeof data.title === 'string') payload.title = data.title.trim();
  if (typeof data.color === 'string') payload.color = data.color;

  if (data.targetPerWeek !== undefined) {
    payload.targetPerWeek = data.targetPerWeek === '' ? null : Number(data.targetPerWeek);
  }

  if (data.isArchived !== undefined) {
    payload.isArchived = Boolean(data.isArchived);

    // ✅ archiving should disable reminders too
    if (payload.isArchived === true) {
      payload.reminderEnabled = false;
      payload.reminderTime = null;
      payload.reminderRepeat = existing.reminderRepeat || 'daily';
    }
  }

  // Reminder fields
  if (data.reminderEnabled !== undefined) {
    payload.reminderEnabled = Boolean(data.reminderEnabled);
  }
  if (data.reminderTime !== undefined) {
    payload.reminderTime = data.reminderTime ? String(data.reminderTime).trim() : null;
  }
  if (data.reminderRepeat !== undefined) {
    // Habit.reminderRepeat is NOT NULL -> never set null
    payload.reminderRepeat = data.reminderRepeat
      ? String(data.reminderRepeat)
      : 'daily';
  }

  const hasAnyUpdate = Object.keys(payload).length > 0;

  if (hasAnyUpdate) {
    await prisma.habit.update({
      where: { id: numericHabitId },
      data: payload,
    });
  }

  const latest = await prisma.habit.findUnique({
    where: { id: numericHabitId },
  });

  // ✅ IMPORTANT: Reminder model does NOT have unique habitId, so upsert(where: {habitId}) crashes.
  // We delete/create to ensure only one reminder exists per habit.
  await prisma.reminder.deleteMany({
    where: { userId: numericUserId, habitId: numericHabitId },
  });

  if (latest && latest.reminderEnabled && !latest.isArchived) {
    const remindAt = nextDateTimeFromHHmm(latest.reminderTime || '09:00');

    await prisma.reminder.create({
      data: {
        userId: numericUserId,
        habitId: numericHabitId,
        title: `Habit: ${latest.title}`,
        notes: 'Auto reminder from habit',
        remindAt,
        repeatType: latest.reminderRepeat || 'daily',
        isDone: false,
        sourceType: 'habit',
        sourceDate: null,
      },
    });
  }
}

/** Permanently delete a habit (and cleanup reminders) */
async function deleteHabit(userId, habitId) {
  const numericUserId = Number(userId);
  const numericHabitId = Number(habitId);

  const existing = await prisma.habit.findFirst({
    where: { id: numericHabitId, userId: numericUserId },
  });

  if (!existing) {
    const err = new Error('Habit not found');
    err.status = 404;
    throw err;
  }

  await prisma.reminder.deleteMany({
    where: { userId: numericUserId, habitId: numericHabitId },
  });

  // HabitLog has onDelete: Cascade, so logs removed automatically
  await prisma.habit.delete({
    where: { id: numericHabitId },
  });
}

module.exports = {
  getHabitsBoard,
  createHabit,
  toggleHabitCheck,
  updateHabitMeta,
  deleteHabit,
};
