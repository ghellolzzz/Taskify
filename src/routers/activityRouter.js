// src/routers/activityRouter.js
const express = require('express');
const router = express.Router();

const jwtMiddleware = require('../middleware/jwtMiddleware');
const activityController = require('../controller/activityController');

router.get('/inbox', jwtMiddleware.verifyToken, activityController.inbox);
router.patch('/inbox/habit-share/:id', jwtMiddleware.verifyToken, activityController.updateHabitShare);

module.exports = router;
