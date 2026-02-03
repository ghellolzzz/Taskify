const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all themes
module.exports.getAllThemes = () => {
    return prisma.theme.findMany();
};

// Get users inventory
module.exports.getUserInventory = (userId) => {
    return prisma.user.findUnique({
        where: { id: Number(userId) },
        select: {
            points: true,
            ownedThemes: {
                include: { theme: true }
            },
            focusSettings: {
                select: { preferredTheme: true }
            }
        }
    });
};

// Buy a theme
module.exports.purchaseTheme = async (userId, themeId) => {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: Number(userId) } });
        const theme = await tx.theme.findUnique({ where: { id: Number(themeId) } });

        if (!theme) throw new Error("Theme not found.");
        if (user.points < theme.cost) throw new Error("Not enough points!");

        const existing = await tx.userOwnedTheme.findFirst({
            where: { userId: Number(userId), themeId: Number(themeId) }
        });
        if (existing) throw new Error("You already own this!");
        await tx.user.update({
            where: { id: Number(userId) },
            data: { points: { decrement: theme.cost } }
        });

        return tx.userOwnedTheme.create({
            data: {
                userId: Number(userId),
                themeId: Number(themeId)
            }
        });
    });
};

// Equip a theme
module.exports.equipTheme = async (userId, themeClass) => {
    return prisma.userFocusSetting.upsert({
        where: { userId: Number(userId) },
        update: { preferredTheme: themeClass },
        create: { 
            userId: Number(userId),
            preferredTheme: themeClass 
        }
    });
};