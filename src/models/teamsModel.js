
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
                    role:'OWNER',
                    status: 'ACCEPTED' 
                }
            }
        }
    })
    .then(team=>team);
}

//adding members to team (by email)
module.exports.addMembersByEmail = function(teamId, email, inviterId) { 
    return prisma.user.findUnique({
        where: { email: email }
    })
    .then(user => {
        if (!user) {
            throw new EMPTY_RESULT_ERROR(`User with email ${email} not found`);
        }

        if (user.id === inviterId) {
            throw new Error("You cannot invite yourself to the team.");
        }
       
        return prisma.teamMember.findFirst({ 
            where: {
                userId: user.id,
                teamId: parseInt(teamId)
            }
        })
        .then(existingMember => {
            if (existingMember) {
               
                if (existingMember.status === 'ACCEPTED') {
                    throw new Error(`${user.name} is already a member of this team.`)
                }
                if (existingMember.status === 'PENDING') {
                    throw new Error(`An invitation has already been sent to ${user.name}.`)
                }
            }
           
            return prisma.teamMember.create({
                data: {
                    userId: user.id,
                    teamId: parseInt(teamId),
                    role: 'MEMBER',
                    status: 'PENDING'
                },
                include: { user: true }
            });
        });
    });
};

    
//getting all teams by user id
module.exports.getUserTeams = function(userId){
    return prisma.team.findMany({
        where:{
            members:{
                some:{
                    userId:userId,
                    status: 'ACCEPTED'

                }
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
module.exports.getTeamDetails = function (teamId, userId) {
    return prisma.teamMember.findUnique({
        where: { userId_teamId: { userId, teamId } }
    })
        .then(membership => {
            if (!membership) throw new Error("Access denied: You are not a member of this team");

           
            return prisma.team.findUnique({
                where: { id: teamId },
                include: {
                    members: {
                       
                        where: {
                            status: 'ACCEPTED'
                        },
                     
                        include: {
                            user: { select: { id: true, name: true, email: true, avatarUrl: true } }
                        }
                    },
                    tasks: {
                        include: {
                            user: { select: { name: true } },
                            assignees: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        },
                         orderBy: {
                        dueDate: {
                            sort: 'asc',     
                            nulls: 'last'    
                        }
                    }   
                    }
                }
            });
        })
        .then(team => {
            if (!team) throw new EMPTY_RESULT_ERROR("Team not found");
            return team;
        });
};
//getting team statistics
module.exports.getTeamStats = function(teamId) {
    return prisma.task.groupBy({
        by: ['status'],             
        where: { teamId: parseInt(teamId) },
        _count: { _all: true }      
    })
    .then(stats => {
       //formatting the statistics
        const formatted = { Pending: 0, "In Progress": 0, Completed: 0 };
        stats.forEach(s => formatted[s.status] = s._count._all);
        return formatted;
    });
};
//getting pending invitations
module.exports.getPendingInvites = function(userId) {
    return prisma.teamMember.findMany({
        where: {
            userId: userId,
            status: 'PENDING'
        },
        include: {
            team: true 
        }
    })
}

//updating status of the invite
module.exports.respondToInvite = function(teamId, userId, newStatus) {
    if (newStatus !== 'ACCEPTED' && newStatus !== 'REJECTED') {
        throw new Error("Invalid status update.")
    }

    // First, verify the invitation exists and is PENDING
    return prisma.teamMember.findUnique({
        where: {
            userId_teamId: {
                userId: userId,
                teamId: parseInt(teamId)
            }
        }
    })
    .then(member => {
        if (!member) {
            throw new Error("Invitation not found.");
        }
        if (member.status !== 'PENDING') {
            throw new Error("This invitation has already been processed.")
        }
        
        // Now update the status
        return prisma.teamMember.update({
            where: {
                userId_teamId: {
                    userId: userId,
                    teamId: parseInt(teamId)
                }
            },
            data: {
                status: newStatus
            }
        });
    });
};

module.exports.deleteTeam = function(teamId, userId) {

    return prisma.teamMember.findFirst({
        where: {
            teamId: parseInt(teamId),
            userId: userId,
            role: 'OWNER'
        }
    })
    .then(member => {
        if (!member) {
            throw new Error("Permission Denied: Only the team owner can delete the team.")
        }
      
        return prisma.team.delete({
            where: { id: parseInt(teamId) }
        });
    });
};



// Add this to teamsModel.js
module.exports.updateTeam = function(teamId, userId, data) {
    // verify the user is the OWNER
    return prisma.teamMember.findFirst({
        where: {
            teamId: parseInt(teamId),
            userId: userId,
            role: 'OWNER'
        }
    })
    .then(member => {
        if (!member) {
            throw new Error("Permission Denied: Only the team owner can edit the team.");
        }
        //  proceed with update
        return prisma.team.update({
            where: { id: parseInt(teamId) },
            data: {
                name: data.name,
                description: data.description
            }
        });
    });
};

module.exports.removeMember = async function(teamId, userIdToRemove, removerId) {
    teamId = parseInt(teamId);
    userIdToRemove = parseInt(userIdToRemove);

    const remover = await prisma.teamMember.findFirst({
        where: {
            teamId,
            userId: removerId,
            role: 'OWNER'
        }
    });

    if (!remover) {
        throw new Error("Permission Denied: Only the team owner can remove members.");
    }

    if (remover.userId === userIdToRemove) {
        throw new Error("Owners cannot remove themselves.");
    }

   
    const tasks = await prisma.task.findMany({
        where: {
            teamId,
            assignees: {
                some: { id: userIdToRemove }
            }
        },
        select: { id: true }
    });

    //transaction
    return prisma.$transaction([
        // Remove team membership
        prisma.teamMember.delete({
            where: {
                userId_teamId: {
                    userId: userIdToRemove,
                    teamId
                }
            }
        }),

        // Unassign user from each task
        ...tasks.map(task =>
            prisma.task.update({
                where: { id: task.id },
                data: {
                    assignees: {
                        disconnect: { id: userIdToRemove }
                    }
                }
            })
        )
    ]);
};



//leave the team
module.exports.leaveTeam = async function(teamId, userId) {
    teamId = parseInt(teamId)

    const member = await prisma.teamMember.findFirst({
        where: { teamId, userId }
    });

    if (!member) {
        throw new Error("You are not a member of this team.")
    }

    if (member.role === 'OWNER') {
        throw new Error("Owners cannot leave a team.")
    }

    const tasks = await prisma.task.findMany({
        where: {
            teamId,
            assignees: {
                some: { id: userId }
            }
        },
        select: { id: true }
    });

    return prisma.$transaction([
        prisma.teamMember.delete({
            where: {
                userId_teamId: {
                    userId,
                    teamId
                }
            }
        }),

        ...tasks.map(task =>
            prisma.task.update({
                where: { id: task.id },
                data: {
                    assignees: {
                        disconnect: { id: userId }
                    }
                }
            })
        )
    ]);
};



