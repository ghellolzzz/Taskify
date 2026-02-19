// src/models/Friends.model.js
const prisma = require('./prismaClient');

function viewFriendshipRow(row, myUserId) {
  const iAmRequester = row.requesterId === myUserId;
  const other = iAmRequester ? row.addressee : row.requester;

  return {
    id: row.id,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    otherUser: other
      ? {
          id: other.id,
          name: other.name,
          email: other.email,
          avatarUrl: other.avatarUrl,
        }
      : null,
    direction: iAmRequester ? 'OUTGOING' : 'INCOMING',
  };
}

async function getAllForUser(userId) {
  const rows = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, email: true, avatarUrl: true } },
      addressee: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const mapped = rows.map(r => viewFriendshipRow(r, userId));

  return {
  incoming: mapped.filter(x => x.status === 'PENDING' && x.direction === 'INCOMING'),
  outgoing: mapped.filter(x => x.status === 'PENDING' && x.direction === 'OUTGOING'),
  friends: mapped.filter(x => x.status === 'ACCEPTED'),
  removed: mapped.filter(x => x.status === 'REMOVED'),
};
}

async function findUserByEmailInsensitive(email) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
}

async function findAnyRelationship(a, b) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

async function createRequest(requesterId, addresseeId) {
  return prisma.friendship.upsert({
    where: {
      requesterId_addresseeId: { requesterId, addresseeId },
    },
    update: {
      status: 'PENDING',
    },
    create: { requesterId, addresseeId, status: 'PENDING' },
  });
}


async function updateStatus(id, status) {
  return prisma.friendship.update({
    where: { id },
    data: { status },
  });
}

async function getById(id) {
  return prisma.friendship.findUnique({ where: { id } });
}

module.exports = {
  getAllForUser,
  findUserByEmailInsensitive,
  findAnyRelationship,
  createRequest,
  updateStatus,
  getById,
};
