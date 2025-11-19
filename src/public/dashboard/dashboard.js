//greeting function
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

//greeting with username
function loadUser() {
  fetch("/api/dashboard/user")
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

// Quotes list
const quotes = [
    "Small steps every day lead to big results.",
    "You don't have to be perfect, just consistent.",
    "Focus on progress, not perfection.",
    "One task at a time.",
    "Discipline is choosing what matters most.",
];

//quote of the day function
function getDailyQuote() {
    const today = new Date();
    const index = today.getDate() % quotes.length; 
    return quotes[index];
}

document.getElementById("daily-quote").innerText = getDailyQuote();

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
