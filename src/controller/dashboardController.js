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


