// src/models/Share.model.js
const prisma = require('./prismaClient');
const crypto = require('crypto');

function startOfUTCDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUTCDays(d, days) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function dayKeyUTC(d) {
  return d.toISOString().slice(0, 10);
}

function computeExpiresAt(expiry) {
  const now = new Date();
  if (expiry === '1d') return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (expiry === '7d') return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return null; // "never"
}

async function createHabitShareLink(ownerId, visibility, expiry) {
  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAt = computeExpiresAt(expiry);

  return prisma.habitShareLink.create({
    data: { token, ownerId, visibility, expiresAt },
  });
}

async function getLinkByToken(token) {
  return prisma.habitShareLink.findUnique({
    where: { token },
    select: { token: true, ownerId: true, visibility: true, expiresAt: true, createdAt: true },
  });
}

async function isFriends(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;

  const row = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });

  return !!row;
}

/**
 * Phenomenal data transformation:
 * - windows: 7d + 30d
 * - Prisma aggregate + groupBy (daily + per-habit)
 * - streaks (current + best) computed from raw logs (custom transforms)
 * - weekly totals + trend delta
 */
async function buildHabitsShareCard(ownerId, windows = [7, 30]) {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { id: true, name: true, avatarUrl: true },
  });

  const habits = await prisma.habit.findMany({
    where: { userId: ownerId, isArchived: false },
    select: { id: true, title: true, color: true, targetPerWeek: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const habitIds = habits.map(h => h.id);

  async function buildWindow(rangeDays) {
    const end = startOfUTCDay(new Date());           // today UTC (date)
    const start = addUTCDays(end, -(rangeDays - 1)); // inclusive

    if (!habitIds.length) {
      return {
        range: { start: dayKeyUTC(start), end: dayKeyUTC(end), days: rangeDays },
        totals: { habitsCount: 0, totalCompletions: 0, avgDailyRate: 0 },
        daily: Array.from({ length: rangeDays }, (_, i) => {
          const d = addUTCDays(start, i);
          return { date: dayKeyUTC(d), completedCount: 0, totalHabits: 0, completionRate: 0 };
        }),
        perHabit: [],
        topHabits: [],
        weekly: [],
        trend: { last7Avg: null, prev7Avg: null, delta: null },
      };
    }

    // 1) Prisma aggregate = total completions
    const totalAgg = await prisma.habitLog.aggregate({
      where: {
        habitId: { in: habitIds },
        completed: true,
        date: { gte: start, lte: end },
      },
      _count: { _all: true },
    });

    // 2) Prisma groupBy per habit = completed days per habit in window
    const perHabitCounts = await prisma.habitLog.groupBy({
      by: ['habitId'],
      where: {
        habitId: { in: habitIds },
        completed: true,
        date: { gte: start, lte: end },
      },
      _count: { _all: true },
    });

    const completedDaysByHabit = new Map(
      perHabitCounts.map(r => [r.habitId, r._count._all])
    );

    // 3) Prisma groupBy by date = daily totals
    const perDayCounts = await prisma.habitLog.groupBy({
      by: ['date'],
      where: {
        habitId: { in: habitIds },
        completed: true,
        date: { gte: start, lte: end },
      },
      _count: { _all: true },
      orderBy: { date: 'asc' },
    });

    const completedCountByDay = new Map(
      perDayCounts.map(r => [dayKeyUTC(r.date), r._count._all])
    );

    // 4) Raw logs for streak transform (custom)
    const logs = await prisma.habitLog.findMany({
      where: {
        habitId: { in: habitIds },
        completed: true,
        date: { gte: start, lte: end },
      },
      select: { habitId: true, date: true },
      orderBy: { date: 'asc' },
    });

    const dateSetByHabit = new Map(); // habitId -> Set(dayKey)
    for (const l of logs) {
      const dk = dayKeyUTC(l.date);
      if (!dateSetByHabit.has(l.habitId)) dateSetByHabit.set(l.habitId, new Set());
      dateSetByHabit.get(l.habitId).add(dk);
    }

    function bestStreakFromKeys(keysSorted) {
      let best = 0, cur = 0;
      let prev = null;
      for (const k of keysSorted) {
        if (!prev) { cur = 1; best = Math.max(best, cur); prev = k; continue; }
        const prevD = new Date(prev + 'T00:00:00.000Z');
        const next = addUTCDays(prevD, 1);
        const nextKey = dayKeyUTC(next);

        if (k === nextKey) cur += 1;
        else cur = 1;

        best = Math.max(best, cur);
        prev = k;
      }
      return best;
    }

    function currentStreakFromSet(set, endKey) {
      let streak = 0;
      let d = new Date(endKey + 'T00:00:00.000Z');
      while (set.has(dayKeyUTC(d))) {
        streak += 1;
        d = addUTCDays(d, -1);
      }
      return streak;
    }

    // Daily breakdown (always rangeDays entries)
    const daily = [];
    for (let i = 0; i < rangeDays; i++) {
      const d = addUTCDays(start, i);
      const dk = dayKeyUTC(d);
      const done = completedCountByDay.get(dk) || 0;

      daily.push({
        date: dk,
        completedCount: done,
        totalHabits: habits.length,
        completionRate: habits.length ? Math.round((done / habits.length) * 100) : 0,
      });
    }

    // Per-habit transform
    const endKey = dayKeyUTC(end);

    const perHabit = habits.map(h => {
      const completedDays = completedDaysByHabit.get(h.id) || 0;
      const completionRate = rangeDays ? Math.round((completedDays / rangeDays) * 100) : 0;

      const set = dateSetByHabit.get(h.id) || new Set();
      const keysSorted = [...set].sort(); // YYYY-MM-DD sorts lexicographically

      const bestStreak = bestStreakFromKeys(keysSorted);
      const currentStreak = currentStreakFromSet(set, endKey);

      // “Consistency score” (custom transform, simple + explainable)
      const consistencyScore = Math.round(
        completionRate * 0.7 + Math.min(currentStreak * 5, 30)
      );

      return {
        id: h.id,
        title: h.title,
        color: h.color,
        targetPerWeek: h.targetPerWeek,
        completedDays,
        completionRate,
        currentStreak,
        bestStreak,
        consistencyScore,
      };
    });

    const totalCompletions = totalAgg?._count?._all || 0;

    // Top 3 habits by consistency (rate + streak tie-break)
    const topHabits = [...perHabit]
      .sort((a, b) =>
        (b.completionRate - a.completionRate) ||
        (b.currentStreak - a.currentStreak) ||
        (b.bestStreak - a.bestStreak) ||
        (b.completedDays - a.completedDays)
      )
      .slice(0, 3);

    // Weekly totals (bucket daily into 7-day chunks)
    const weekly = [];
    for (let i = 0; i < daily.length; i += 7) {
      const chunk = daily.slice(i, i + 7);
      const chunkStart = chunk[0]?.date;
      const chunkEnd = chunk[chunk.length - 1]?.date;
      const chunkTotal = chunk.reduce((s, x) => s + (x.completedCount || 0), 0);

      const possible = (habits.length * chunk.length) || 0;
      const completionRate = possible ? Math.round((chunkTotal / possible) * 100) : 0;

      weekly.push({
        label: `Week ${Math.floor(i / 7) + 1}`,
        start: chunkStart,
        end: chunkEnd,
        totalCompletions: chunkTotal,
        completionRate,
      });
    }

    // Trend: last 7 avg vs previous 7 avg (only meaningful if >= 14 days)
    let trend = { last7Avg: null, prev7Avg: null, delta: null };
    if (daily.length >= 14) {
      const last7 = daily.slice(-7);
      const prev7 = daily.slice(-14, -7);

      const avg = (arr) => Math.round(arr.reduce((s, x) => s + x.completionRate, 0) / arr.length);
      const last7Avg = avg(last7);
      const prev7Avg = avg(prev7);

      trend = { last7Avg, prev7Avg, delta: last7Avg - prev7Avg };
    }

    return {
      range: { start: dayKeyUTC(start), end: dayKeyUTC(end), days: rangeDays },
      totals: {
        habitsCount: habits.length,
        totalCompletions,
        avgDailyRate: daily.length
          ? Math.round(daily.reduce((s, x) => s + x.completionRate, 0) / daily.length)
          : 0,
      },
      daily,
      perHabit,
      topHabits,
      weekly,
      trend,
    };
  }

  const results = await Promise.all(
    windows.map(async (d) => [d, await buildWindow(d)])
  );

  const windowsObj = {};
  for (const [d, win] of results) {
    windowsObj[d === 7 ? 'd7' : `d${d}`] = win;
  }

  return {
    owner,
    generatedAt: new Date().toISOString(),
    windows: windowsObj,
  };
}

async function sendHabitShareLink(ownerId, token, recipientIds, messageRaw) {
  const link = await prisma.habitShareLink.findUnique({
    where: { token },
    select: { id: true, ownerId: true },
  });

  if (!link) return { error: 'NOT_FOUND' };
  if (link.ownerId !== ownerId) return { error: 'FORBIDDEN' };

  // --- Data transformation: sanitize + dedupe + remove self ---
  const unique = [...new Set((recipientIds || []).map(Number))]
    .filter((x) => Number.isFinite(x) && x > 0 && x !== ownerId);

  if (!unique.length) return { error: 'NO_RECIPIENTS' };

  const message = (messageRaw ? String(messageRaw).trim() : '').slice(0, 500) || null;

  // Verify friendships (server-side trust boundary)
  const checks = await Promise.all(
    unique.map(async (rid) => ({ rid, ok: await isFriends(ownerId, rid) }))
  );

  const allowed = checks.filter(x => x.ok).map(x => x.rid);
  const rejected = checks.filter(x => !x.ok).map(x => x.rid);

  let createdCount = 0;

  if (allowed.length) {
    const r = await prisma.habitShareDelivery.createMany({
      data: allowed.map((rid) => ({
        linkId: link.id,
        senderId: ownerId,
        recipientId: rid,
        message,
        status: 'SENT',
      })),
      skipDuplicates: true,
    });
    createdCount = r.count || 0;
  }

  return { sent: allowed, rejected, createdCount };
}


module.exports = {
  createHabitShareLink,
  getLinkByToken,
  isFriends,
  buildHabitsShareCard,
  sendHabitShareLink, 
};
