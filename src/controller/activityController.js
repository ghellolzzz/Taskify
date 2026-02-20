// src/controller/activityController.js
const Activity = require('../models/Activity.model');

function bad(res, status, msg) {
  return res.status(status).json({ error: msg });
}

module.exports.inbox = async (req, res) => {
  const userId = res.locals.userId;

  const limit = Number(req.query.limit || 20);
  const unreadOnly = String(req.query.unreadOnly || '0') === '1';
  const includeDismissed = String(req.query.includeDismissed || '0') === '1';
  const type = req.query.type ? String(req.query.type).toUpperCase() : null;

  const data = await Activity.getInboxForUser(userId, { limit, unreadOnly, type, includeDismissed });
  res.json(data);
};


module.exports.updateHabitShare = async (req, res) => {
  const userId = res.locals.userId;
  const id = req.params.id;

  const action = String(req.body.action || '').toUpperCase();
  if (!['READ', 'DISMISS'].includes(action)) return bad(res, 400, 'Unknown action');

  const status = action === 'READ' ? 'READ' : 'DISMISSED';
  const result = await Activity.updateHabitShareStatus(userId, id, status);

  if (!result.ok && result.error === 'NOT_FOUND') return bad(res, 404, 'Not found');
  if (!result.ok) return bad(res, 400, 'Failed');

  res.json({ ok: true });
};
