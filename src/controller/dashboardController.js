const dashboardModel = require("../models/dashboardModel");
const { EMPTY_RESULT_ERROR } = require('../errors');

// const userId = res.locals.userId; // TEMP: use real session user later

module.exports.getUser = function (req, res) {
  const userId = res.locals.userId;
  console.log(userId,"get user")

  return dashboardModel.getCurrentUser(userId)
    .then(users => res.json({ users }))
    .catch(err => res.status(500).json({ error: err.message }));
};


module.exports.getDashboard = function (req, res) {
  const userId = res.locals.userId; // Get user ID from JWT token
    console.log(userId,"get task from user")
  return dashboardModel.getDashboardStats(userId)
    .then(stats => res.json({ stats }))
    .catch(err => res.status(500).json({ error: err.message }));
};


