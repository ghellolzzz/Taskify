const express = require('express');
const dashboardController = require('../controller/dashboardController');
const { verifyToken } = require('../middleware/jwtMiddleware');
const router = express.Router();

//GET user name
router.get('/user', verifyToken, dashboardController.getUser);
//GET quote from a api
router.get("/quote", dashboardController.getQuote);
//GET today task
router.get("/today", verifyToken, dashboardController.getDueToday);
// GET /api/dashboard
router.get('/', verifyToken, dashboardController.getDashboard);
// GET reminders
router.get('/reminders', verifyToken, dashboardController.getDashboardReminders);

module.exports = router;
