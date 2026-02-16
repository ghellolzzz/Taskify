const express = require('express');
const communityController = require('../controller/communityController');
const { verifyToken } = require('../middleware/jwtMiddleware');
const router = express.Router();

// GET ALL NOTES
router.get("/", verifyToken, communityController.getNotes);

// POST NEW NOTE
router.post("/", verifyToken, communityController.createNote);

// TOGGLE REACTION
router.post("/:id/react", verifyToken, communityController.reactToNote);

// UPDATE NOTES
router.put("/:id", verifyToken, communityController.updateNote);

//DELETE NOTES
router.delete("/:id", verifyToken, communityController.deleteNote);

module.exports = router;