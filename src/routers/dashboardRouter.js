const express = require('express');
const dashboardController = require('../controller/dashboardController');
const router = express.Router();

//GET user name
router.get('/user', dashboardController.getUser)
// GET /api/dashboard
router.get('/', dashboardController.getDashboard);

module.exports = router;
