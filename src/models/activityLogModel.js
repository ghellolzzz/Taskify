const prisma = require("./prismaClient");

module.exports.createLog = function(teamId, userId, actionType, details = null) {
  //safety checks
    if (!teamId || !userId || !actionType) {
        console.error("Attempted to create a log with missing data.", { teamId, userId, actionType });
        return; 
    }

   //creating the activty log
    prisma.activityLog.create({
        data: {
            teamId: parseInt(teamId),
            userId: userId,
            actionType: actionType,
            details: details
        }
    }).catch(err => {
      
        console.error("Failed to create activity log entry:", err);
    });
};



module.exports.getByTeam = function(teamId) {
    return prisma.activityLog.findMany({
        where: { 
            teamId: parseInt(teamId) 
        },
        orderBy: { 
            createdAt: 'desc' //order by the most recent first
        },
        take: 25, //limiting the results to 25
        include: {
          //including the name on who did the activity
            user: { 
                select: { 
                    name: true 
                } 
            }
        }
    });
};