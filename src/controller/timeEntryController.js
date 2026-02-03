const timeEntryModel = require('../models/timeEntryModel');
const taskModel = require('../models/taskModel');

// CREATE time entry
module.exports.createTimeEntry = function (req, res) {
  const userId = res.locals.userId;
  const { taskId, minutes, date, note } = req.body;

  if (!taskId || minutes == null) {
    return res.status(400).json({ error: 'taskId and minutes are required' });
  }
  const mins = parseInt(minutes, 10);
  if (isNaN(mins) || mins < 1) {
    return res.status(400).json({ error: 'minutes must be a positive number' });
  }

  const dateToUse = date || new Date().toISOString().slice(0, 10);

  taskModel.retrieveById(parseInt(taskId, 10), userId)
    .then((task) => {
      if (!task) throw new Error('Task not found or access denied');
      return timeEntryModel.create(userId, taskId, mins, dateToUse, note);
    })
    .then((entry) => res.status(201).json({ timeEntry: entry }))
    .catch((err) => {
      if (err.message === 'Task not found or access denied') return res.status(404).json({ error: err.message });
      console.error('[time-entry create]', err);
      res.status(500).json({ error: err.message });
    });
};

// GET all time entries
module.exports.getTimeEntries = function (req, res) {
  const userId = res.locals.userId;
  const { taskId, from, to } = req.query;
  const options = {};
  if (taskId) options.taskId = parseInt(taskId, 10);
  if (from) options.from = from;
  if (to) options.to = to;

  timeEntryModel.getAll(userId, options)
    .then((entries) => res.json({ timeEntries: entries }))
    .catch((err) => {
      console.error('[time-entry getAll]', err);
      res.status(500).json({ error: err.message });
    });
};

// GET time entry by id
module.exports.getTimeEntryById = function (req, res) {
  const id = Number(req.params.id);
  const userId = res.locals.userId;

  timeEntryModel.getById(id, userId)
    .then((entry) => {
      if (!entry) return res.status(404).json({ error: 'Time entry not found' });
      res.json({ timeEntry: entry });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
};

// UPDATE time entry
module.exports.updateTimeEntry = function (req, res) {
  const id = Number(req.params.id);
  const userId = res.locals.userId;
  const { minutes, date, note } = req.body;

  if (minutes != null) {
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins < 1) {
      return res.status(400).json({ error: 'minutes must be a positive number' });
    }
  }

  const data = {};
  if (minutes != null) data.minutes = parseInt(minutes, 10);
  if (date !== undefined) data.date = date;
  if (note !== undefined) data.note = note;

  timeEntryModel.getById(id, userId)
    .then((existing) => {
      if (!existing) return res.status(404).json({ error: 'Time entry not found' });
      return timeEntryModel.update(id, userId, data);
    })
    .then((result) => {
      if (result.count === 0) return res.status(404).json({ error: 'Time entry not found' });
      return timeEntryModel.getById(id, userId);
    })
    .then((updated) => res.json({ timeEntry: updated }))
    .catch((err) => res.status(500).json({ error: err.message }));
};

// DELETE time entry
module.exports.deleteTimeEntry = function (req, res) {
  const id = Number(req.params.id);
  const userId = res.locals.userId;

  timeEntryModel.delete(id, userId)
    .then((result) => {
      if (result.count === 0) return res.status(404).json({ error: 'Time entry not found' });
      res.json({ message: 'Time entry deleted' });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
};
