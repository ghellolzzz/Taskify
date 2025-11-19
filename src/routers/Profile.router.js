// src/routers/Profile.router.js
const express = require('express');
const router = express.Router();

const {
  getProfileOverview,
  getProfileBadges,
  getProfileActivity,
  updateProfile,
} = require('../models/Profile.model');

// GET /api/profile/:userId/overview
router.get('/:userId/overview', (req, res, next) => {
  const { userId } = req.params;
  getProfileOverview(userId)
    .then((data) => res.json(data))
    .catch(next);
});

// GET /api/profile/:userId/badges
router.get('/:userId/badges', (req, res, next) => {
  const { userId } = req.params;
  getProfileBadges(userId)
    .then((data) => res.json(data))
    .catch(next);
});

// GET /api/profile/:userId/activity
router.get('/:userId/activity', (req, res, next) => {
  const { userId } = req.params;
  getProfileActivity(userId)
    .then((data) => res.json(data))
    .catch(next);
});

// PUT /api/profile/:userId
// Body: { name?, bio?, avatarUrl?, theme?, accentColor? }
router.put('/:userId', (req, res, next) => {
  const { userId } = req.params;
  const payload = req.body || {};

  updateProfile(userId, payload)
    .then((updated) => res.json(updated))
    .catch(next);
});

module.exports = router;
