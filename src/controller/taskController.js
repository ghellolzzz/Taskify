const taskModel = require("../models/taskModel");
const { EMPTY_RESULT_ERROR } = require('../errors');


//user creating a task
module.exports.create = function(req,res){
    const userId=res.locals.userId
    const taskData={
        title:req.body.title,
        description:req.body.description || null,
        priority:req.body.priority || "Medium",
        status:"Pending",
        dueDate:req.body.dueDate ? new Date(req.body.dueDate):null,
        userId:userId,
        categoryId:req.body.categoryId||null

    }
    return taskModel.createTask(taskData)
    .then(task=>res.json({task}))
    .catch(err=>res.status(500).json({error:err.messaage}))
}

//retrieving user tasks
module.exports.retrieveAll=function(req,res){
    const userId= res.locals.userId
    return taskModel.retrieveAll(userId)
    .then(tasks=>res.json({tasks}))
    .catch(err=>res.status(500).json({error:err.messaage}))
}

//retrive task by id
module.exports.retrieveById=function(req,res){
    const taskId= parseInt(req.params.id);
    const userId= res.locals.userId

    return taskModel.retrieveById(taskId,userId)
        .then(task=>res.json({task}))
        .catch(err=>{
            if(err instanceof EMPTY_RESULT_ERROR){
                return res.status(404).json({error:err.message});
            
            }
            res.status(500).json({error:err.message});
        })
}
//updating task
module.exports.update=function(req,res){
    const taskId=parseInt(req.params.id);
    const userId =res.locals.userId

    return taskModel.updateTask(taskId,userId,req.body)
    .then(()=>res.json({message:"Task Updated"}))
    .catch(err=>{
        if(err instanceof EMPTY_RESULT_ERROR){
            return res.status(404).json({error:err.message});
        }
        res.status(500).json({error:err.message})
    })
}

//deleting a task
module.exports.delete=function(req,res){
    const taskId=parseInt(req.params.id);
    const userId=res.locals.userId
    
    return taskModel.deleteTask(taskId,userId)
        .then(()=>res.json({message:"Task deleted"}))
        .catch(err=>{
            if(err instanceof EMPTY_RESULT_ERROR){
                return res.status(404).json({error:err.message})
            }
            res.status(500).json({error:err.message})        
        })
}





