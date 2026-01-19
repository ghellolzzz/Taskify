document.addEventListener("DOMContentLoaded", () => {
    const name = localStorage.getItem("username") || "User";
    const greeting = document.getElementById("dynamicGreeting");

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    }

    greeting.textContent = `${getGreeting()}, ${name} — here are your tasks.`;
});


//configuring showing and hiding the task form
document.getElementById("show-add-form").addEventListener("click",()=>{
    const card=document.getElementById("add-task-card");
    card.classList.toggle("d-none");
})

// Logout functionality
document.querySelector('.sidebar-footer a')?.addEventListener("click", (e) => {
    e.preventDefault();
    // Clear all authentication data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('accountNo');
    localStorage.removeItem('role');
    localStorage.removeItem('memberId');
    
    // Redirect to login page
    window.location.href = '../login.html';
});

//fetch tasks
document.addEventListener("DOMContentLoaded",loadTasks)


document.addEventListener("DOMContentLoaded",loadCategories);

//loading all the categories
function loadCategories() {
    const userId = localStorage.getItem("userId");

    fetch(`/api/categories`, {
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    })
    .then(res => res.json())
    .then(data => {
        console.log(data)
        const dropdown = document.getElementById("category");
        dropdown.innerHTML = `<option value="">Select Category</option>`;
        const categories = data || []  
        categories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.id;
            option.textContent = cat.name;
            dropdown.appendChild(option);
        });
    });
}





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

function createTaskCard(task) {
    const card = document.createElement("div");
    card.className = "task-card " + (task.status === "Completed" ? "task-completed" : "")

    card.innerHTML = `
        <div class="task-title">${task.title}</div>

        <div class="mt-2">
            <span class="badge-priority-${task.priority.toLowerCase()}">
                ${task.priority}
            </span>
            <span class="badge-status">${task.status}</span>
        </div>
        <div class="mt-1">
            <span class="badge-category" style="
             background:${task.category?.color || '#ccc'};
            padding:4px 10px;
            border-radius:12px;
            font-size:12px;
            color:white;
            display:inline-block;
        ">
       ${
        task.teamId
            ? `<span class="badge bg-secondary">Team task</span>`
            : `<span class="badge-category" style="
        background:${task.category?.color || '#ccc'};
        padding:4px 10px;
        border-radius:12px;
        font-size:12px;
        color:white;
        display:inline-block;
      ">
        ${task.category?.name || "No category"}
      </span>`
        }

            </span>
    </div>

        <p class="text-muted mt-2">${task.description || "*No description*"}</p>

        <p><strong>Due:</strong> ${
            task.dueDate ? new Date(task.dueDate).toLocaleString("en-SG", {
            day: "numeric",
            month: "long",
            year: "numeric",
        }) : "No due date"
        }</p>

        <p><strong>Completed:</strong> ${
            task.completedAt ? new Date(task.completedAt).toLocaleString("en-SG", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }) : "-"
        }</p>


        <div class="task-actions">
            <button class="edit-btn" onclick="openEditModal(${task.id})">
                <i class="bi bi-pencil-square"></i>
            </button>

            <button class="complete-btn" onclick="markTaskComplete(${task.id}, this)">
                <i class="bi bi-check2-circle"></i>
            </button>

            <button class="delete-btn float-end" onclick="deleteTask(${task.id})">
                <i class="bi bi-trash"></i>
            </button>
        </div>

        <hr>

        <div id="comments-${task.id}">
            <em>Loading comments...</em>
        </div>

        <div class="input-group mt-2">
            <input id="comment-input-${task.id}" class="form-control" placeholder="Write a comment...">
            <button class="btn btn-success" onclick="addComment(${task.id})">Post</button>
        </div>
    `;

    return card;
}

//rendering the grid cards
function renderTasks(tasks) {
    const activeContainer = document.getElementById("active-task-container")
    const completedContainer = document.getElementById("completed-task-container")

    activeContainer.innerHTML = ""
    completedContainer.innerHTML = ""

    const activeTasks = tasks.filter(t => t.status !== "Completed")
    const completedTasks = tasks.filter(t => t.status === "Completed")

    document.getElementById("completedCount").textContent = `(${completedTasks.length})`

    activeTasks.forEach(task => {
        activeContainer.appendChild(createTaskCard(task))
        loadComments(task.id)
    });

    completedTasks.forEach(task => {
        completedContainer.appendChild(createTaskCard(task))
        loadComments(task.id)
    });
}

// Create Task
document.getElementById("add-task-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const body = {
    title: title.value,
    description: description.value,
    dueDate: dueDate.value,
    priority: priority.value,
   categoryId: document.getElementById("category").value
    ? Number(document.getElementById("category").value)
    : null

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

            loadEditCategories(task.category?.id)



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
        categoryId: document.getElementById("edit-category").value
        ? Number(document.getElementById("edit-category").value)
        : null,

        completedAt:document.querySelector("#edit-status").value === "Completed"? new Date().toISOString(): null,
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

function loadEditCategories(selectedId) {
   const userId = localStorage.getItem("userId");

fetch(`/api/categories`, {
    headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
    }
})

    .then(res => res.json())
    .then(data => {
        const dropdown = document.getElementById("edit-category")
        dropdown.innerHTML = `<option value="">Select Category</option>`
        const categories = data || []  
        categories.forEach(cat => {
            const option = document.createElement("option")
            option.value = cat.id;
            option.textContent = cat.name;

            if (selectedId == cat.id){
                option.selected=true
            }
               

            dropdown.appendChild(option);
        });
    });
}


function markTaskComplete(taskId, element) {
    fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ 
            status: "Completed",
            completedAt: new Date().toISOString()
        })
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

        <div class="comment-footer d-flex justify-content-between align-items-center mt-1">
            <small class="text-muted">
                ${new Date(c.createdAt).toLocaleString("en-SG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                })}
            </small>

            <button class="btn btn-sm btn-danger" onclick="deleteComment(${c.id}, ${taskId})">
                Delete
            </button>
        </div>

    </div>
`).join("")


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

//applying filters
document.getElementById("applyFiltersBtn").addEventListener("click", applyFilters)
document.getElementById("resetFiltersBtn").addEventListener("click", resetFilters)

function applyFilters() {
    const priority = document.getElementById("filterPriority").value;
    const status = document.getElementById("filterStatus").value;
    const from = document.getElementById("filterFrom").value;
    const to = document.getElementById("filterTo").value;

    const params = new URLSearchParams();

    if (priority){
        params.append("priority", priority)
    }
    if (status){
        params.append("status", status)
    }
    if (from){
        params.append("fromDate", from)
    }
    if (to){
        params.append("toDate", to)
    }

    fetch(`/api/tasks/filter?${params.toString()}`, {
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    })
    .then(res => res.json())
    .then(data => renderTasks(data.tasks))
    .catch(err => console.error(err));
}


function resetFilters() {
    document.getElementById("filterPriority").value = ""
    document.getElementById("filterStatus").value = ""
    document.getElementById("filterFrom").value = ""
    document.getElementById("filterTo").value = ""

    loadTasks()
}


function toggleCompleted() {
    const container = document.getElementById("completed-task-container")
    const arrow = document.getElementById("completedArrow")

    container.classList.toggle("collapsed")

    if (container.classList.contains("collapsed")) {
        arrow.classList.replace("bi-chevron-up", "bi-chevron-down")
    } else {
        arrow.classList.replace("bi-chevron-down", "bi-chevron-up")
    }
}
