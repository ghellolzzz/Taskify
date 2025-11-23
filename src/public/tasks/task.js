document.addEventListener("DOMContentLoaded", () => {
    const name = localStorage.getItem("username") || "User";
    const greeting = document.getElementById("dynamicGreeting");

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    }

    greeting.textContent = `${getGreeting()}, ${name} — here are your tasks for today.`;
});


//configuring showing and hiding the task form
document.getElementById("show-add-form").addEventListener("click",()=>{
    const card=document.getElementById("add-task-card");
    card.classList.toggle("d-none");
})

//fetch tasks
document.addEventListener("DOMContentLoaded",loadTasks)

function loadTasks(){
    fetch("/api/tasks",{
        headers:{
            "Authorization":"Bearer "+localStorage.getItem("token")
        }
    })
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
        card.className = "task-card " + (task.status === "Completed" ? "task-completed" : "");


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

                <button class="complete-btn" onclick="markTaskComplete(${task.id}, this)">
                    <i class="bi bi-check2-circle"></i>
                </button>

                <button class="delete-btn" onclick="deleteTask(${task.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            
             <hr>

            <!-- COMMENTS SECTION -->
            <div id="comments-${task.id}">
                <em>Loading comments...</em>
            </div>

            <div class="input-group mt-2">
                <input id="comment-input-${task.id}" class="form-control" placeholder="Write a comment...">
            <button class="btn btn-success" onclick="addComment(${task.id})">Post</button>
            </div>
        `;
        container.appendChild(card);
        loadComments(task.id)
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
        headers: { "Content-Type": "application/json" ,
                    "Authorization":"Bearer "+ localStorage.getItem("token")
        },
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
        method: "DELETE",
        headers:{
         "Authorization":"Bearer "+ localStorage.getItem("token")
        }
    })
    .then(() => loadTasks());
}

function openEditModal(taskId) {
    fetch(`/api/tasks/${taskId}`,{
         headers:{
         "Authorization":"Bearer "+ localStorage.getItem("token")
        }
    })
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

// saving changes when the user completes the task
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
        headers: { "Content-Type": "application/json",
         "Authorization":"Bearer "+ localStorage.getItem("token")
        
        },
        body: JSON.stringify(updatedTask),
    })
        .then((res) => res.json())
        .then(() => {
            loadTasks();
            
        });
});

function markTaskComplete(taskId, element) {
    fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ status: "Completed" })
    })
    .then(() => {
        const card = element.closest(".task-card");
        card.classList.add("task-complete-anim");

        setTimeout(() => loadTasks(), 400);
    });
}



//comment form

function loadComments(taskId){
    fetch(`/api/comments/${taskId}`,{
        headers:{
            "Authorization":"Bearer "+localStorage.getItem("token")
        }
    })
    .then(res=>res.json())
    .then(data=>{

        const container = document.getElementById(`comments-${taskId}`);
      //if comment doesnt exist
        if (!data.comments || data.comments.length === 0) {
            container.innerHTML = `<p class="text-muted">No comments yet.</p>`;
            return;
        }
//renders each of the comments

        container.innerHTML = data.comments.map(c => `
            <div class="comment border rounded p-2 mb-2">
                <strong>${c.user?.name || "User"}</strong>
                <p class="mb-1">${c.content}</p>
                <small class="text-muted">${new Date(c.createdAt).toLocaleString()}</small>

                <button class="btn btn-sm btn-danger float-end" onclick="deleteComment(${c.id}, ${taskId})">
                Delete
                </button>
    </div>
    `).join("");

    })
}
//adds comments
function addComment(taskId) {
    const input = document.getElementById(`comment-input-${taskId}`);
    const content = input.value;

    if (!content.trim()) return;

    fetch(`/api/comments/${taskId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ content })
    })
    //reloads comments once added
    .then(() => {
        input.value = "";
        loadComments(taskId);
    });
}

function deleteComment(commentId, taskId) {
    console.log(commentId)
    fetch(`/api/comments/delete/${commentId}`, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    })
    .then(() => loadComments(taskId));
}
