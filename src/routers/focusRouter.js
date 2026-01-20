const express = require('express');
const router = express.Router();
const focusController = require('../controller/focusController');
const { verifyToken } = require("../middleware/jwtMiddleware");
router.use(verifyToken)

// GET /api/focus/settings
router.get('/settings', focusController.getPreferences); 

// POST /api/focus/settings
router.post('/settings', focusController.savePreferences);

// POST /api/focus/log
router.post('/log', focusController.logSession);

module.exports = router;