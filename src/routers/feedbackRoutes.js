const express = require("express");
const router = express.Router();
const feedbackController = require("../controller/feedbackController");
const { verifyToken } = require("../middleware/jwtMiddleware"); // Authentication is usually NOT required for feedback


// POST Submits feedback
router.post("/", verifyToken, feedbackController.submitFeedback);

module.exports = router;