const commentsModel = require("../models/commentsModel")
const {EMPTY_RESULT_ERROR}= require("../errors")
const prisma = require('../models/prismaClient');
const activityLog = require("../models/activityLogModel");

//user creates a commment
module.exports.create = function(req,res){
    const userId= res.locals.userId
    const content = req.body.content
    const taskId= parseInt(req.params.taskId)

    if(!content || content.trim() === ""){ 
        return res.status(400).json({error:"comments cannot be empty"})
    }

    
    return commentsModel.createComment(content, userId, taskId)
        .then(comment => {
          
            return prisma.task.findUnique({
                where: { id: taskId },
                select: { title: true, teamId: true }
            })
            .then(task => {
               
                if (task && task.teamId) {
                    const details = `on task "${task.title}"`;
                    activityLog.createLog(task.teamId, userId, 'POST_COMMENT', details);
                }
                
                
                return res.json({message:"comment added",comment});
            });
        })
        .catch(err=>res.status(500).json({error:err.message}))
}
// gets the comments for task
module.exports.retrieve=function(req,res){
    const taskId=parseInt(req.params.taskId);

    return commentsModel.getComments(taskId)
        .then(comments=>res.json({comments}))
        .catch(err=>res.status(500).json({error:err.message}))
}

//delete comment
module.exports.delete = function(req,res){
    const userId= res.locals.userId;
    const commentId = parseInt(req.params.commentId);


    return commentsModel.deleteComment(commentId,userId)
        .then(()=>{
            res.json({message:"comment deleted"})
        })
        .catch(err=>{
            if(err instanceof EMPTY_RESULT_ERROR){
                return res.status(403).json({error:err.message})
            }
            res.status(500).json({error:err.message})
        })
}