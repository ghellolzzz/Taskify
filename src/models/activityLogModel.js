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



module.exports.getByTeam = function(teamId, filterType) {
    
   //query object
    const queryOptions = {
        where: { teamId: parseInt(teamId) },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: { user: { select: { name: true } } }
    };

    //apply filters if exists
    if (filterType) {
        if (filterType === 'MEMBERSHIP') {
            // Special case: Group multiple actions under "MEMBERSHIP"
            queryOptions.where.actionType = {
                in: ['ADD_MEMBER', 'REMOVE_MEMBER', 'LEAVE_TEAM']
            };
        } else {
            //matches the filter case
            queryOptions.where.actionType = filterType;
        }
    }

    return prisma.activityLog.findMany(queryOptions);
};