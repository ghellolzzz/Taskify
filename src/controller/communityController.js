const communityModel = require("../models/communityModel");

// CREATE Note
module.exports.createNote = function (req, res) {
  const userId = res.locals.userId;
  const { content, color } = req.body;

  if (!content || content.length > 280) {
    return res.status(400).json({ error: "Invalid content length" });
  }

  communityModel.create(userId, content, color)
    .then(newNote => {
      res.json({
        message: "Note posted! ✨",
        note: newNote
      });
    })
    .catch(err => res.status(500).json({ error: err.message }));
};

// GET all Notes
module.exports.getNotes = function (req, res) {
  communityModel.getAll()
    .then(notes => res.json({ notes }))
    .catch(err => res.status(500).json({ error: err.message }));
};

// REACT to a Note
module.exports.reactToNote = function (req, res) {
  const userId = res.locals.userId;
  const noteId = req.params.id;
  const { type } = req.body;

  communityModel.toggleReaction(userId, noteId, type || "HEART")
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
};

// UPDATE Note
module.exports.updateNote = function (req, res) {
  const id = req.params.id;
  const userId = res.locals.userId;
  const { content, color } = req.body;

  communityModel.update(id, userId, content, color)
    .then(result => {
      if (result.count === 0) return res.status(404).json({ error: "Note not found or unauthorized" });
      res.json({ success: true });
    })
    .catch(err => res.status(500).json({ error: err.message }));
};

// DELETE Note
module.exports.deleteNote = function (req, res) {
  const id = req.params.id;
  const userId = res.locals.userId;

  communityModel.delete(id, userId)
    .then(result => {
      if (result.count === 0) return res.status(404).json({ error: "Note not found or unauthorized" });
      res.json({ message: "Note deleted" });
    })
    .catch(err => res.status(500).json({ error: err.message }));
};