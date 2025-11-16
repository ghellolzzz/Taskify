const express = require('express');
const { getDashboardStats } = require('../models/dashboard.model');
const router = express.Router();

// GET /api/dashboard
router.get('/', (req, res, next) => {
  const userId = 1; // TEMP: use real session user later

  getDashboardStats(userId)
    .then((stats) => res.status(200).json(stats))
    .catch(next);
});

module.exports = router;
