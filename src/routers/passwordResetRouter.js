const express = require('express');
const passwordResetController = require('../controller/passwordResetController');
const router = express.Router();

router.post('/request', passwordResetController.requestPasswordReset);
router.get('/verify', passwordResetController.verifyResetToken, (req, res) => {
    res.status(200).json({ message: "Token is valid" });
});
router.post('/reset', passwordResetController.resetPassword);

module.exports = router;
