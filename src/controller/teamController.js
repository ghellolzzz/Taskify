const teamModel = require("../models/teamsModel");
const { EMPTY_RESULT_ERROR } = require("../errors");
const { team } = require("../models/prismaClient");

//create a team
module.exports.create=function(req,res){
    const userId=res.locals.userId
    const name=req.body.name
    const description=req.body.description

    return teamModel.createTeam(userId,name,description)
        .then(team=>res.status(201).json(team))
        .catch(err=>res.status(500).json({error:err.message}))
    
}

//add a member
module.exports.addMember=function(req,res){
    const teamId=req.params.teamId;
    const email=req.body.email;

    return teamModel.addMembersByEmail(teamId,email)
        .then(newMember=>res.json(newMember))        .catch(err=>{
              if (err instanceof EMPTY_RESULT_ERROR) {
                return res.status(404).json({ error: err.message });
            }
            if (err.message === "User is already in this team") {
                return res.status(400).json({ error: err.message });
            }
            res.status(500).json({ error: err.message });
      
        })
}

//get teams by user id
module.exports.getMyTeams = function(req,res){
    const userId=res.locals.userId;

    return teamModel.getUserTeams(userId)
        .then(teams=>res.json(teams))
        .catch(err=>res.status(500).json({error:err.message}))
}


//get team details
module.exports.getTeamDetails=function(req,res){
    const userId=res.locals.userId;
    const teamId=parseInt(req.params.teamId)

    return teamModel.getTeamDetails(teamId,userId)
        .then(team=>res.json(team))
        .catch(err=>{
              if (err.message.includes("Access Denied")) {
                return res.status(403).json({ error: err.message });
            }
            if (err instanceof EMPTY_RESULT_ERROR) {
                return res.status(404).json({ error: err.message });
            }
            res.status(500).json({ error: err.message });
        })

}