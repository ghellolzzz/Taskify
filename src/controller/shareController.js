// src/controller/shareController.js
const Share = require('../models/Share.model');

function bad(res, status, msg) {
  return res.status(status).json({ error: msg });
}

module.exports.createHabitLink = async (req, res) => {
  const ownerId = res.locals.userId;
  const visibility = String(req.body.visibility || 'PUBLIC').toUpperCase();
  const expiry = String(req.body.expiry || '7d'); // '1d' | '7d' | 'never'

  if (!['PUBLIC', 'FRIENDS_ONLY'].includes(visibility)) return bad(res, 400, 'Invalid visibility');
  if (!['1d', '7d', 'never'].includes(expiry)) return bad(res, 400, 'Invalid expiry');

  const row = await Share.createHabitShareLink(ownerId, visibility, expiry);

  res.json({
    token: row.token,
    path: `/share/habits/${row.token}`,
    visibility: row.visibility,
    expiresAt: row.expiresAt,
  });
};

module.exports.viewHabitLink = async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) return bad(res, 400, 'Missing token');

  const link = await Share.getLinkByToken(token);
  if (!link) return bad(res, 404, 'NOT_FOUND');

  if (link.expiresAt && new Date() > link.expiresAt) {
    return res.status(410).json({ error: 'LINK_EXPIRED' });
  }

  // Access control:
  if (link.visibility === 'FRIENDS_ONLY') {
    const viewerId = res.locals.userId; // may be undefined if no token (optional auth)
    if (!viewerId) return res.status(401).json({ error: 'LOGIN_REQUIRED' });

    const ok = await Share.isFriends(viewerId, link.ownerId);
    if (!ok) return res.status(403).json({ error: 'ACCESS_DENIED' });
  }

  // Data transformation payload (card)
const card = await Share.buildHabitsShareCard(link.ownerId, [7, 30]);


  res.json({
    token: link.token,
    visibility: link.visibility,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    card,
  });
};

module.exports.sendHabitLink = async (req, res) => {
  const ownerId = res.locals.userId;
  const token = String(req.params.token || '').trim();
  if (!token) return bad(res, 400, 'Missing token');

  const recipientIds = Array.isArray(req.body.recipientIds) ? req.body.recipientIds : [];
  const message = req.body.message;

  const result = await Share.sendHabitShareLink(ownerId, token, recipientIds, message);

  if (result.error === 'NOT_FOUND') return bad(res, 404, 'NOT_FOUND');
  if (result.error === 'FORBIDDEN') return bad(res, 403, 'FORBIDDEN');
  if (result.error === 'NO_RECIPIENTS') return bad(res, 400, 'Select at least one friend');

  res.json({
    ok: true,
    sent: result.sent,
    rejected: result.rejected,
    createdCount: result.createdCount,
  });
};
