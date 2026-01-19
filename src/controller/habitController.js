// src/controller/habitController.js
const habitModel = require('../models/Habit.model');

/**
 * GET /api/habits
 * Return the full "habits board" (week + habits + summary)
 */
module.exports.getBoard = function (req, res, next) {
  const userId = res.locals.userId;

  habitModel.getHabitsBoard(userId)
    .then((board) => res.json(board))
    .catch(next);
};

/**
 * POST /api/habits
 * Create a new habit, then return updated board
 */
module.exports.create = function (req, res, next) {
  const userId = res.locals.userId;

  habitModel.createHabit(userId, req.body)
    .then(() => habitModel.getHabitsBoard(userId))
    .then((board) => res.json(board))
    .catch(next);
};

/**
 * PATCH /api/habits/:habitId
 * Update habit metadata (title/colour/target/isArchived)
 */
module.exports.updateMeta = function (req, res, next) {
  const userId = res.locals.userId;
  const { habitId } = req.params;

  habitModel.updateHabitMeta(userId, habitId, req.body)
    .then(() => habitModel.getHabitsBoard(userId))
    .then((board) => res.json(board))
    .catch(next);
};

/**
 * DELETE /api/habits/:habitId
 * Archive a habit, then return updated board
 */
module.exports.archive = function (req, res, next) {
  const userId = res.locals.userId;
  const { habitId } = req.params;

  habitModel.updateHabitMeta(userId, habitId, { isArchived: true })
    .then(() => habitModel.getHabitsBoard(userId))
    .then((board) => res.json(board))
    .catch(next);
};

/**
 * DELETE /api/habits/:habitId/hard
 * Permanently delete a habit + its logs, then return updated board
 */
module.exports.hardDelete = function (req, res, next) {
  const userId = res.locals.userId;
  const { habitId } = req.params;

  habitModel.deleteHabit(userId, habitId)
    .then(() => habitModel.getHabitsBoard(userId))
    .then((board) => res.json(board))
    .catch(next);
};

/**
 * POST /api/habits/:habitId/toggle
 * Toggle one day's check-in, then return updated board
 */
module.exports.toggle = function (req, res, next) {
  const userId = res.locals.userId;
  const { habitId } = req.params;
  const { date } = req.body || {};

  habitModel.toggleHabitCheck(userId, habitId, date)
    .then(() => habitModel.getHabitsBoard(userId))
    .then((board) => res.json(board))
    .catch(next);
};
