// src/routers/friendsRouter.js
const express = require('express');
const router = express.Router();

const jwtMiddleware = require('../middleware/jwtMiddleware');
const friendsController = require('../controller/friendsController');

router.get('/', jwtMiddleware.verifyToken, friendsController.list);
router.post('/request', jwtMiddleware.verifyToken, friendsController.sendRequest);
router.patch('/:id', jwtMiddleware.verifyToken, friendsController.transition);

module.exports = router;
