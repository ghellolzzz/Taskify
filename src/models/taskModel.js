const prisma = require('../models/prismaClient');
const { EMPTY_RESULT_ERROR } = require('../errors');

//create task
module.exports.createTask = function (taskData) {
    return prisma.task.create({
        data: taskData
    })
    .then(task => task)
    .catch(err => { throw err })
};

//retrieving all
module.exports.retrieveAll = function (userId) {
    return prisma.task.findMany({
        where: {
            OR: [
                { userId: userId },                     
                { assignees: { some: { id: userId } } }  
            ]
        },
        include: {
            comments: { include: { user: true } },
            category: true,  
            assignees: { select: { id: true, name: true } } 
        },
        orderBy: { dueDate: 'asc' }
    });
};


//retrieving tasks
module.exports.retrieveById = function (taskId, userId) {
    return prisma.task.findFirst({
        where: {
            
            id: taskId, 
   
            
         
            OR: [
                { userId: userId },
                { assignees: { some: { id: userId } } },
               
                { team: { members: { some: { userId: userId } } } }
            ]
        },
        include: {
            comments: { include: { user: true } },
            category: true,
            assignees: { select: { id: true, name: true } }
        }
    })
    .then(task => {
        if (!task) {
            throw new EMPTY_RESULT_ERROR(`Task ${taskId} not found or permission denied`);
        }
        return task
    });
};

//updating tasks
module.exports.updateTask = function (taskId, data) {
  
    if (data.dueDate) data.dueDate = new Date(data.dueDate).toISOString()
    if (data.completedAt) data.completedAt = new Date(data.completedAt).toISOString()

    return prisma.task.update({
        where: { id: taskId },
        data: data
    })
    .then(result => result)
    .catch(error => {
        if (error.code === 'P2025') { 
            throw new EMPTY_RESULT_ERROR(`Task ${taskId} not found`);
        }
        throw error;
    });
};


//deleting tasks
module.exports.deleteTask = function (taskId, userId) {
    return prisma.task.deleteMany({
        where: { 
            id: taskId,
           
            OR: [
                { userId: userId }, 
                { 
                    team: {
                        members: {
                            some: { userId: userId } 
                        }
                    }
                }
            ]
        }
    })
    .then(result => {
        if (result.count == 0) {
            throw new EMPTY_RESULT_ERROR(`Task ${taskId} not found or permission denied`);
        }
        return result;
    });
};

//filtering tasks
module.exports.filterTasks = function (userId, filters) {
   
    const where = {
        OR: [
            { userId: userId },
            { assignees: { some: { id: userId } } }
        ]
    };

    if (filters.status) where.status = filters.status
    if (filters.priority) where.priority = filters.priority
    if (filters.fromDate || filters.toDate) {
        where.dueDate = {};
        if (filters.fromDate) where.dueDate.gte = new Date(filters.fromDate)
        if (filters.toDate) where.dueDate.lte = new Date(filters.toDate)
    }

    return prisma.task.findMany({
        where,
        include: {
            comments: { include: { user: true } },
            category: true,
            assignees: { select: { id: true, name: true } } 
        },
        orderBy: { dueDate: "asc" }
    })
    .then(tasks => tasks)
    .catch(err => { throw err })
};