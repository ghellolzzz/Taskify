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
async function getHabitsBoard(userId) {
  const numericId = Number(userId);

  const now = new Date();
  const todayStart = startOfDay(now);

  // Week is always Mon–Sun containing "today"
  const weekStart = getMonday(todayStart);
  const weekEnd = addDays(weekStart, 7); // exclusive

  const [habits, logs] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: numericId, isArchived: false },
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

  const totalHabits = habits.length;
  let todayCompleted = 0;
  const todayTotal = totalHabits;

  let totalCompletedChecksThisWeek = 0;
  const totalPossibleChecksThisWeek = totalHabits * 7;

  let longestStreakHabit = null;

  const habitDtos = habits.map((h) => {
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
    };
  });

  const avgWeeklyCompletion =
    totalPossibleChecksThisWeek > 0
      ? Math.round(
          (totalCompletedChecksThisWeek / totalPossibleChecksThisWeek) * 100
        )
      : 0;

  const summary = {
    totalHabits,
    activeHabits: totalHabits,
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
    summary,
  };
}

/** Create a new habit for the user */
async function createHabit(userId, data) {
  const numericId = Number(userId);

  await prisma.habit.create({
    data: {
      userId: numericId,
      title: (data.title || 'Untitled habit').trim(),
      color: data.color || null,
      targetPerWeek:
        data.targetPerWeek !== undefined && data.targetPerWeek !== ''
          ? Number(data.targetPerWeek)
          : null,
    },
  });
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
  if (typeof data.title === 'string') payload.title = data.title.trim();
  if (typeof data.color === 'string') payload.color = data.color;
  if (data.targetPerWeek !== undefined) {
    payload.targetPerWeek =
      data.targetPerWeek === '' ? null : Number(data.targetPerWeek);
  }
  if (data.isArchived !== undefined) {
    payload.isArchived = Boolean(data.isArchived);
  }

  if (Object.keys(payload).length === 0) return;

  await prisma.habit.update({
    where: { id: numericHabitId },
    data: payload,
  });
}

module.exports = {
  getHabitsBoard,
  createHabit,
  toggleHabitCheck,
  updateHabitMeta,
};
