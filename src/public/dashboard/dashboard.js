// const { options } = require("pg/lib/defaults");

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

/* ================================
    QUOTE OF THE DAY FROM API
================================ */
function loadDailyQuote() {
  fetch("/api/dashboard/quote")
    .then(res => res.json())
    .then(data => {
      const quote = data.q;
      const author = data.a;

      document.getElementById("daily-quote").innerText = `"${quote}" — ${author}`;
    })
    .catch(err => {
      console.error("Quote API Error:", err);
      document.getElementById("daily-quote").innerText = "Stay positive and keep moving forward!";
    });
}
// Run on page load
document.addEventListener("DOMContentLoaded", loadDailyQuote);

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
    },
    options:{

    }
  });
}
/* ===== DASHBOARD  ===== */
let allTrendData = { labels: [], values: [] }; // Storage
let productivityChartInstance = null; // Chart instance
/* ===== DASHBOARD STATS ===== */
let isFirstLoad = true;
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

      // Save the trend data
      allTrendData.labels = data.stats.productivity.days;
      allTrendData.values = data.stats.productivity.values;

      // Render charts
      loadBreakdownChart(data.stats.completed, data.stats.inProgress, data.stats.pending);
      //loadProductivityChart(data.stats.productivity.days, data.stats.productivity.values);

      // 4. Default to showing the last 7 days initially
      applyProductivityFilter(7);
    
    })
    .catch((error) => console.error("Error loading dashboard:", error));
}

function applyProductivityFilter(numDays) {
    const days = parseInt(numDays);
    
    // Update the title text
    const titleElement = document.getElementById("chartTitle");
    if(titleElement) titleElement.innerText = `Productivity Trend (Last ${days} Days)`;

    // Slice the last X elements from the arrays
    const filteredLabels = allTrendData.labels.slice(-days);
    const filteredValues = allTrendData.values.slice(-days);

    // Re-render the chart with the sliced data
    renderProductivityLineChart(filteredLabels, filteredValues);
}

function renderProductivityLineChart(labels, values) {
    const ctx = document.getElementById("productivityChart").getContext("2d");

    // Destroy the previous chart instance if it exists
    if (productivityChartInstance) {
        productivityChartInstance.destroy();
    }

    productivityChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Tasks Completed",
                data: values,
                borderColor: "#4CAF50",
                backgroundColor: "rgba(76, 175, 80, 0.1)",
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}
// Run on page load
document.addEventListener("DOMContentLoaded", loadDashboardStats);

/* ===== CALENDAR ===== */
function loadIosCalendar() {
    const today = new Date();

    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    const dayName = dayNames[today.getDay()];
    const dayNumber = today.getDate();

    document.getElementById("iosCalDayName").innerText = dayName;
    document.getElementById("iosCalDayNumber").innerText = dayNumber;
}

// Run on page load
document.addEventListener("DOMContentLoaded", loadIosCalendar);

/* ===== REMINDERS ===== */
function getReminderClass(status) {
  switch (status.toLowerCase()) {
    case "done": return "reminder-done";
    case "overdue": return "reminder-overdue";
    default: return "reminder-upcoming";
  }
}
function renderDashboardReminders(data) {
  const todayBox = document.querySelector("#dashTodayReminders .reminder-list");
  const upcomingBox = document.querySelector("#dashUpcomingReminders .reminder-list");

  todayBox.innerHTML = "";
  upcomingBox.innerHTML = "";

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

  // Today Reminders
  data.today.forEach(r => {
    const cssClass = getReminderClass(r.status);
    todayBox.innerHTML += `
      <div class="reminder-card ${cssClass}">
        <strong>${r.title}</strong>
        <div class="reminder-time">${r.status} • ${formatTime(r.remindAt)}</div>
      </div>
    `;
  });

  // Upcoming Reminders
  data.upcoming.forEach(r => {
    const cssClass = getReminderClass(r.status);
    upcomingBox.innerHTML += `
      <div class="reminder-card ${cssClass}">
        <strong>${r.title}</strong>
        <div class="reminder-time">${formatDate(r.remindAt)} • ${formatTime(r.remindAt)}</div>
      </div>
    `;
  });
}

