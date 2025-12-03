const express = require("express");
const router = express.Router();
const feedbackController = require("../controller/feedbackController");
// const { verifyToken } = require("../middleware/jwtMiddleware"); // Authentication is usually NOT required for feedback

// If you need authentication, uncomment the line below:
// router.use(verifyToken)

// POST Submits feedback
router.post("/", feedbackController.submitFeedback);

module.exports = router;