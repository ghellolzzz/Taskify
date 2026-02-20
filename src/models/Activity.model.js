// src/models/Activity.model.js
const prisma = require('./prismaClient');

function toItemFromDelivery(row) {
  const isExpired = !!(row.link?.expiresAt && new Date() > row.link.expiresAt);

  return {
    id: row.id,
    type: 'HABIT_SHARE',
    status: row.status, // 'SENT' | 'READ' | 'DISMISSED' | ...
    isRead: row.status !== 'SENT',
    isExpired,
    createdAt: row.createdAt,
    message: row.message || null,

    sender: row.sender
      ? {
          id: row.sender.id,
          name: row.sender.name,
          email: row.sender.email,
          avatarUrl: row.sender.avatarUrl,
        }
      : null,

    link: row.link
      ? {
          token: row.link.token,
          visibility: row.link.visibility,
          expiresAt: row.link.expiresAt,
          path: `/share/habits/${row.link.token}`,
        }
      : null,
  };
}

async function getInboxForUser(userId, { limit = 20, unreadOnly = false, type = null, includeDismissed = false } = {}) {
  const now = new Date();

const where = {
  recipientId: userId,
};

if (!includeDismissed) {
  where.NOT = { status: 'DISMISSED' };
}


  // currently only one type exists; keep param for future expansion
  if (type && type !== 'HABIT_SHARE') {
    return { items: [], counts: { unread: 0 } };
  }

  if (unreadOnly) where.status = 'SENT';

  const rows = await prisma.habitShareDelivery.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
      link: { select: { token: true, visibility: true, expiresAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(Number(limit) || 20, 50)),
  });

  // unread badge count (exclude expired so badge doesn’t get stuck)
  const unread = await prisma.habitShareDelivery.count({
    where: {
      recipientId: userId,
      status: 'SENT',
      link: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    },
  });

  return {
    items: rows.map(toItemFromDelivery),
    counts: { unread },
  };
}

async function updateHabitShareStatus(userId, deliveryId, status) {
  const id = Number(deliveryId);
  if (!Number.isFinite(id)) return { ok: false, error: 'BAD_ID' };

  const r = await prisma.habitShareDelivery.updateMany({
    where: { id, recipientId: userId },
    data: { status },
  });

  if (!r.count) return { ok: false, error: 'NOT_FOUND' };
  return { ok: true };
}

module.exports = {
  getInboxForUser,
  updateHabitShareStatus,
};
