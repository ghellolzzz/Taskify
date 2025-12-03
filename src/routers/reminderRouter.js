const express = require('express');
const reminderController = require('../controller/reminderController');
const { verifyToken } = require('../middleware/jwtMiddleware');
const router = express.Router();

// GET REMINDERS
router.get("/", verifyToken, reminderController.getReminders);
// GET TODAY REMINDERS
router.get("/stats", verifyToken, reminderController.getStats);
// CREATE REMINDERS
router.post("/", verifyToken, reminderController.createReminder);
// GET REMINDER BY ID
router.get("/:id", verifyToken, reminderController.getReminderById);
// UPDATE REMINDERS
router.put("/:id", verifyToken, reminderController.updateReminder);
// UPDATE REMINDERS AS DONE
router.put("/:id/complete", verifyToken, reminderController.completeReminder);
// DELETE REMINDERS
router.delete("/:id", verifyToken, reminderController.deleteReminder);



module.exports = router;