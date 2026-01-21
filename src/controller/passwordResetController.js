//////////////////////////////////////////////////////
// REQUIRE MODULES
//////////////////////////////////////////////////////

const passwordResetModel = require('../models/passwordResetModel');
const userModel = require('../models/User.model');

//////////////////////////////////////////////////////
// REQUEST PASSWORD RESET
//////////////////////////////////////////////////////

module.exports.requestPasswordReset = (req, res, next) => {
    if (req.body.email == undefined) {
        res.status(400).json({ error: "Email is required" });
        return;
    }

    const data = {
        email: req.body.email
    };

    // First, find user by email
    userModel.selectByEmail(data, (error, results) => {
        if (error) {
            console.error("Error finding user:", error);
            res.status(500).json({ error: "Internal server error" });
            return;
        }

        if (results.length == 0) {
            // Don't reveal if email exists or not (security best practice)
            res.status(200).json({ 
                message: "If that email exists, a password reset link has been sent." 
            });
            return;
        }

        const userId = results[0].id;

        // Create reset token
        passwordResetModel.createResetToken({ userId: userId }, (error, resetRecord) => {
            if (error) {
                console.error("Error creating reset token:", error);
                res.status(500).json({ error: "Failed to create reset token" });
                return;
            }

            // TODO: Send email with reset link
            // For now, we'll return the token in development (remove in production)
            // In production, send email with: /reset-password.html?token=${resetRecord.token}
            const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetRecord.token}`;
            
            console.log("Password reset link:", resetUrl);
            
            // In development, return the token for testing
            if (process.env.NODE_ENV !== 'production') {
                res.status(200).json({ 
                    message: "Password reset link generated (check console for development)",
                    resetUrl: resetUrl,
                    token: resetRecord.token
                });
            } else {
                res.status(200).json({ 
                    message: "If that email exists, a password reset link has been sent." 
                });
            }
        });
    });
};

//////////////////////////////////////////////////////
// VERIFY RESET TOKEN
//////////////////////////////////////////////////////

module.exports.verifyResetToken = (req, res, next) => {
    if (req.query.token == undefined) {
        res.status(400).json({ error: "Reset token is required" });
        return;
    }

    const data = {
        token: req.query.token
    };

    passwordResetModel.findValidToken(data, (error, resetRecord) => {
        if (error) {
            console.error("Error verifying token:", error);
            res.status(500).json({ error: "Internal server error" });
            return;
        }

        if (!resetRecord) {
            res.status(400).json({ error: "Invalid or expired reset token" });
            return;
        }

        res.locals.userId = resetRecord.userId;
        res.locals.tokenId = resetRecord.id;
        next();
    });
};

//////////////////////////////////////////////////////
// RESET PASSWORD
//////////////////////////////////////////////////////

module.exports.resetPassword = (req, res, next) => {
    if (req.body.token == undefined || req.body.newPassword == undefined) {
        res.status(400).json({ error: "Token and new password are required" });
        return;
    }

    if (req.body.newPassword.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
    }

    const data = {
        token: req.body.token
    };

    // Verify token first
    passwordResetModel.findValidToken(data, (error, resetRecord) => {
        if (error) {
            console.error("Error verifying token:", error);
            res.status(500).json({ error: "Internal server error" });
            return;
        }

        if (!resetRecord) {
            res.status(400).json({ error: "Invalid or expired reset token" });
            return;
        }

        // Hash the new password using bcrypt
        const bcrypt = require('bcrypt');
        const saltRounds = 10;

        bcrypt.hash(req.body.newPassword, saltRounds, (error, hash) => {
            if (error) {
                console.error("Error hashing password:", error);
                res.status(500).json({ error: "Failed to hash password" });
                return;
            }

            // Update user password
            const userData = {
                userId: resetRecord.userId,
                password: hash
            };

            userModel.updatePassword(userData, (error, results) => {
                if (error) {
                    console.error("Error updating password:", error);
                    res.status(500).json({ error: "Failed to update password" });
                    return;
                }

                // Mark token as used
                passwordResetModel.markTokenAsUsed({ id: resetRecord.id }, (error, result) => {
                    if (error) {
                        console.error("Error marking token as used:", error);
                        // Don't fail the request if this fails
                    }
                    
                    res.status(200).json({ 
                        message: "Password reset successfully. You can now login with your new password." 
                    });
                });
            });
        });
    });
};
