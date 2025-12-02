const calendarModel = require("../models/calendarModel");

// Get priority suggestions for tasks
module.exports.getPrioritySuggestions = function(req, res) {
    const userId = res.locals.userId;
    const date = req.query.date || null;
    
    console.log(`[Calendar Controller] Getting priority suggestions for user ${userId}, date: ${date}`);
    
    return calendarModel.getPrioritySuggestions(userId, date)
        .then(suggestions => {
            console.log(`[Calendar Controller] Returning ${suggestions.length} suggestions`);
            return res.json({ suggestions });
        })
        .catch(err => {
            console.error(`[Calendar Controller] Error:`, err);
            return res.status(500).json({ error: err.message });
        });
};

