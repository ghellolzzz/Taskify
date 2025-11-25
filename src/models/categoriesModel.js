const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports.getAllCategories = (userId) => {
    return prisma.category.findMany({
        where: { userId: Number(userId) },
        include: {
            _count:{select: {tasks: true}}
        }
    });
};

module.exports.createCategory = (data) => {
    return prisma.category.create({
        data: {
            name: data.name,
            color: data.color,
            userId: Number(data.userId)
        }
    })
    .then((result) => {
        return result;
    })
    .catch((err) => {
        throw err;
    });
};

module.exports.updateCategory = ({ id, name, color }) => {
    return prisma.category.update({
        where: { id: Number(id) },
        data: { 
            name,
            ...(color ? { color } : {}) // only update color if provided
        }
    });
};

module.exports.deleteCategory = (id) => {
    return prisma.category.delete({
        where: { id: Number(id) }
    });
};