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
    const pointsEarned = status === 'COMPLETED' ? 50 : 0;

    return prisma.$transaction([
        // Create the history log
        prisma.focusSession.create({
            data: {
                userId: Number(userId),
                durationMinutes: Number(minutes),
                status: status
            }
        }),
        
        // Deposit the Beans
        prisma.user.update({
            where: { id: Number(userId) },
            data: { 
                points: { increment: pointsEarned } 
            }
        })
    ]);
};