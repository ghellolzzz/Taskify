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
                include:{user:true}
            }
        },
        orderBy:{createdAt:'desc'}
    })

}

//User updates task
module.exports.updateTask=function(taskId,userId,data){
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