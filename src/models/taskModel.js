const prisma = require('../models/prismaClient');
const { EMPTY_RESULT_ERROR } = require('../errors');
//User creates a task
module.exports.createTask = function(taskData){
    return prisma.task.create(
       {
        data:taskData
       }
    )
    .then(task=>task)
    .catch(err=>{throw err})
}
//Retrieving all the task by userid
module.exports.retrieveAll= function(userId){
    return prisma.task.findMany({
        where:{userId:userId},
        include:{
            comments:{
                include:{user:true},
                
            },
            category: true ,  // ⬅ ADD THIS
        },
         
        orderBy:{dueDate:'asc'}//shows the tasks by upcoming to ltr
    })

}

//retrive task by id
module.exports.retrieveById=function(taskId,userId){
    return prisma.task.findFirst({
        where:{id:taskId,userId:userId},
        include:{
            comments:{
                include:{
                    user:true,
        
                }
            },
               category: true   // ⬅ ADD THIS
        }
    })
    .then(task=>{
        if(!task){
            throw new EMPTY_RESULT_ERROR(`Task ${taskId} not found`)
        }
        return task;
    })
}

//User updates task
module.exports.updateTask=function(taskId,userId,data){
       if (data.dueDate) {
        data.dueDate = new Date(data.dueDate).toISOString();
    }

     if (data.completedAt) {
        data.completedAt = new Date(data.completedAt).toISOString();
    }


        return prisma.task.updateMany({
            where:{id:taskId,userId:userId},
            data:data
            
        })
        .then(result=>{
            if(result.count==0){
                throw new EMPTY_RESULT_ERROR(`Task ${taskId} not found`);
            }
            return result;
        })
}

//user deletes task
module.exports.deleteTask=function (taskId,userId){
    return prisma.task.deleteMany({
        where:{id:taskId,userId:userId}
    })
    .then(result=>{
        if(result.count==0){
            throw new EMPTY_RESULT_ERROR(`Task ${taskId} not found`)
        }
        return result;
    })
}

//flitering tasks

module.exports.filterTasks=function(userId,filters){
    
    const where={userId:userId}
    //filter by status
    if (filters.status){
        where.status=filters.status
    }
    //filter by priority
    if(filters.priority){
        where.priority=filters.priority
    }
    //filters by due date

if(filters.fromDate || filters.toDate){
    where.dueDate = {}

    if(filters.fromDate){
        where.dueDate.gte = new Date(filters.fromDate);
    }

    if(filters.toDate){
        where.dueDate.lte = new Date(filters.toDate)
    }
}

    return prisma.task.findMany({
        where,
        include:{
            comments:{
                include:{user:true}

            },
            category: true   // ⬅ ADD THIS
        },
        orderBy:{dueDate:"asc"}
    })
    .then(tasks=>tasks)
    .catch(err=>{throw err})
}