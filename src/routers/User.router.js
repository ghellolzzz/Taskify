const express = require('express');
const { registerUser, loginUser } = require('../models/User.model');
const { generateToken, sendToken } = require('../middleware/jwtMiddleware');
const router = express.Router();

/**
 * POST /api/users/register
 * Register a new user
 */
router.post('/register', (req, res, next) => {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Name, email, and password are required',
    });
  }

  // Validate email format (basic)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
    });
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters long',
    });
  }

  registerUser(name, email, password)
    .then((user) => {
      // Set userId and user in res.locals for JWT generation
      res.locals.userId = user.id;
      res.locals.user = user;
      res.locals.message = 'Registration successful';
      // Generate and send token
      generateToken(req, res, () => {
        sendToken(req, res);
      });
    })
    .catch(next);
});

/**
 * POST /api/users/login
 * Login an existing user
 */
router.post('/login', (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
    });
  }

  loginUser(email, password)
    .then((user) => {
      // Set userId and user in res.locals for JWT generation
      res.locals.userId = user.id;
      res.locals.user = user;
      res.locals.message = 'Login successful';
      // Generate and send token
      generateToken(req, res, () => {
        sendToken(req, res);
      });
    })
    .catch(next);
});

module.exports = router;

