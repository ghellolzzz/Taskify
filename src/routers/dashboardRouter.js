const express = require('express');
const dashboardController = require('../controller/dashboardController');
const { verifyToken } = require('../middleware/jwtMiddleware');
const router = express.Router();

//GET user name
router.get('/user', verifyToken, dashboardController.getUser)
// GET /api/dashboard
router.get('/', verifyToken, dashboardController.getDashboard);

module.exports = router;
