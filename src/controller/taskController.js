const taskModel = require("../models/taskModel");
const { EMPTY_RESULT_ERROR } = require('../errors');


const MOCK_USER_ID =1

//user creating a task
module.exports.create = function(req,res){
    const taskData={
        title:req.body.title,
        description:req.body.description || null,
        priority:req.body.priority || "Medium",
        status:"Pending",
        dueDate:req.body.dueDate ? new Date(req.body.dueDate):null,
        userId:MOCK_USER_ID,
        categoryId:req.body.categoryId||null

    }
    return taskModel.createTask(taskData)
    .then(task=>res.json({task}))
    .catch(err=>res.status(500).json({error:err.messaage}))
}

//retrieving user tasks
module.exports.retrieveAll=function(req,res){
    return taskModel.retrieveAll(MOCK_USER_ID)
    .then(tasks=>res.json({tasks}))
    .catch(err=>res.status(500).json({error:err.messaage}))
}

//retrive task by id
module.exports.retrieveById=function(req,res){
    const taskId= parseInt(req.params.id);

    return taskModel.retrieveById(taskId,MOCK_USER_ID)
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

    return taskModel.updateTask(taskId,MOCK_USER_ID,req.body)
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
    
    return taskModel.deleteTask(taskId,MOCK_USER_ID)
        .then(()=>res.json({message:"Task deleted"}))
        .catch(err=>{
            if(err instanceof EMPTY_RESULT_ERROR){
                return res.status(404).json({error:err.message})
            }
            res.status(500).json({error:err.message})        
        })
}





