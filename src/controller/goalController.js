const goalModel = require("../models/goalModel");
const { EMPTY_RESULT_ERROR } = require("../errors");



//creating goal
module.exports.create=function(req,res){
    const userId=res.locals.userId;

    const body={
        title:req.body.title,
        description:req.body.description || null,
        completed:false,
        category:req.body.category || null,
        userId
    }

    return goalModel.createGoal(body)
        .then(goal=>res.json({goal}))
        .catch(err=>res.status(500).json({error:err.message}))
}

//retrieving goals
module.exports.retrieveAll=function(req,res){
    const userId = res.locals.userId

    const filters={
        completed:req.query.completed,
        category:req.query.category,
        sortBy:req.query.sortBy
    }

    return goalModel.retrieveAll(userId,filters)
        .then(goals=>res.json({goals}))
        .catch(err=>res.status(500).json({error:err.message}))
}

//retrieve by id
module.exports.retrieveById = function(req,res){
    const goalId = parseInt(req.params.id)
    const userId= res.locals.userId

    return goalModel.retrieveById(goalId,userId)
        .then(goal=>res.json({goal}))
        .catch(err=>{
            if(err instanceof EMPTY_RESULT_ERROR){
                return res.status(404).json({error:err.message})
            }
            res.status(500).json({error:err.message})
        })
}

//update goal
module.exports.update=function(req,res){
    const goalId= parseInt(req.params.id);
    const userId = res.locals.userId
    

    const updateData= {
        title:req.body.title,
        description:req.body.description,
        completed:req.body.completed,
        category:req.body.category

    }

    return goalModel.updateGoal(goalId,userId,updateData)
        .then(()=>res.json({message:"Goal updated"}))
        .catch(err=>{
            if(err instanceof EMPTY_RESULT_ERROR){
                return res.status(404).json({error:err.message})
            }
            res.status(500).json({error:err.message})
        })
}

//delete goal

module.exports.delete=function(req,res){
    const goalId= parseInt(req.params.id)
    const userId= res.locals.userId

    return goalModel.deleteGoal(goalId,userId)
        .then(()=>res.json({message:"Goal deleted"}))
        .catch(err=>{
            if(err instanceof EMPTY_RESULT_ERROR){
                res.status(404).json({error:err.message})
            }
            res.status(500).json({error:err.message})
        })
}

//progress bar
module.exports.progress=function(req,res){
    const userId= res.locals.userId

    return goalModel.progress(userId)
        .then(data=>res.json(data))
        .catch(err=>res.status(500).json({error:err.message}))
}