// src/controllers/friendsController.js
const Friends = require('../models/Friends.model');

function bad(res, status, msg) {
  return res.status(status).json({ error: msg });
}

module.exports.list = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const data = await Friends.getAllForUser(userId);
    res.json(data);
  } catch (err) {
    if (err?.code === 'P2021') {
      return res.json({ incoming: [], outgoing: [], friends: [] });
    }
    console.error('friendsController.list error:', err);
    return res.status(500).json({ error: 'Failed to load friends' });
  }
};


module.exports.sendRequest = async (req, res) => {
  const userId = res.locals.userId;
  const email = (req.body.email || '').trim();

  if (!email) return bad(res, 400, 'Email is required');

  const target = await Friends.findUserByEmailInsensitive(email);
  if (!target) return bad(res, 404, 'User not found');
  if (target.id === userId) return bad(res, 400, 'You cannot add yourself');

  const existing = await Friends.findAnyRelationship(userId, target.id);

  // Decision-making (state mgmt): if they already requested you, auto-accept
  if (existing) {
    if (existing.status === 'ACCEPTED') return bad(res, 409, 'Already friends');

    if (existing.status === 'PENDING') {
      if (existing.requesterId === userId) return bad(res, 409, 'Request already sent');
      // reverse pending -> accept
      await Friends.updateStatus(existing.id, 'ACCEPTED');
      return res.json({ ok: true, action: 'AUTO_ACCEPTED' });
    }

    // If old relationship exists (rejected/cancelled/removed), reuse it by setting proper direction + pending
    // Easiest: create new only if same-direction unique blocks; otherwise update is fine
    // We'll just create a new request if the old row is opposite direction with unique constraints risk.
  }

  await Friends.createRequest(userId, target.id);
  res.json({ ok: true, action: 'REQUEST_SENT' });
};

module.exports.transition = async (req, res) => {
  const userId = res.locals.userId;
  const id = Number(req.params.id);
  const action = (req.body.action || '').toUpperCase();

  const row = await Friends.getById(id);
  if (!row) return bad(res, 404, 'Request not found');

  const isParty = row.requesterId === userId || row.addresseeId === userId;
  if (!isParty) return bad(res, 403, 'Not allowed');

  // Allowed transitions (robust + clear rules)
  if (action === 'ACCEPT') {
    if (row.addresseeId !== userId) return bad(res, 403, 'Only receiver can accept');
    if (row.status !== 'PENDING') return bad(res, 409, 'Not pending');
    await Friends.updateStatus(id, 'ACCEPTED');
    return res.json({ ok: true });
  }

  if (action === 'REJECT') {
    if (row.addresseeId !== userId) return bad(res, 403, 'Only receiver can reject');
    if (row.status !== 'PENDING') return bad(res, 409, 'Not pending');
    await Friends.updateStatus(id, 'REJECTED');
    return res.json({ ok: true });
  }

  if (action === 'CANCEL') {
    if (row.requesterId !== userId) return bad(res, 403, 'Only sender can cancel');
    if (row.status !== 'PENDING') return bad(res, 409, 'Not pending');
    await Friends.updateStatus(id, 'CANCELLED');
    return res.json({ ok: true });
  }

  if (action === 'REMOVE') {
    if (row.status !== 'ACCEPTED') return bad(res, 409, 'Not friends');
    await Friends.updateStatus(id, 'REMOVED');
    return res.json({ ok: true });
  }

  if (action === 'UNDO') {
    if (row.status !== 'REMOVED') return bad(res, 409, 'Nothing to undo');
    await Friends.updateStatus(id, 'ACCEPTED');
    return res.json({ ok: true });
  }

  return bad(res, 400, 'Unknown action');
};
