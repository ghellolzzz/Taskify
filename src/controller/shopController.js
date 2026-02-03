const shopModel = require("../models/shopModel");

// GET /api/shop/themes
module.exports.getShopItems = (req, res) => {
    shopModel.getAllThemes()
        .then(themes => res.json(themes))
        .catch(err => res.status(500).json({ error: "Failed to load shop" }));
};

// GET /api/shop/inventory
module.exports.getInventory = (req, res) => {
    const userId = res.locals.userId;
    shopModel.getUserInventory(userId)
        .then(data => res.json(data))
        .catch(err => res.status(500).json({ error: "Failed to load inventory" }));
};

// POST /api/shop/buy
module.exports.buyItem = (req, res) => {
    const userId = res.locals.userId;
    const { themeId } = req.body;

    if (!themeId) return res.status(400).json({ error: "Theme ID required" });

    shopModel.purchaseTheme(userId, themeId)
        .then(() => res.json({ message: "Purchase successful!" }))
        .catch(err => {
            const status = err.message.includes("Not enough") || err.message.includes("own this") ? 400 : 500;
            res.status(status).json({ error: err.message });
        });
};

// POST /api/shop/equip
module.exports.equipItem = (req, res) => {
    const userId = res.locals.userId;
    const { cssClass } = req.body;

    if (!cssClass) return res.status(400).json({ error: "Theme class required" });

    shopModel.equipTheme(userId, cssClass)
        .then(() => res.json({ message: "Theme equipped!" }))
        .catch(err => res.status(500).json({ error: "Failed to equip theme" }));
};