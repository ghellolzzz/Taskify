/* ===== GREETING FUNCTION ===== */
function getGreeting() {
    const now = new Date();
    const hour = now.getHours();
    let greetText = "";

    if (hour >= 5 && hour < 12) {
        greetText = "Good morning";
    } else if (hour >= 12 && hour < 18) {
        greetText = "Good afternoon";
    } else if (hour >= 18 && hour < 24) {
        greetText = "Good evening";
    } else {
        greetText = "Hello";
    }

    return greetText;
}

/* ===== GREETING  WITH USERNAME ===== */
function loadUser() {
  const token = localStorage.getItem("token");
  fetch("/api/dashboard/user",{
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }

  })
    .then(res => res.json())
    .then(data => {
      const user = data.users;
      const greetingText = getGreeting();
      document.getElementById("greeting").innerHTML = `${greetingText}, <span class="name">${user.name}</span>  👋`;
      window.userId = user.id; // store globally
    })
    .catch(err => console.error("Error loading user:", err));
}

document.addEventListener("DOMContentLoaded", loadUser);

/* ===== QUOTES LIST ===== */
const quotes = [
    "Small steps every day lead to big results.",
    "You don't have to be perfect, just consistent.",
    "Focus on progress, not perfection.",
    "One task at a time.",
    "Discipline is choosing what matters most.",
];

/* ===== QUOTE OF THE DAY ===== */
function getDailyQuote() {
    const today = new Date();
    const index = today.getDate() % quotes.length; 
    return quotes[index];
}

document.getElementById("daily-quote").innerText = getDailyQuote();

/* ===== TASK DUE TODAY ===== */
function loadTasksDueToday() {
  const token = localStorage.getItem("token");
  fetch("/api/dashboard/today", {
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(data => {
      const count = data.dueToday;
      let text;

      console.log("COUNT FROM API =", count);
      if (count === 0) {
          text = "You have no tasks today";
      } 
      else if (count === 1) {
          text = "You have 1 task today";
      } 
      else {
          text = `You have ${count} tasks today`;
      }

      document.getElementById("tasksToday").innerText = text;
    })
    .catch(err => console.error("Error loading today's tasks:", err));
}

// Run on page load
document.addEventListener("DOMContentLoaded", loadTasksDueToday);

/* ===== DONUT CHART ===== */
function loadBreakdownChart(completed, inProgress, pending) {
  const ctx = document.getElementById("taskBreakdownChart");

  const total = completed + inProgress + pending;

  const percentCompleted = ((completed / total) * 100).toFixed(0);
  const percentInProgress = ((inProgress / total) * 100).toFixed(0);
  const percentPending = ((pending / total) * 100).toFixed(0);

  // Colors that match your green theme
  const colors = {
    completed: "#4CAF50",
    inProgress: "#81C784",
    pending: "#FFEB99"
  };

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Completed", "In Progress", "Pending"],
      datasets: [{
        data: [completed, inProgress, pending],
        backgroundColor: [
          colors.completed,
          colors.inProgress,
          colors.pending
        ],
        borderWidth: 0,
        borderRadius: 6,
        spacing: 4
      }]
    },
    options: {
      cutout: "65%",
      plugins: {
        legend: { display: false }  // Disable default legend
      }
    }
  });

/* ===== LEGEND ===== */
  document.getElementById("taskLegend").innerHTML = `
    <div class="task-legend-item">
      <div class="legend-dot" style="background:${colors.pending}"></div>
      <div class="legend-percent">${percentPending}%</div>
      <div class="legend-label">Pending</div>
    </div>
    <div class="task-legend-item">
      <div class="legend-dot" style="background:${colors.inProgress}"></div>
      <div class="legend-percent">${percentInProgress}%</div>
      <div class="legend-label">In Progress</div>
    </div>
    <div class="task-legend-item">
      <div class="legend-dot" style="background:${colors.completed}"></div>
      <div class="legend-percent">${percentCompleted}%</div>
      <div class="legend-label">Completed</div>
    </div>
  `;
}


/* ===== LINE CHART ===== */
function loadProductivityChart(days, values) {
  const ctx = document.getElementById("productivityChart");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: days,
      datasets: [{
        label: "Tasks Completed",
        data: values,
        borderColor: "#4CAF50",
        backgroundColor: "rgba(76, 175, 80, 0.2)",
        tension: 0.3
      }]
    }
  });
}
/* ===== DASHBOARD STATS ===== */
function loadDashboardStats() {
  const token = localStorage.getItem("token");
  fetch("/api/dashboard",{
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
    .then((response) => response.json())
    .then((data) => {
      // Insert values into your HTML
      document.getElementById("totalTasks").innerText = data.stats.total;
      document.getElementById("completedTasks").innerText = data.stats.completed;
      document.getElementById("pendingTasks").innerText = data.stats.pending;
      document.getElementById("progressTasks").innerText = data.stats.inProgress;

      // Render charts
      loadBreakdownChart(data.stats.completed, data.stats.inProgress, data.stats.pending);
      loadProductivityChart(data.stats.productivity.days, data.stats.productivity.values);

    })
    .catch((error) => console.error("Error loading dashboard:", error));
}

// Run on page load
document.addEventListener("DOMContentLoaded", loadDashboardStats);
