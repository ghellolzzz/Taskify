const taskModel = require("../models/taskModel");
const activityLog=require("../models/activityLogModel")
const { EMPTY_RESULT_ERROR } = require('../errors');


//user creating a task
module.exports.create = function(req, res) {
    const userId = res.locals.userId; 
    
  
    let assigneeIds = req.body.assigneeIds || [];
    if (assigneeIds.length === 0) {
        assigneeIds = [userId]
    }

    const taskData = {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority || "Medium",
        status: "Pending",
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        userId: userId,
        teamId: req.body.teamId ? parseInt(req.body.teamId) : null,
        categoryId: req.body.categoryId || null,

        
        assignees: {
            connect: assigneeIds.map(id => ({ id: parseInt(id) }))
        }
    };

     return taskModel.createTask(taskData)
        .then(task => {
            if (task.teamId) {
                activityLog.createLog(task.teamId, userId, 'CREATE_TASK', task.title);
            }
            res.status(201).json({ task });
        })
        .catch(err => res.status(500).json({ error: err.message }));
};
//retrieving user tasks
module.exports.retrieveAll=function(req,res){
    const userId= res.locals.userId
    return taskModel.retrieveAll(userId)
    .then(tasks=>res.json({tasks}))
    .catch(err=>res.status(500).json({error:err.messaage}))
}

//retrive task by id
module.exports.retrieveById=function(req,res){
    const taskId= parseInt(req.params.id)
    const userId= res.locals.userId
    console.log("TASK ID PARAM:", req.params.id)


    return taskModel.retrieveById(taskId,userId)
        .then(task=>res.json({task}))
        .catch(err=>{
            if(err instanceof EMPTY_RESULT_ERROR){
                return res.status(404).json({error:err.message})
            
            }
            res.status(500).json({error:err.message})
        })
}
//updating task
module.exports.update = function(req, res) {
    const taskId = parseInt(req.params.id)
   
    const updateData = {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        status: req.body.status,
        completedAt: req.body.completedAt,
        categoryId: req.body.categoryId ?? null
    };

    
    if (req.body.assigneeIds) {
        updateData.assignees = {
            set: req.body.assigneeIds.map(id => ({ id: parseInt(id) }))
        };
    }

   
    return taskModel.updateTask(taskId, updateData)
       .then(()=>{
            return taskModel.retrieveById(taskId,res.locals.userId)
       })
       .then(task=>{
        if(task.teamId && req.body.status){
             const details = `status of "${task.title}" to ${req.body.status}`;
               activityLog.createLog(task.teamId, res.locals.userId, 'UPDATE_STATUS', details);
        }
        res.json({message:"Task Updated"})
       })
        .catch(err => res.status(500).json({ error: err.message }))
};
//deleting a task
module.exports.delete=function(req,res){
    const taskId=parseInt(req.params.id)
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

//filtering tasks
module.exports.filter=function(req,res){
    const userId = res.locals.userId;
    const filters={
        priority:req.query.priority || null,
        status:req.query.status || null,
        fromDate: req.query.fromDate || null,
        toDate:req.query.toDate || null
    }

    return taskModel.filterTasks(userId,filters)
        .then(tasks=>res.json({tasks}))
        .catch(err=>{
            res.status(500).json({error:err.message})
        })
}





