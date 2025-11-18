const apiUrl = "http://localhost:3000/api";

// Load dashboard stats
function loadDashboardStats() {
  fetch("/api/dashboard")
    .then((response) => response.json())
    .then((data) => {
      // Insert values into your HTML
      document.getElementById("totalTasks").innerText = data.stats.total;
      document.getElementById("completedTasks").innerText = data.stats.completed;
      document.getElementById("pendingTasks").innerText = data.stats.pending;
      document.getElementById("progressTasks").innerText = data.stats.inProgress;

    })
    .catch((error) => console.error("Error loading dashboard:", error));
}

// Run on page load
document.addEventListener("DOMContentLoaded", loadDashboardStats);
