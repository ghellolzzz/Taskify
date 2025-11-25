const prisma=require("./prismaClient");
const {EMPTY_RESULT_ERROR}=require("../errors");

//user creates a comment
module.exports.createComment = function(content,userId,taskId){
    return prisma.comment.create({
        data:{content,userId,taskId}
    })
    .then(comment=>comment)
    .catch(err=>{
        throw err
    })
}

//user gets comments
module.exports.getComments=function(taskId){
    return prisma.comment.findMany({
        where:{taskId},
        include:{
            user:{
                select:{id:true,name:true}
            }
        },
        orderBy :{createdAt:"desc"}
    })
    .then(comments=>comments)
    .catch(err=>{throw err})
}

//user deletes comments
module.exports.deleteComment=function(commentId,userId){
    
    return prisma.comment.deleteMany({
        where:{id:commentId,userId:userId}
    })
    
    .then(result=>{
        if(result.count==0){
            throw new EMPTY_RESULT_ERROR("comment not found")
        }
       
        return result
    })
     
}