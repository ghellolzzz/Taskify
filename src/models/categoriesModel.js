const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports.getAllCategories = (userId) => {
    return prisma.category.findMany({
        where: { userId: Number(userId) },
        include: {
            _count:{ select: { tasks:true }}
        }
    });
};

module.exports.createCategory = (data) => {
    return prisma.category.create({
        data: {
            name: data.name,
            userId: Number(data.userId)
        }
    });
};

module.exports.updateCategory = ({ id, name }) => {
    return prisma.category.update({
        where: { id: Number(id) },
        data: {
            name,
        }
    });
};

module.exports.deleteCategory = (id) => {
    return prisma.category.delete({
        where: { id: Number(id) }
    });
};
