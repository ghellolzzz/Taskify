const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports.upsertSettings = (userId, theme, drink, color) => {
    return prisma.userFocusSetting.upsert({
        where: { userId: Number(userId) },
        update: { 
            preferredTheme: theme, 
            preferredDrink: drink, 
            backgroundColor: color 
        },
        create: { 
            userId: Number(userId), 
            preferredTheme: theme, 
            preferredDrink: drink, 
            backgroundColor: color 
        }
    });
};

module.exports.getSettings = (userId) => {
    return prisma.userFocusSetting.findUnique({
        where: { userId: Number(userId) }
    });
};

module.exports.logSession = (userId, minutes, status) => {
    return prisma.focusSession.create({
        data: {
            userId: Number(userId),
            durationMinutes: Number(minutes),
            status: status
        }
    });
};