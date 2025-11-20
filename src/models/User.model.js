//////////////////////////////////////////////////////
// REQUIRE MODULES
//////////////////////////////////////////////////////

const prisma = require('./prismaClient');

//////////////////////////////////////////////////////
// CHECK IF EMAIL EXISTS
//////////////////////////////////////////////////////

module.exports.checkEmailExists = (data, callback) => {
    prisma.user.findUnique({
        where: { email: data.email },
        select: {
            id: true,
            email: true,
        },
    })
        .then((user) => {
            callback(null, user !== null);
        })
        .catch((error) => {
            callback(error, null);
        });
};

//////////////////////////////////////////////////////
// SELECT USER BY EMAIL
//////////////////////////////////////////////////////

module.exports.selectByEmail = (data, callback) => {
    prisma.user.findUnique({
        where: { email: data.email },
        select: {
            id: true,
            name: true,
            email: true,
            password: true,
            createdAt: true,
        },
    })
        .then((user) => {
            if (!user) {
                // Return empty array to match callback pattern (let controller handle 404)
                callback(null, []);
            } else {
                // Return as array to match callback pattern
                callback(null, [user]);
            }
        })
        .catch((error) => {
            callback(error, null);
        });
};

//////////////////////////////////////////////////////
// INSERT NEW USER
//////////////////////////////////////////////////////

module.exports.addUser = (data, callback) => {
    prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: data.password,
        },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
        },
    })
        .then((user) => {
            // Return as array to match callback pattern
            callback(null, [user]);
        })
        .catch((error) => {
            callback(error, null);
        });
};
