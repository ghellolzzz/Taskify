const prisma = require("./prismaClient")
const { EMPTY_RESULT_ERROR } = require("../errors")


//create a goal
module.exports.createGoal = function(data){
    return prisma.goal.create({
        data
    })
    .then(goal=>goal)
    .catch(err=>{throw err})
}

//retrieving goals with filters
module.exports.retrieveAll= function(userId,filters={}){
    const where ={userId}

    //filter by completed
    if (filters.completed !== undefined && filters.completed !== "") {
    where.completed = filters.completed === "true";
}

    //filter by category
    if(filters.category){
        where.category = filters.category
    }

    let orderBy ={}

    switch(filters.sortBy){
        case "newest":
            orderBy.createdAt = "desc";
            break;
        case "oldest":
            orderBy.createdAt = "asc";
            break;
        case "title":
            orderBy.title = "asc";
            break;
        case "category":
            orderBy.category = "asc";
            break;
        default:
            orderBy.createdAt = "desc"; // default sort
    }

    return prisma.goal.findMany({
        where,
        orderBy
    })
    .catch(err=>{throw err})
}


//retrieveById
module.exports.retrieveById=function(goalId,userId){
    return prisma.goal.findFirst({
        where:{id:goalId,userId}
    })
        .then(goal=>{
           if(!goal){
            throw new EMPTY_RESULT_ERROR(`Goal ${goalId} not found`)
           } 
           return goal
        });
}

//update goal
module.exports.updateGoal=function(goalId,userId,data){
    return prisma.goal.updateMany({
        where:{id:goalId,userId},
        data
    })
    .then(result=>{
        if(result.count==0){
            throw new EMPTY_RESULT_ERROR(`Goal ${goalId} not found`)
            
        }
        return result;
    })
}
//delete goal
module.exports.deleteGoal= function(goalId,userId){
    return prisma.goal.deleteMany({
        where:{id:goalId,userId}
    })
    .then(result=>{
        if(result.count==0){
            throw new EMPTY_RESULT_ERROR(`Goal ${goalId} not found`)
        }
        return result
    })
}

//progress percentage
module.exports.progress = function (userId) {
    return prisma.goal.groupBy({
        by: ["completed"],
        where: { userId },
        _count: {
            _all: true
        }
    })
    .then(results => {
        const total = results.reduce((acc, g) => acc + g._count._all, 0)
        const completed = results.find(g => g.completed === true)?._count._all || 0

        return {
            total,
            completed,
            progress: total === 0 ? 0 : Math.round((completed / total) * 100)
        }
    })
}

