const express = require('express');
const calendarController = require('../controller/calendarController');
const { verifyToken } = require('../middleware/jwtMiddleware');
const router = express.Router();

router.use(verifyToken);

// GET /api/calendar/tasks/priority-suggestions?date=2025-01-15
router.get('/tasks/priority-suggestions', calendarController.getPrioritySuggestions);

module.exports = router;

