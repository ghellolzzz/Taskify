const { registerUser, loginUser } = require('../models/User.model');
const jwt = require('jsonwebtoken');

const secretKey = process.env.JWT_SECRET_KEY;
const tokenDuration = process.env.JWT_EXPIRES_IN;
const tokenAlgorithm = process.env.JWT_ALGORITHM;

module.exports.register = function(req, res) {
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

  return registerUser(name, email, password)
    .then((user) => {
      try {
        const payload = {
          user_id: user.id,
          timestamp: new Date()
        };

        const options = {
          algorithm: tokenAlgorithm,
          expiresIn: tokenDuration,
        };

        const token = jwt.sign(payload, secretKey, options);
        
        return res.status(200).json({
          message: 'Registration successful',
          token: token,
          user_id: user.id,
        });
      } catch (jwtError) {
        console.error("Error jwt:", jwtError);
        return res.status(500).json({ error: 'Token generation failed' });
      }
    })
    .catch(err => {
      const statusCode = err.status || 500;
      return res.status(statusCode).json({ error: err.message || 'Registration failed' });
    });
};

module.exports.login = function(req, res) {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
    });
  }

  return loginUser(email, password)
    .then((user) => {
      try {
        const payload = {
          user_id: user.id,
          timestamp: new Date()
        };

        const options = {
          algorithm: tokenAlgorithm,
          expiresIn: tokenDuration,
        };

        const token = jwt.sign(payload, secretKey, options);
        
        return res.status(200).json({
          message: 'Login successful',
          token: token,
          user_id: user.id,
        });
      } catch (jwtError) {
        console.error("Error jwt:", jwtError);
        return res.status(500).json({ error: 'Token generation failed' });
      }
    })
    .catch(err => {
      const statusCode = err.status || 500;
      return res.status(statusCode).json({ error: err.message || 'Login failed' });
    });
};

