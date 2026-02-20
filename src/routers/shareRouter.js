// src/routers/shareRouter.js
const express = require('express');
const router = express.Router();

const jwtMiddleware = require('../middleware/jwtMiddleware');
const shareController = require('../controller/shareController');

// Optional auth middleware: only verify if header exists
function optionalAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return next();
  return jwtMiddleware.verifyToken(req, res, next);
}

// Create link (must be logged in)
router.post('/habits', jwtMiddleware.verifyToken, shareController.createHabitLink);

router.post('/habits/:token/send', jwtMiddleware.verifyToken, shareController.sendHabitLink);

// View link card (public links can be viewed without login; friends-only requires login)
router.get('/habits/:token', optionalAuth, shareController.viewHabitLink);

module.exports = router;
