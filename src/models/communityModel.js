const prisma = require('./prismaClient');

// CREATE a new note
module.exports.create = function (userId, content, color) {
  return prisma.communityNote.create({
    data: {
      userId,
      content,
      color: color || "yellow"
    },
    include: {
      user: { select: { name: true } }
    }
  });
};

// GET all notes with reaction counts
module.exports.getAll = function () {
  return prisma.communityNote.findMany({
    include: {
      user: { select: { name: true } },
      reactions: { // Added this so the frontend knows WHO liked WHAT
        select: { userId: true } 
      },
      _count: {
        select: { reactions: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

// TOGGLE a reaction (Option B: One per user/type)
module.exports.toggleReaction = async function (userId, noteId, type) {
  const existing = await prisma.noteReaction.findUnique({
    where: {
      userId_noteId_type: {
        userId,
        noteId: Number(noteId),
        type
      }
    }
  });

  if (existing) {
    // If it exists, remove it (unlike)
    return prisma.noteReaction.delete({
      where: { id: existing.id }
    });
  }

  // Otherwise, create it
  return prisma.noteReaction.create({
    data: {
      userId,
      noteId: Number(noteId),
      type
    }
  });
};

// UPDATE a note (only if it belongs to the user)
module.exports.update = function (id, userId, content, color) {
  return prisma.communityNote.updateMany({
    where: { id: Number(id), userId: userId },
    data: { content, color }
  });
};

// DELETE a note (only if it belongs to the user)
module.exports.delete = function (id, userId) {
  return prisma.communityNote.deleteMany({
    where: { id: Number(id), userId: userId }
  });
};