const prisma = require('./prismaClient');

// CREATE time entry
module.exports.create = function (userId, taskId, minutes, date, note) {
  const dateOnly = typeof date === 'string' ? new Date(date) : date;
  dateOnly.setHours(0, 0, 0, 0);
  return prisma.timeEntry.create({
    data: {
      userId: Number(userId),
      taskId: Number(taskId),
      minutes: Number(minutes),
      date: dateOnly,
      note: note || null,
    },
    include: { task: true },
  });
};

// GET all time entries for user (optional: taskId, from, to)
module.exports.getAll = function (userId, options) {
  const where = { userId: Number(userId) };
  if (options && options.taskId) where.taskId = Number(options.taskId);
  if (options && (options.from || options.to)) {
    where.date = {};
    if (options.from) where.date.gte = new Date(options.from);
    if (options.to) {
      const to = new Date(options.to);
      to.setHours(23, 59, 59, 999);
      where.date.lte = to;
    }
  }
  return prisma.timeEntry.findMany({
    where,
    include: { task: true },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
};

// GET single time entry by id
module.exports.getById = function (id, userId) {
  return prisma.timeEntry.findFirst({
    where: { id: Number(id), userId: Number(userId) },
    include: { task: true },
  });
};

// UPDATE time entry
module.exports.update = function (id, userId, data) {
  const updateData = {};
  if (data.minutes != null) updateData.minutes = Number(data.minutes);
  if (data.date != null) {
    const d = new Date(data.date);
    d.setHours(0, 0, 0, 0);
    updateData.date = d;
  }
  if (data.note !== undefined) updateData.note = data.note || null;
  return prisma.timeEntry.updateMany({
    where: { id: Number(id), userId: Number(userId) },
    data: updateData,
  });
};

// DELETE time entry
module.exports.delete = function (id, userId) {
  return prisma.timeEntry.deleteMany({
    where: { id: Number(id), userId: Number(userId) },
  });
};