function loadDashboardReminders() {
  const token = localStorage.getItem("token");
  fetch("/api/dashboard/reminders", {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(data => renderDashboardReminders(data))
    .catch(err => console.error("Error loading dashboard reminders:", err));
}
// Run on page load
document.addEventListener("DOMContentLoaded", loadDashboardReminders());



/* ===== POMODORO TIMER(old) ===== */
// let isRunning = false;
// let isBreak = false;
// let timer;
// let timeLeft = 25 * 60; // 25 minutes

// const display = document.getElementById("pomodoro-display");
// const statusText = document.getElementById("pomodoro-status");

// function updateDisplay() {
//   let minutes = Math.floor(timeLeft / 60);
//   let seconds = timeLeft % 60;
//   display.innerText = `${minutes.toString().padStart(2, "0")}:${seconds
//     .toString()
//     .padStart(2, "0")}`;
// }

// function startTimer() {
//   if (isRunning) return;
//   isRunning = true;

//   timer = setInterval(() => {
//     timeLeft--;

//     updateDisplay();

//     if (timeLeft <= 0) {
//       clearInterval(timer);
//       isRunning = false;

//       if (!isBreak) {
//         // Switch to break
//         isBreak = true;
//         timeLeft = 5 * 60; // 5 min break
//         statusText.innerText = "Break Time 🍵";
//       } else {
//         // Switch to work session
//         isBreak = false;
//         timeLeft = 25 * 60;
//         statusText.innerText = "Focus Session 💪";
//       }

//       updateDisplay();
//       startTimer(); // auto start next cycle
//     }
//   }, 1000);
// }

// function pauseTimer() {
//   clearInterval(timer);
//   isRunning = false;
// }

// function resetTimer() {
//   clearInterval(timer);
//   isRunning = false;

//   isBreak = false;
//   timeLeft = 25 * 60;
//   statusText.innerText = "Focus Session";
//   updateDisplay();
// }

// // Attach buttons
// document.getElementById("pomodoro-start").addEventListener("click", startTimer);
// document.getElementById("pomodoro-pause").addEventListener("click", pauseTimer);
// document.getElementById("pomodoro-reset").addEventListener("click", resetTimer);

// // Load default display
// updateDisplay();

/* ===== POMODORO TIMER(NEW) ===== */

let isRunning = false;
let isBreak = false;
let timer;

// Default Settings (in seconds)
let times = {
    focus: 25 * 60,
    break: 5 * 60
};
let timeLeft = times.focus;

const minInput = document.getElementById("input-min");
const secInput = document.getElementById("input-sec");
const statusText = document.getElementById("pomodoro-status");
const focusBtn = document.getElementById("mode-focus");
const breakBtn = document.getElementById("mode-break");
const alarm = document.getElementById("alarm-sound");

function updateDisplay() {
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    minInput.value = minutes.toString().padStart(2, "0");
    secInput.value = seconds.toString().padStart(2, "0");
}

// 1. Added stopAlarm function so the code doesn't crash
function stopAlarm() {
    if (alarm) {
        alarm.pause();
        alarm.currentTime = 0;
    }
}

function syncCustomTime() {
    // Ensure we have numbers and prevent NaN
    const mins = parseInt(minInput.value) || 0;
    const secs = parseInt(secInput.value) || 0;
    const totalSec = (mins * 60) + secs;
    
    if (isBreak) times.break = totalSec;
    else times.focus = totalSec;
    
    timeLeft = totalSec;
}

[minInput, secInput].forEach(el => el.addEventListener('change', syncCustomTime));

function switchMode(toBreak) {
    if (isRunning) {
        clearInterval(timer);
        isRunning = false;
    }
    
    minInput.disabled = false;
    secInput.disabled = false;
    isBreak = toBreak;
    
    focusBtn.classList.toggle('active', !isBreak);
    breakBtn.classList.toggle('active', isBreak);
    statusText.innerText = isBreak ? "Break Time 🍵" : "Focus Session 💪";
    
    timeLeft = isBreak ? times.break : times.focus;
    updateDisplay();
}

function startTimer() {
    if (isRunning) return;
    
    stopAlarm(); // Now this works!

    isRunning = true;
    minInput.disabled = true;
    secInput.disabled = true;

    timer = setInterval(() => {
        timeLeft--;
        updateDisplay();

        if (timeLeft <= 0) {
            clearInterval(timer);
            isRunning = false;

            if (alarm) alarm.play();

            minInput.disabled = false;
            secInput.disabled = false;
            
            // Switch mode UI so user sees the next session duration
            switchMode(!isBreak); 
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timer);
    isRunning = false;
    minInput.disabled = false;
    secInput.disabled = false;
    stopAlarm(); 
}

function resetTimer() {
    pauseTimer();
    stopAlarm();
    timeLeft = isBreak ? times.break : times.focus;
    updateDisplay();
}

// Event Listeners
focusBtn.addEventListener("click", () => switchMode(false));
breakBtn.addEventListener("click", () => switchMode(true));
document.getElementById("pomodoro-start").addEventListener("click", startTimer);
document.getElementById("pomodoro-pause").addEventListener("click", pauseTimer);
document.getElementById("pomodoro-reset").addEventListener("click", resetTimer);

// Initialize
updateDisplay();




// Logout functionality
document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.querySelector('.sidebar-footer a');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
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
    }
});
