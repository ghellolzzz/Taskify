const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports.createFeedback = (data) => {
    return prisma.feedback.create({
        data: {
            type: data.type,
            description: data.description,
        }
    })
    .then((result) => {
        return result;
    })
    .catch((err) => {
        console.error("Prisma Error in createFeedback:", err);
        throw new Error("Database error during feedback submission.");
    });
};