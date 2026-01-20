//////////////////////////////////////////////////////
// REQUIRE MODULES
//////////////////////////////////////////////////////

const prisma = require('./prismaClient');
const crypto = require('crypto');

//////////////////////////////////////////////////////
// CREATE PASSWORD RESET TOKEN
//////////////////////////////////////////////////////

module.exports.createResetToken = (data, callback) => {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    prisma.passwordReset.create({
        data: {
            userId: data.userId,
            token: token,
            expiresAt: expiresAt
        },
        select: {
            id: true,
            userId: true,
            token: true,
            expiresAt: true,
            createdAt: true
        }
    })
    .then((resetRecord) => {
        callback(null, resetRecord);
    })
    .catch((error) => {
        callback(error, null);
    });
};

//////////////////////////////////////////////////////
// FIND VALID RESET TOKEN
//////////////////////////////////////////////////////

module.exports.findValidToken = (data, callback) => {
    const now = new Date();
    
    prisma.passwordReset.findFirst({
        where: {
            token: data.token,
            used: false,
            expiresAt: {
                gt: now
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true
                }
            }
        }
    })
    .then((resetRecord) => {
        if (!resetRecord) {
            callback(null, null);
        } else {
            callback(null, resetRecord);
        }
    })
    .catch((error) => {
        callback(error, null);
    });
};

//////////////////////////////////////////////////////
// MARK TOKEN AS USED
//////////////////////////////////////////////////////

module.exports.markTokenAsUsed = (data, callback) => {
    prisma.passwordReset.update({
        where: {
            id: data.id
        },
        data: {
            used: true
        }
    })
    .then((resetRecord) => {
        callback(null, resetRecord);
    })
    .catch((error) => {
        callback(error, null);
    });
};

//////////////////////////////////////////////////////
// DELETE EXPIRED TOKENS (CLEANUP)
//////////////////////////////////////////////////////

module.exports.deleteExpiredTokens = (callback) => {
    const now = new Date();
    
    prisma.passwordReset.deleteMany({
        where: {
            OR: [
                { expiresAt: { lt: now } },
                { used: true }
            ]
        }
    })
    .then((result) => {
        callback(null, result.count);
    })
    .catch((error) => {
        callback(error, null);
    });
};
