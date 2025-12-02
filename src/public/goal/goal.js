document.addEventListener("DOMContentLoaded", () => {
    const name = localStorage.getItem("username") || "User"

    document.getElementById("goalGreeting").textContent =
        `${getGreeting()}, ${name} — here are your goals.`

    loadGoals()
    loadProgress()
})

//greeting
function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
}


document.getElementById("show-add-goal-form").addEventListener("click", () => {
    document.getElementById("add-goal-card").classList.toggle("d-none")
})


function loadGoals() {

    const params = new URLSearchParams()

    const completed = document.getElementById("filterCompleted").value
    const category = document.getElementById("filterCategory").value
    const sortBy = document.getElementById("sortBy").value

    if (completed){
        params.append("completed", completed)
    }
    if (category){
        params.append("category", category)
    }
    if (sortBy){
        params.append("sortBy", sortBy)
    }

    fetch(`/api/goals?${params.toString()}`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(data => renderGoals(data.goals))
        .catch(err => console.error(err))
}
//render goals
function renderGoals(goals) {
    const active = document.getElementById("active-goal-container")
    const completed = document.getElementById("completed-goal-container")

    active.innerHTML = ""
    completed.innerHTML = ""

    const activeGoals = goals.filter(g => !g.completed)
    const completedGoals = goals.filter(g => g.completed)

    document.getElementById("completedGoalCount").textContent = `(${completedGoals.length})`

    activeGoals.forEach(g => active.appendChild(createGoalCard(g)))
    completedGoals.forEach(g => completed.appendChild(createGoalCard(g)))
}

//creates individual goal card
function createGoalCard(goal) {
    const card = document.createElement("div")
    card.className = "task-card " + (goal.completed ? "goal-completed" : "")

    const categoryClass = goal.category ? `category-${goal.category}` : ""

    card.innerHTML = `
        <div class="goal-title">${goal.title}</div>
        <p class="goal-desc">${goal.description || "*No description*"}</p>

        ${goal.category ? `
            <span class="goal-category-pill ${categoryClass}">
                ${goal.category}
            </span>
        ` : ""}

        <div class="goal-actions">
            <button class="edit-btn" onclick="openEditGoal(${goal.id})">
                <i class="bi bi-pencil-square"></i>
            </button>

            <button class="complete-btn" onclick="markGoalCompleted(${goal.id}, this)">
                <i class="bi bi-check-circle"></i>
            </button>

            <button class="delete-btn" onclick="deleteGoal(${goal.id})">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `

    return card
}


document.getElementById("add-goal-form").addEventListener("submit", function (e) {
    e.preventDefault()

    const newGoal = {
        title: document.getElementById("goal-title").value,
        description: document.getElementById("goal-description").value,
        category: document.getElementById("goal-category").value
    }

    fetch("/api/goals", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify(newGoal)
    })
        .then(() => {
            loadGoals()
            loadProgress()
            this.reset()
            document.getElementById("add-goal-card").classList.add("d-none")
        })
})

//load the progress bar
function loadProgress() {
    fetch("/api/goals/stats/progress", {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(data => {
            const bar = document.getElementById("progressBar")
            bar.style.width = data.progress + "%"
            bar.textContent = data.progress + "%"
        })
}

//mark goals completed
function markGoalCompleted(id, btnElement) {
    fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ completed: true })
    })
    .then(() => {
        const card = btnElement.closest(".task-card")
        if (card) {
          card.classList.remove("goal-complete-anim")
          card.classList.add("goal-complete-anim")
        }

        setTimeout(() => {
            loadGoals()
            loadProgress()
        }, 450)
    })
}


function deleteGoal(id) {
    if (!confirm("Delete this goal?")) return

    fetch(`/api/goals/${id}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(() => {
            loadGoals()
            loadProgress()
        })
}
//opening up the edit model
function openEditGoal(id) {
    fetch(`/api/goals/${id}`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(data => {
            const goal = data.goal

            document.getElementById("edit-goal-id").value = id
            document.getElementById("edit-goal-title").value = goal.title
            document.getElementById("edit-goal-description").value = goal.description || ""
            document.getElementById("edit-goal-category").value = goal.category || ""
            document.getElementById("edit-goal-completed").value = goal.completed

            new bootstrap.Modal(document.getElementById("editGoalModal")).show()
        })
}


document.getElementById("edit-goal-form").addEventListener("submit", function (e) {
    e.preventDefault()

    const id = document.getElementById("edit-goal-id").value

    const updatedGoal = {
        title: document.getElementById("edit-goal-title").value,
        description: document.getElementById("edit-goal-description").value,
        category: document.getElementById("edit-goal-category").value,
        completed: document.getElementById("edit-goal-completed").value === "true"
    }

    fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify(updatedGoal)
    })
        .then(() => {
            loadGoals()
            loadProgress()
            bootstrap.Modal.getInstance(document.getElementById("editGoalModal")).hide()
        })
})


document.getElementById("applyGoalFilters").addEventListener("click", loadGoals)

document.getElementById("resetGoalFilters").addEventListener("click", () => {
    document.getElementById("filterCompleted").value = ""
    document.getElementById("filterCategory").value = ""
    document.getElementById("sortBy").value = "newest"

    loadGoals()
})


function toggleCompletedGoals() {
    const container = document.getElementById("completed-goal-container")
    const arrow = document.getElementById("goalArrow")

    container.classList.toggle("collapsed")

    arrow.classList.toggle("bi-chevron-up")
}

//toggling smart guide
function toggleSmartGuide() {
    const content = document.getElementById("smartContent")
    const arrow = document.getElementById("smartArrow")

    content.classList.toggle("collapsed")
    arrow.classList.toggle("bi-chevron-down")
    arrow.classList.toggle("bi-chevron-up")
}

