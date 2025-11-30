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
      dueDate: {
        gte: today,
        lt: tomorrow
      }
    }
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

  // // ------------------------------
  // // Productivity Trend (last 7 days)
  // // ------------------------------

  // // Get today - 6 days (7-day window)
  // const startDate = new Date();
  // startDate.setDate(startDate.getDate() - 6);
  // startDate.setHours(0, 0, 0, 0);

  // // Query number of completed tasks grouped by day
  // const trendData = await prisma.task.groupBy({
  //   by: ['completedAt'],
  //   where: {
  //     userId,
  //     status: "Completed",
  //     completedAt: {
  //       gte: startDate
  //     }
  //   },
  //   _count: {
  //     id: true
  //   }
  // });

  // // Format last 7 days into arrays
  // let days = [];
  // let values = [];

  // for (let i = 0; i < 7; i++) {
  //   let d = new Date(startDate);
  //   d.setDate(startDate.getDate() + i);

  //   let dateKey = d.toISOString().substring(0, 10); // "2025-01-15"

  //   // Find if this date exists in trendData
  //   const match = trendData.find(t =>
  //     t.completedAt.toISOString().substring(0, 10) === dateKey
  //   );

  //   days.push(d.toLocaleDateString('en-US', { weekday: 'short' })); // "Mon","Tue"
  //   values.push(match ? match._count.id : 0);
  // }

    // --------------------------------------
  // TEMP FAKE PRODUCTIVITY DATA (safe)
  // --------------------------------------
  const fakeDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const fakeValues = [1, 3, 2, 0, 4, 1, 2];

  return {
    total,
    completed,
    pending,
    inProgress,
    productivity: {
      days: fakeDays,
      values: fakeValues
    }
  };
};
