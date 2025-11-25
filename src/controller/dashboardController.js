const dashboardModel = require("../models/dashboardModel");
const { EMPTY_RESULT_ERROR } = require('../errors');

module.exports.getUser = function (req, res) {
  const userId = res.locals.userId; // Get user ID from JWT token
  return dashboardModel.getCurrentUser(userId)
    .then(users => res.json({ users }))
    .catch(err => res.status(500).json({ error: err.message }));
};


module.exports.getDashboard = function (req, res) {
  const userId = res.locals.userId; // Get user ID from JWT token
  return dashboardModel.getDashboardStats(userId)
    .then(stats => res.json({ stats }))
    .catch(err => res.status(500).json({ error: err.message }));
};


