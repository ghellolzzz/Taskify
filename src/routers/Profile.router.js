// src/routers/Profile.router.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { verifyToken } = require('../middleware/jwtMiddleware');

const router = express.Router();

const {
  getProfileOverview,
  getProfileBadges,
  getProfileActivity,
  updateProfile,
} = require('../models/Profile.model');

// Multer storage for avatar uploads 

const uploadDir = path.join(__dirname, '../public/uploads/avatars');
fs.mkdirSync(uploadDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.params.userId || 'unknown';
    cb(null, `user-${userId}-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});


router.use(verifyToken);

// GET /api/profile/:userId/overview
router.get('/:userId/overview', (req, res, next) => {
  const { userId } = req.params;
  if (Number(userId) !== Number(res.locals.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  getProfileOverview(userId).then(res.json.bind(res)).catch(next);
});

// GET /api/profile/:userId/badges
router.get('/:userId/badges', (req, res, next) => {
  const { userId } = req.params;
  if (Number(userId) !== Number(res.locals.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  getProfileBadges(userId).then(res.json.bind(res)).catch(next);
});

// GET /api/profile/:userId/activity
router.get('/:userId/activity', (req, res, next) => {
  const { userId } = req.params;
  if (Number(userId) !== Number(res.locals.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  getProfileActivity(userId).then(res.json.bind(res)).catch(next);
});



//  PUT /api/profile/:userId
router.put(
  '/:userId',
  // First: run Multer manually so we can catch its errors
  (req, res, next) => {
    avatarUpload.single('avatar')(req, res, function (err) {
      if (err) {
        // Multer-specific error (e.g. file too large)
        if (err.name === 'MulterError') {
          console.error('Multer upload error:', err);
          return res.status(400).json({
            error:
              err.code === 'LIMIT_FILE_SIZE'
                ? 'Avatar image is too large (max 2MB).'
                : 'Error uploading avatar image.',
            name: err.name,
            code: err.code,
          });
        }

        // Any other error
        console.error('Upload middleware error:', err);
        return res.status(400).json({
          error: err.message || 'Error uploading avatar image.',
        });
      }

      // No Multer error → continue to actual handler
      next();
    });
  },
  // Actual handler
  async (req, res, next) => {
    try {
      const { userId } = req.params;

      if (Number(userId) !== Number(res.locals.userId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const payload = req.body || {};

      // 1) Load current user (to know old avatar)
      const overview = await getProfileOverview(userId);
      const currentUser = overview.user;
      const oldAvatar = currentUser?.avatarUrl || null;

      // 2) Decide what the new avatar URL should be
      let nextAvatarUrl = oldAvatar;

      // If a file was uploaded, this wins
      if (req.file) {
        nextAvatarUrl = `/uploads/avatars/${req.file.filename}`;
      } else if (
        typeof payload.avatarUrl === 'string' &&
        payload.avatarUrl.trim() !== ''
      ) {
        // Fallback: avatar URL typed manually
        nextAvatarUrl = payload.avatarUrl.trim();
      }

      // If client asked to remove avatar, force null
      if (payload.removeAvatar === 'true') {
        nextAvatarUrl = null;
      }

      // 3) If avatar changed and old one was a local file, delete it from disk
      if (
        oldAvatar &&
        oldAvatar.startsWith('/uploads/avatars/') &&
        oldAvatar !== nextAvatarUrl
      ) {
        const absPath = path.join(__dirname, '../public', oldAvatar);
        fs.unlink(absPath, (err) => {
          if (err) {
            console.warn('Failed to delete old avatar:', err.message);
          }
        });
      }

      // 4) Build clean updateData object
      const updateData = {};

      if (typeof payload.name === 'string') {
        updateData.name = payload.name.trim();
      }
      if (typeof payload.bio === 'string') {
        updateData.bio = payload.bio.trim();
      }

      // Only send avatarUrl if it actually changed
      if (nextAvatarUrl !== oldAvatar) {
        updateData.avatarUrl = nextAvatarUrl;
      }

      // Theme & accent
      if (typeof payload.theme === 'string') {
        updateData.theme = payload.theme;
      }
      if (typeof payload.accentColor === 'string') {
        updateData.accentColor = payload.accentColor;
      }

      // 5) Call model to update user
      const updated = await updateProfile(userId, updateData);

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

