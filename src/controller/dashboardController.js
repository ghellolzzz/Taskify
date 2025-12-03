const dashboardModel = require("../models/dashboardModel");
const { EMPTY_RESULT_ERROR } = require('../errors');
// const fetch = require("node-fetch");

// const userId = res.locals.userId; // TEMP: use real session user later

module.exports.getUser = function (req, res) {
  const userId = res.locals.userId;
  return dashboardModel.getCurrentUser(userId)
    .then(users => res.json({ users }))
    .catch(err => res.status(500).json({ error: err.message }));
};

module.exports.getQuote = async (req, res) => {
  try {
    const response = await fetch("https://zenquotes.io/api/random");
    const data = await response.json();
    res.json(data[0]); // return to frontend
  } catch (err) {
    res.status(500).json({ error: "Quote fetch failed" });
  }
};

module.exports.getDueToday = function (req, res) {
  const userId = res.locals.userId;
  
  dashboardModel.getTasksDueToday(userId)
    .then(count => {res.json({ dueToday: count });})
    .catch(err => {res.status(500).json({ error: err.message })});
};

module.exports.getDashboard = function (req, res) {
  const userId = res.locals.userId; // Get user ID from JWT token
  return dashboardModel.getDashboardStats(userId)
    .then(stats => res.json({ stats }))
    .catch(err => res.status(500).json({ error: err.message }));
};


module.exports.getDashboardReminders = async function (req, res) {
  const userId = res.locals.userId;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  try {
    // Fetch Today + Upcoming (next 3 days)
    const today = await dashboardModel.getTodayList(userId, todayStart, todayEnd);
    const upcoming = await dashboardModel.getUpcoming(userId, todayEnd);

    // Attach status for frontend use
    const withStatus = (rem) => {
      const dt = new Date(rem.remindAt);

      if (rem.isDone) return { ...rem, status: "Done" };
      if (dt < now) return { ...rem, status: "Overdue" };
      return { ...rem, status: "Upcoming" };
    };

    res.json({
      today: today.map(withStatus),
      upcoming: upcoming.map(withStatus)
    });

  } catch (err) {
    console.error("Dashboard reminders error:", err);
    res.status(500).json({ error: err.message });
  }
};