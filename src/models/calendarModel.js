const prisma = require('./prismaClient');

// Get priority suggestions for tasks based on deadlines and workload
module.exports.getPrioritySuggestions = function(userId, date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7); // Look at next 7 days
    
    // Include overdue tasks (past dates) and tasks due in next 7 days
    return prisma.task.findMany({
        where: {
            userId: userId,
            status: { not: "Completed" },
            dueDate: {
                lte: endDate // Include all tasks due up to 7 days from today (including overdue)
            }
        },
        include: {
            category: true
        },
        orderBy: {
            dueDate: 'asc'
        }
    })
    .then(tasks => {
        const suggestions = [];
        
        tasks.forEach(task => {
            if (!task.dueDate) return;
            
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            const currentPriority = task.priority;
            let suggestedPriority = currentPriority;
            let reason = '';
            
            // Priority suggestion logic
            if (daysUntilDue < 0) {
                // Overdue - should be High
                if (currentPriority !== 'High') {
                    suggestedPriority = 'High';
                    reason = `Task is overdue (${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} ago)`;
                }
            } else if (daysUntilDue === 0) {
                // Due today - should be High
                if (currentPriority !== 'High') {
                    suggestedPriority = 'High';
                    reason = 'Due today';
                }
            } else if (daysUntilDue === 1) {
                // Due tomorrow - should be High
                if (currentPriority !== 'High') {
                    suggestedPriority = 'High';
                    reason = 'Due tomorrow';
                }
            } else if (daysUntilDue <= 3) {
                // Due in 2-3 days - should be High
                if (currentPriority !== 'High') {
                    suggestedPriority = 'High';
                    reason = `Due in ${daysUntilDue} days`;
                }
            } else if (daysUntilDue >= 4 && daysUntilDue <= 7) {
                // Due in 4-7 days - should be Medium
                if (currentPriority !== 'Medium') {
                    suggestedPriority = 'Medium';
                    reason = `Due in ${daysUntilDue} days`;
                }
            } else if (daysUntilDue > 7 && currentPriority === 'High') {
                // Due in more than a week but marked High - could be Medium
                suggestedPriority = 'Medium';
                reason = `Due in ${daysUntilDue} days - consider lowering priority`;
            }
            
            if (suggestedPriority !== currentPriority) {
                suggestions.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    currentPriority: currentPriority,
                    suggestedPriority: suggestedPriority,
                    reason: reason,
                    daysUntilDue: daysUntilDue,
                    dueDate: task.dueDate
                });
            }
        });
        
        return suggestions;
    })
    .catch(err => { throw err; });
};

