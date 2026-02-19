// src/routers/Habit.router.js
const express = require('express');
const { verifyToken } = require('../middleware/jwtMiddleware');
const habitController = require('../controller/habitController');

const router = express.Router();

// All habits routes require auth
router.use(verifyToken);

// GET /api/habits → board (habits + week + summary)
router.get('/', habitController.getBoard);

// POST /api/habits → create habit
router.post('/', habitController.create);

router.patch('/reorder', habitController.reorder);

// PATCH /api/habits/:habitId → update habit metadata
router.patch('/:habitId', habitController.updateMeta);

// DELETE /api/habits/:habitId/hard → permanent delete
router.delete('/:habitId/hard', habitController.hardDelete);

// DELETE /api/habits/:habitId → archive habita
router.delete('/:habitId', habitController.archive);

// POST /api/habits/:habitId/toggle → toggle one day check-in
router.post('/:habitId/toggle', habitController.toggle);

module.exports = router;
