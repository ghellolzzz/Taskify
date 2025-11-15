//configuring showing and hiding the task form
document.getElementById("show-add-form").addEventListener("click",()=>{
    const card=document.getElementById("add-task-card");
    card.classList.toggle("d-none");
})

//fetch tasks
document.addEventListener("DOMContentLoaded",loadTasks)

function loadTasks(){
    fetch("/tasks")
        .then(res=>res.json())
        .then(data=>{
            renderTasks(data.tasks||[]);
            console.log(data)
            
        })
        .catch(err=>console.error(err))
}

//rendering the grid cards
function renderTasks(tasks){
    const container = document.getElementById("task-card-container");
    container.innerHTML="";

    tasks.forEach(task=>{
        const card= document.createElement("div");
        card.className="task-card";

        card.innerHTML=`
            <div class="task-title">${task.title}</div>

            <div class="mt-2">
                <span class="badge-priority-${task.priority.toLowerCase()}">
                    ${task.priority}
                </span>
                <span class="badge-status">${task.status}</span>
            </div>
            <p class="text-muted mt-2">${task.description || "*No description*"}</p>

            <p><strong>Due:</strong> ${
                task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"
            }</p>

            <div class="task-actions">
                <button class="edit-btn" onclick="openEditModal(${task.id})">
                    <i class="bi bi-pencil-square"></i>
                </button>

                <button class="delete-btn" onclick="deleteTask(${task.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    })
}

// Create Task
document.getElementById("add-task-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const body = {
        title: title.value,
        description: description.value,
        dueDate: dueDate.value,
        priority: priority.value
    };

    fetch("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(() => loadTasks());
    document.getElementById("add-task-card").classList.add("d-none"); 
    document.getElementById("add-task-form").reset(); 
});


//deleting task
function deleteTask(id){
    fetch(`/tasks/${id}`,{method:"DELETE"})
        .then(()=>loadTasks());
}

function openEditModal(id) {
    alert("Edit modal coming in Week 7!");
}
