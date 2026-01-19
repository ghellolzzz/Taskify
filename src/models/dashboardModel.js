const prisma = require('./prismaClient');

module.exports.getCurrentUser = function(userId) {
    return prisma.user.findUnique({
        where: { id: userId }
    })
};

module.exports.getTasksDueToday = function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return prisma.task.count({
    where: {
      userId,
      status: { not: "Completed" },
      dueDate: {
        gte: today,
        lt: tomorrow
      }
    }
  });
};
// GET today reminder
module.exports.getTodayList = function (userId, start, end) {
  return prisma.reminder.findMany({
    where: {
      userId,
      remindAt: { gte: start, lt: end }
    },
    orderBy: { remindAt: "asc" }
  });
};
// GET upcoming reminder
module.exports.getUpcoming = function (userId, todayEnd) {
  const upcomingEnd = new Date(todayEnd);
  upcomingEnd.setDate(upcomingEnd.getDate() + 3); // next 3 days

  return prisma.reminder.findMany({
    where: {
      userId,
      remindAt: { gte: todayEnd, lt: upcomingEnd },
      isDone: false
    },
    orderBy: { remindAt: "asc" }
  });
};
module.exports.getDashboardStats = async function (userId) {
  // Run all count queries in parallel
  const [total, completed, pending, inProgress] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: "Completed" } }),
    prisma.task.count({ where: { userId, status: "Pending" } }),
    prisma.task.count({ where: { userId, status: "In Progress" } }),
  ]);

  // --------------------------------------
  // Productivity Trend (last 7 days)
  // --------------------------------------
  const today = new Date();
  today.setHours(0,0,0,0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 6);

  let days = [];
  let values = [];

  for (let i = 0; i < 7; i++) {
    let dayStart = new Date(startDate);
    dayStart.setDate(startDate.getDate() + i);
    dayStart.setHours(0,0,0,0);

    let dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const count = await prisma.task.count({
      where: {
        userId,
        status: "Completed",
        completedAt: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    });

    days.push(dayStart.toLocaleDateString('en-US', { weekday: 'short' }));
    values.push(count);
  }

  return {
    total,
    completed,
    pending,
    inProgress,
    productivity: {
      days,
      values
    }
  };
};
