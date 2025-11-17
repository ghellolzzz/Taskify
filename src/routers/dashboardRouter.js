const express = require('express');
const dashboardController = require('../controller/dashboardController');
const router = express.Router();

// GET /api/dashboard
router.get('/',dashboardController.getDashboard);

module.exports = router;
