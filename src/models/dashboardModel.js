const prisma = require('./prismaClient');

module.exports.getDashboardStats = function (userId) {
  return Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: "Completed" } }),
    prisma.task.count({ where: { userId, status: "Pending" } }),
    prisma.task.count({ where: { userId, status: "In Progress" } }),
  ])
  .then(([total, completed, pending, inProgress]) => {
    return {
      total,
      completed,
      pending,
      inProgress
    };
  });
};