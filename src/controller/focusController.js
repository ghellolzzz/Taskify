const focusModel = require("../models/focusModel");

module.exports.getPreferences = function (req, res) {
    const userId = res.locals.userId; // Uses the ID from your auth middleware

    return focusModel.getSettings(userId)
        .then(result => {
            // Return defaults if no settings found (result is null)
            const settings = result || { preferredTheme: 'drink', preferredDrink: 'coffee', backgroundColor: '#fdf6e3' };
            res.status(200).json(settings);
        })
        .catch(err => res.status(500).json({ message: err.message }));
};

module.exports.savePreferences = function (req, res) {
    const userId = res.locals.userId;
    const { theme, drink, color } = req.body;

    return focusModel.upsertSettings(userId, theme, drink, color)
        .then(() => res.status(200).json({ message: "Theme saved successfully!" }))
        .catch(err => res.status(500).json({ message: err.message }));
};

module.exports.logSession = function (req, res) {
    const userId = res.locals.userId;
    const { minutes, status } = req.body;

    return focusModel.logSession(userId, minutes, status)
        .then(() => res.status(201).json({ message: "Session logged successfully" }))
        .catch(err => res.status(500).json({ message: err.message }));
};