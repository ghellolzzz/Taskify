const calendarModel = require("../models/calendarModel");

// Get priority suggestions for tasks
module.exports.getPrioritySuggestions = function(req, res) {
    const userId = res.locals.userId;
    const date = req.query.date || null;
    
    return calendarModel.getPrioritySuggestions(userId, date)
        .then(suggestions => res.json({ suggestions }))
        .catch(err => res.status(500).json({ error: err.message }));
};

