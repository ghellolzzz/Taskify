// src/models/Habit.model.js
const prisma = require('./prismaClient');

/** Start of day helper (UTC) */
function startOfDay(date) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
}

/** Add days helper (keeps at midnight UTC) */
function addDays(date, offset) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}
function nextDateTimeFromHHmm(hhmm) {
  const [h, m] = (hhmm || "09:00").split(":").map(Number);
  const now = new Date();
  const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (dt <= now) dt.setDate(dt.getDate() + 1);
  return dt;
}


/** ISO week start (Monday) for a given date */
function getMonday(d) {
  const date = startOfDay(d);
  const day = date.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? -6 : 1 - day); // move back to Monday
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

/**
 * Build the "Habits Board" for the current user
 */
// src/models/Habit.model.js

async function getHabitsBoard(userId) {
  const numericId = Number(userId);

  const now = new Date();
  const todayStart = startOfDay(now);

  // Week is always Mon–Sun containing "today"
  const weekStart = getMonday(todayStart);
  const weekEnd = addDays(weekStart, 7); // exclusive

  const [activeHabits, archivedHabits, logs] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: numericId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.habit.findMany({
      where: { userId: numericId, isArchived: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.habitLog.findMany({
      where: {
        habit: { userId: numericId },
        date: { gte: weekStart, lt: weekEnd },
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

  // Index logs by "habitId-YYYY-MM-DD"
  const logsByKey = new Map();
  logs.forEach((log) => {
    const key = `${log.habitId}-${log.date.toISOString().slice(0, 10)}`;
    logsByKey.set(key, log);
  });

  const todayKey = todayStart.toISOString().slice(0, 10);

  const activeHabitsCount = activeHabits.length;
  const totalHabitsCount = activeHabitsCount + archivedHabits.length;

  let todayCompleted = 0;
  const todayTotal = activeHabitsCount;

  let totalCompletedChecksThisWeek = 0;
  const totalPossibleChecksThisWeek = activeHabitsCount * 7;

  let longestStreakHabit = null;

  const habitDtos = activeHabits.map((h) => {
    // Compute streak: walk backwards from today until a missing day
    let streak = 0;
    for (let i = 0; ; i++) {
      const d = addDays(todayStart, -i);
      const dateKey = d.toISOString().slice(0, 10);
      const key = `${h.id}-${dateKey}`;
      const hasLog = logsByKey.has(key);

      if (hasLog) streak++;
      else break;
    }

    if (!longestStreakHabit || streak > longestStreakHabit.streak) {
      longestStreakHabit = {
        habitId: h.id,
        title: h.title,
        streak,
      };
    }

    const week = weekDays.map((day) => {
      const key = `${h.id}-${day.date}`;
      const hasLog = logsByKey.has(key);

      if (day.date === todayKey && hasLog) {
        todayCompleted++;
      }
      if (hasLog) totalCompletedChecksThisWeek++;

      return {
        date: day.date,
        completed: hasLog,
      };
    });

    const completionThisWeek = week.filter((d) => d.completed).length;

    return {
      id: h.id,
      title: h.title,
      color: h.color,
      targetPerWeek: h.targetPerWeek,
      createdAt: h.createdAt,
      week,
      streak,
      completionThisWeek,
      reminderEnabled: h.reminderEnabled,
reminderTime: h.reminderTime,
reminderRepeat: h.reminderRepeat,
    };
  });

  const avgWeeklyCompletion =
    totalPossibleChecksThisWeek > 0
      ? Math.round(
          (totalCompletedChecksThisWeek / totalPossibleChecksThisWeek) * 100
        )
      : 0;

  const summary = {
    totalHabits: totalHabitsCount,
    activeHabits: activeHabitsCount,
    archivedCount: archivedHabits.length,
    todayCompleted,
    todayTotal,
    avgWeeklyCompletion,
    longestStreakHabit,
  };

  return {
    week: {
      start: weekStart.toISOString(),
      days: weekDays,
    },
    habits: habitDtos,
    archivedHabits: archivedHabits.map((h) => ({
      id: h.id,
      title: h.title,
      color: h.color,
      targetPerWeek: h.targetPerWeek,
      // when isArchived flips to true, updatedAt will change
      archivedAt: h.updatedAt || h.createdAt,
    })),
    summary,
  };
}

/** Create a new habit for the user */
async function createHabit(userId, data) {
  const numericId = Number(userId);

  const created = await prisma.habit.create({
    data: {
      userId: numericId,
      title: (data.title || 'Untitled habit').trim(),
      color: data.color || null,
      targetPerWeek:
        data.targetPerWeek !== undefined && data.targetPerWeek !== ''
          ? Number(data.targetPerWeek)
          : null,

      reminderEnabled: !!data.reminderEnabled,
      reminderTime: data.reminderTime ? String(data.reminderTime).trim() : null,
      reminderRepeat: data.reminderRepeat ? String(data.reminderRepeat) : null,
    },
  });

  if (created.reminderEnabled) {
    const remindAt = nextDateTimeFromHHmm(created.reminderTime || "09:00");

    await prisma.reminder.create({
      data: {
        userId: numericId,
        habitId: created.id,
        title: `Habit: ${created.title}`,
        notes: "Auto reminder from habit",
        remindAt,
        repeatType: created.reminderRepeat || "daily",
        isDone: false,
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

  let dateStart;
  if (dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    dateStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  } else {
    const now = new Date();
    dateStart = startOfDay(now);
  }

  const existing = await prisma.habitLog.findFirst({
    where: {
      habitId: numericHabitId,
      date: dateStart,
    },
  });

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
  } else {
    await prisma.habitLog.create({
      data: {
        habitId: numericHabitId,
        date: dateStart,
        completed: true,
      },
    });
  }
}

/** Update habit metadata (title/colour/target/isArchived) */
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

if (typeof data.title === "string") payload.title = data.title.trim();
if (typeof data.color === "string") payload.color = data.color;

if (data.targetPerWeek !== undefined) {
  payload.targetPerWeek = data.targetPerWeek === "" ? null : Number(data.targetPerWeek);
}

if (data.isArchived !== undefined) {
  payload.isArchived = Boolean(data.isArchived);
}

if (data.reminderEnabled !== undefined) {
  payload.reminderEnabled = Boolean(data.reminderEnabled);
}
if (data.reminderTime !== undefined) {
  payload.reminderTime = data.reminderTime ? String(data.reminderTime).trim() : null; // "HH:mm"
}
if (data.reminderRepeat !== undefined) {
  payload.reminderRepeat = data.reminderRepeat ? String(data.reminderRepeat) : null; // daily/weekly/monthly/none
}


  const hasAnyUpdate = Object.keys(payload).length > 0;

if (hasAnyUpdate) {
  await prisma.habit.update({
    where: { id: numericHabitId },
    data: payload,
  });
}


const latest = await prisma.habit.findUnique({ where: { id: numericHabitId } });

if (latest.reminderEnabled) {
  const remindAt = nextDateTimeFromHHmm(latest.reminderTime || "09:00");

  await prisma.reminder.upsert({
    where: { habitId: numericHabitId },
    update: {
      userId: numericUserId,
      title: `Habit: ${latest.title}`,
      remindAt,
      repeatType: latest.reminderRepeat || "daily",
      isDone: false,
    },
    create: {
      userId: numericUserId,
      habitId: numericHabitId,
      title: `Habit: ${latest.title}`,
      notes: "Auto reminder from habit",
      remindAt,
      repeatType: latest.reminderRepeat || "daily",
    },
  });
} else {
  await prisma.reminder.deleteMany({ where: { habitId: numericHabitId, userId: numericUserId } });
}

}

/** Permanently delete a habit (and cascade its logs) */
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

  // HabitLog has onDelete: Cascade in schema, so logs are removed automatically
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
