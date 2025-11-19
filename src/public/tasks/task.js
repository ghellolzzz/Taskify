//configuring showing and hiding the task form
document.getElementById("show-add-form").addEventListener("click",()=>{
    const card=document.getElementById("add-task-card");
    card.classList.toggle("d-none");
})

//fetch tasks
document.addEventListener("DOMContentLoaded",loadTasks)

function loadTasks(){
    fetch("/api/tasks")
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

    fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(() => loadTasks());
    document.getElementById("add-task-card").classList.add("d-none"); //closes the create form task card
    document.getElementById("add-task-form").reset(); 
});


//deleting task
function deleteTask(id){
     const ok = confirm("Are you sure you want to delete this task?");

    if (!ok) 
        return

    
    fetch(`/api/tasks/${id}`, {
        method: "DELETE"
    })
    .then(() => loadTasks());
}

function openEditModal(taskId) {
    fetch(`/api/tasks/${taskId}`)
        .then((res) => res.json())
        .then((data) => {
            const task = data.task;

            document.querySelector("#edit-title").value = task.title;
            document.querySelector("#edit-desc").value = task.description || "";
            document.querySelector("#edit-date").value = task.dueDate ? task.dueDate.split("T")[0] : "";
            document.querySelector("#edit-priority").value = task.priority;
            document.querySelector("#edit-status").value = task.status;

            document.querySelector("#edit-task-id").value = taskId;

            const modal = new bootstrap.Modal(document.getElementById("editModal"));
            modal.show();
        })
        .catch((err) => console.error(err));
}

// SAVE CHANGES
document.querySelector("#edit-task-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const taskId = document.querySelector("#edit-task-id").value;

    const updatedTask = {
        title: document.querySelector("#edit-title").value,
        description: document.querySelector("#edit-desc").value,
        dueDate: document.querySelector("#edit-date").value,
        priority: document.querySelector("#edit-priority").value,
        status: document.querySelector("#edit-status").value,
    };

    fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
    })
        .then((res) => res.json())
        .then(() => {
            loadTasks();
            bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
        });
});
