const dashboardModel = require("../models/dashboardModel");
const { EMPTY_RESULT_ERROR } = require('../errors');

const userId = 1; // TEMP: use real session user later

module.exports.getUser = function (req, res) {
  return dashboardModel.getCurrentUser(userId)
    .then(users => res.json({ users }))
    .catch(err => res.status(500).json({ error: err.message }));
};


module.exports.getDashboard = function (req, res) {
  return dashboardModel.getDashboardStats(userId)
    .then(stats => res.json({ stats }))
    .catch(err => res.status(500).json({ error: err.message }));
};


