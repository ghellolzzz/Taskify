const feedbackModel = require("../models/feedbackModel");

module.exports.submitFeedback = function (req, res) {
    const userId = res.locals.userId;
    const { type, description } = req.body;
    
    // validation based on the frontend form
    if (!type || !description) {
        return res.status(400).json({ error: "Feedback Type and Description are required." });
    }
    
    const data = { 
        type, 
        description, 
        ...(userId ? { userId: Number(userId) } : {})
    };

    return feedbackModel.createFeedback(data)
        .then(result => res.status(201).json({ 
            message: "Feedback submitted successfully", 
            feedback: result 
        }))
        .catch(err => {
            console.error(err);
            res.status(500).json({ message: err.message });
        });
};