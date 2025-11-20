const express = require('express');
const userController = require('../controller/userController');
const { hashPassword, comparePassword } = require('../middleware/bcryptMiddleware');
const { generateToken, sendToken } = require('../middleware/jwtMiddleware');
const router = express.Router();

router.post('/register', userController.checkEmailExist, hashPassword, userController.register, generateToken, sendToken);
router.post('/login', userController.login, comparePassword, generateToken, sendToken);

module.exports = router;

