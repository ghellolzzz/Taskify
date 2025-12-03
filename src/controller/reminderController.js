const reminderModel = require("../models/reminderModel");
const { EMPTY_RESULT_ERROR } = require('../errors');

// CREATE Reminder
module.exports.createReminder = function (req, res) {
  const userId = res.locals.userId;
  const { title, notes, remindAt, taskId, repeatType } = req.body;

  reminderModel.create(userId, title, notes, remindAt, taskId, repeatType)
    .then(newReminder => {
      res.json({
        message: "Reminder created",
        reminder: newReminder
      });
    })
    .catch(err => res.status(500).json({ error: err.message }));
};

// GET all reminders
module.exports.getReminders = function (req, res) {
  const userId = res.locals.userId;

  reminderModel.getAll(userId)
    .then(reminders => res.json({ reminders }))
    .catch(err => res.status(500).json({ error: err.message }));
};
// GET reminder by id
module.exports.getReminderById = function (req, res) {
  const id = Number(req.params.id);
  const userId = res.locals.userId;

  reminderModel.getById(id, userId)
    .then(reminder => {
      if (!reminder) return res.status(404).json({ error: "Reminder not found" });
      res.json({ reminder });
    })
    .catch(err => res.status(500).json({ error: err.message }));
};
// GET today reminder
module.exports.getStats = async function (req, res) {
  const userId = res.locals.userId;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  try {
    const [today, upcoming, overdue, done] =
      await reminderModel.getStats(userId, now, todayStart, todayEnd);

    return res.json({
      today,
      upcoming,
      overdue,
      done
    });

  } catch (err) {
    console.error("Error loading reminder stats:", err);
    return res.status(500).json({ error: err.message });
  }
};
//UPDATE reminder
module.exports.updateReminder = function (req, res) {
  const id = Number(req.params.id);
  const userId = res.locals.userId;

  reminderModel.update(id, userId, req.body)
    .then(result => {
      if (result.count === 0)
        return res.status(404).json({ error: "Reminder not found" });

      res.json({ success: true });
    })
    .catch(err => res.status(500).json({ error: err.message }));
};
// UPDATE reminder as done
module.exports.completeReminder = async function (req, res) {
  const id = Number(req.params.id);
  const userId = res.locals.userId;

  try {
    const result = await reminderModel.complete(id, userId);

    if (!result) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    return res.json({ success: true, reminder: result });

  } catch (err) {
    console.error("Repeat update error:", err);
    return res.status(500).json({ error: err.message });
  }
};
// DELETE reminder
module.exports.deleteReminder = function (req, res) {
  const id = Number(req.params.id);

  reminderModel.delete(id)
    .then(() => res.json({ message: "Reminder deleted" }))
    .catch(err => res.status(500).json({ error: err.message }));
};