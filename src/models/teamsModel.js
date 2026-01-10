
const prisma = require("../models/prismaClient");
const { EMPTY_RESULT_ERROR } = require("../errors");

//creating a team
module.exports.createTeam = function(userId,name,description){
    return prisma.team.create({
        data:{
            name:name,
            description:description,
            members:{
                create:{
                    userId:userId,
                    role:'OWNER'
                }
            }
        }
    })
    .then(team=>team);
}

//adding members to team (by email)
module.exports.addMembersByEmail= function(teamId,email){

    //finding user by email
    return prisma.user.findUnique({
        where:{
            email:email
        }
    })
    .then(user=>{
        if(!user){
            throw new EMPTY_RESULT_ERROR(`User with email ${email} not found`)
        }

        //check if they are already in the team
    return prisma.teamMember.findUnique({
            where:{
                userId_teamId:{
                    userId:user.id,
                    teamId:parseInt(teamId)

                }
            }
        })
        .then(existingMember=>{
            if(existingMember){
                throw new Error("User is already in this team")
            }
            //adding them to the team
            return prisma.teamMember.create({
                data:{
                    userId:user.id,
                    teamId:parseInt(teamId),
                    role:'MEMBER'
                },
                include:{
                    user:true
                }
            })
        })
    
    })
}

//getting all teams by user id
module.exports.getUserTeams = function(userId){
    return prisma.team.findMany({
        where:{
            members:{
                some:{userId:userId}
            }
        },
        include:{
            _count:{
                select:{members:true,tasks:true}
            }
        },
        orderBy:{createdAt:'desc'}

    })
}

//getting the team details
module.exports.getTeamDetails=function(teamId,userId){
    
    //check if the member is part of the team
    return prisma.teamMember.findUnique({
        where:{
            userId_teamId:{
                userId:userId,
                teamId:teamId
            }
        }
    })
    .then(membership=>{
        if(!membership){
            throw new Error("Access denied: You are not a member of this team")
        }

        return prisma.team.findUnique({
            where:{
                id:teamId
            },
             include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true } }
                    }
                },
                tasks: {
                    include: {
                        user: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })
    })
    .then(team=>{
        if(!team){
            throw new EMPTY_RESULT_ERROR("Team not found")
        }
        return team;
    })
}