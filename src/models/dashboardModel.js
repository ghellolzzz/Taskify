const prisma = require('./prismaClient');

module.exports.getCurrentUser = function(userId) {
    return prisma.user.findUnique({
        where: { id: userId }
    })
};

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