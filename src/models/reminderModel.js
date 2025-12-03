const prisma = require('./prismaClient');

// CREATE Reminder
module.exports.create = function (userId, title, notes, remindAt, taskId, repeatType) {
  return prisma.reminder.create({
    data: {
      userId,
      title,
      notes,
      remindAt: new Date(remindAt),     // FIXED
      taskId: taskId ? Number(taskId) : null, // FIXED
      repeatType: repeatType || "none"  // matches schema
    }
  });
};


// GET all reminder
module.exports.getAll = function (userId) {
  return prisma.reminder.findMany({
    where: { userId },
    include: { task: true }, 
    orderBy: { remindAt: "asc" }
  });
};
// GET single reminder
module.exports.getById = function (id, userId) {
  return prisma.reminder.findFirst({
    where: { id, userId },
    include: { task: true }
  });
};

// GET today reminder
module.exports.getStats = async function (userId, now, todayStart, todayEnd) {
 return await Promise.all([
      prisma.reminder.count({ where: {userId,remindAt: { gte: todayStart, lt: todayEnd }}}),
      prisma.reminder.count({where: {userId,remindAt: { gt: todayEnd },isDone: false}}),
      prisma.reminder.count({where: {userId,remindAt: { lt: now },isDone: false}}),
      prisma.reminder.count({where: {userId,isDone: true}})
 ]);
};

// UPDATE 
module.exports.update = function (id, userId, data) {
  return prisma.reminder.updateMany({
    where: { id, userId },
    data: {
      title: data.title,
      notes: data.notes,
      remindAt: new Date(data.remindAt),
      taskId: data.taskId || null,
      repeatType: data.repeatType
    }
  });
};

// Shift date based on repeat type
function getNextDate(reminder) {
  const current = new Date(reminder.remindAt);

  switch (reminder.repeatType) {
    case "daily":
      current.setDate(current.getDate() + 1);
      break;

    case "weekly":
      current.setDate(current.getDate() + 7);
      break;

    case "monthly":
      current.setMonth(current.getMonth() + 1);
      break;

    default:
      return null; // no repeat
  }

  return current;
}
// UPDATE AS DONE
module.exports.complete = async function (id, userId) {
  // Load reminder
  const reminder = await prisma.reminder.findFirst({
    where: { id, userId }
  });

  if (!reminder) return null;

  // If repeating (daily/weekly/monthly)
  const nextDate = getNextDate(reminder);

  if (nextDate) {
    // Shift reminder forward instead of marking as done
    return await prisma.reminder.update({
      where: { id },
      data: {
        remindAt: nextDate,
        isDone: false
      }
    });
  }

  // Normal reminder → mark done
  return await prisma.reminder.update({
    where: { id },
    data: { isDone: true }
  });
};
// DELETE
module.exports.delete = function (id) {
  return prisma.reminder.delete({
    where: { id }
  });
};