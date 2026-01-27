const teamModel = require("../models/teamsModel");
const { EMPTY_RESULT_ERROR } = require("../errors");
const { team } = require("../models/prismaClient");
const activityLog=require("../models/activityLogModel")

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
    const inviterId = res.locals.userId;

    return teamModel.addMembersByEmail(teamId,email,inviterId)
         .then(newMember => {
            activityLog.createLog(teamId, inviterId, 'ADD_MEMBER', newMember.user.name)
            res.json(newMember)
        })
        .catch(err=>{
              if (err instanceof EMPTY_RESULT_ERROR) {
                return res.status(404).json({ error: err.message });
            }
             if (err instanceof EMPTY_RESULT_ERROR || err.message.includes("yourself") || err.message.includes("already")) {
                return res.status(400).json({ error: err.message });
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

//getting team statistics
module.exports.getTeamStats = function(req, res) {
    const teamId = req.params.teamId;

    return teamModel.getTeamStats(teamId)
        .then(stats => res.json(stats))
        .catch(err => res.status(500).json({ error: err.message }));
};

//getting pending invites
module.exports.getPendingInvites = function(req, res) {
    const userId = res.locals.userId

    return teamModel.getPendingInvites(userId)
        .then(invites => res.json(invites))
        .catch(err => res.status(500).json({ error: err.message }))
};

//responding to invites
module.exports.respondToInvite = function(req, res) {
    const userId = res.locals.userId;
    const teamId=req.params.teamId
    const status=req.body.status

    return teamModel.respondToInvite(teamId, userId, status)
        .then(() => res.json({ message: `Invite ${status.toLowerCase()}`  }))
        .catch(err => res.status(500).json({ error: err.message }));
};

//deleting team
module.exports.deleteTeam = function(req, res) {
    const teamId= req.params.teamId;
    const userId = res.locals.userId;

    return teamModel.deleteTeam(teamId, userId)
        .then(() => res.json({ message: "Team deleted successfully" }))
        .catch(err => res.status(403).json({ error: err.message }));
};



//updating team
module.exports.updateTeam = function(req, res) {
    const teamId = req.params.teamId;
    const userId = res.locals.userId;
    const { name, description } = req.body;

    return teamModel.updateTeam(teamId, userId, { name, description })
        .then(updatedTeam => res.json(updatedTeam))
        .catch(err => res.status(403).json({ error: err.message }));
};



//removing memmber
module.exports.removeMember = function(req, res) {
    const userId=req.params.userId;
    const teamId=req.params.teamId
    const removerId = res.locals.userId;

    return teamModel.removeMember(teamId, userId, removerId)
        .then(() => {
            activityLog.createLog(teamId, removerId, 'REMOVE_MEMBER', `user ID ${userId}`);
            res.json({ message: "Member removed successfully" });
        })
        .catch(err => res.status(403).json({ error: err.message }));
};


//leaving team
module.exports.leaveTeam = function(req, res) {

    const teamId= req.params.teamId;
   const userName=res.locals.name;
    const userId = res.locals.userId;

   
    return teamModel.leaveTeam(teamId, userId)
        .then(() => {
           
            activityLog.createLog(teamId, userId, 'LEAVE_TEAM', userName); 
            res.json({ message: "You have successfully left the team" });
        })
        .catch(err => {
           
            res.status(403).json({ error: err.message });
        });
};

//get activity
module.exports.getActivity = function(req, res) {
    const teamId=req.params.teamId
    return activityLog.getByTeam(teamId)
        .then(logs => res.json(logs))
        .catch(err => res.status(500).json({ error: err.message }));
};