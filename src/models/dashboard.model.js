const prisma = require('./prismaClient');

module.exports.getDashboardStats = async function getDashboardStats(userId) {
  // Later change to  req.user.id
  // For now userId = 1 for testing

  const totalTasks = await prisma.task.count({
    where: { userId: userId }
  });

  const completedTasks = await prisma.task.count({
    where: { userId: userId, status: "Completed" }
  });

  const pendingTasks = await prisma.task.count({
    where: { userId: userId, status: "Pending" }
  });

  return {
    total: totalTasks,
    completed: completedTasks,
    pending: pendingTasks
  };
};
