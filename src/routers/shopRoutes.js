const express = require('express');
const router = express.Router();
const controller = require('../controller/shopController');
const { verifyToken } = require('../middleware/jwtMiddleware');

// View what is in the shop
router.get('/themes', controller.getShopItems);

// View my money and items
router.get('/inventory', verifyToken, controller.getInventory);

// Buy something
router.post('/buy', verifyToken, controller.buyItem);

// Equip something
router.post('/equip', verifyToken, controller.equipItem);

module.exports = router;