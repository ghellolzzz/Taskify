const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { EMPTY_RESULT_ERROR } = require("../errors");

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

module.exports.updateCategory = ({ id, name, color, userId }) => {
    return prisma.category.update({
        where: { 
            id: Number(id),
            userId: Number(userId)
        },
        data: { 
            name,
            ...(color ? { color } : {}) // only update color if provided
        }
    }).then(result => result)
    .catch(err => {
       
        throw err;
    });
};

module.exports.deleteCategory = (id, userId) => {
    return prisma.category.delete({
        where: {
            id: Number(id),
            userId: Number(userId)
         }
    }).then(result => {
        if (result.count === 0) {
            throw new EMPTY_RESULT_ERROR("Category not found or access denied.");
        }
        return result;
    })
    .catch(err => {
        throw err;
    });
};

module.exports.getTasksByCategory = (categoryId, userId) => {
  return prisma.task.findMany({
    where: {
      categoryId: Number(categoryId),
      userId: Number(userId)
    }
  })
  .then(tasks => tasks)
  .catch(err => { throw err });
};
