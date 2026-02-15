const token = localStorage.getItem("token");

// Load everything on page load
document.addEventListener("DOMContentLoaded", () => {
  loadReminders();
  loadTasksDropdown();
  loadReminderSummary();
});
//LOAD REMINDER SUMMARY
function loadReminderSummary() {
  fetch("/api/reminders/stats", {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(stats => {
      document.getElementById("sumToday").innerText = `${stats.today} Today`;
      document.getElementById("sumUpcoming").innerText = `${stats.upcoming} Upcoming`;
      document.getElementById("sumOverdue").innerText = `${stats.overdue} Overdue`;
      document.getElementById("sumDone").innerText = `${stats.done} Done`;
    })
    .catch(err => console.error("Failed to load reminder summary:", err));
}
// LOAD TABLE
function loadReminders() {
  fetch("/api/reminders", {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(data => renderTable(data.reminders));
}

function renderTable(reminders) {
  const tbody = document.querySelector("#reminderTable tbody");
  tbody.innerHTML = "";

  reminders.forEach((r, index) => {
    const status = getStatusBadge(r);
    const linkedName = r.task?.title || r.habit?.title || "-";


    tbody.innerHTML += `
    <tr>
      <td>${index + 1}</td>
      <td>${new Date(r.remindAt).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
      })}</td>
      <td>${r.title}</td>
      <td>${r.notes}</td>
      <td>${linkedName}</td>
      <td>${status}</td>
      <td>
        <button class="btn btn-sm btn-success" onclick="markDone(${r.id})">
            <i class="bi bi-check-circle"></i>
        </button>
        <button class="btn btn-sm btn-primary" onclick="openEditReminder(${r.id})">
            <i class="bi bi-pencil-square"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteReminder(${r.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
    `;
  });
}

function getStatusBadge(r) {
  if (r.isDone) return `<span class="status-badge status-done">Done</span>`;

  const now = new Date();
  const remindAt = new Date(r.remindAt);

  if (remindAt < now) return `<span class="status-badge status-overdue">Overdue</span>`;
  return `<span class="status-badge status-upcoming">Upcoming</span>`;
}

// CREATE REMINDER
function createReminder() {
  const body = {
    title: document.getElementById("rTitle").value,
    notes: document.getElementById("rNotes").value,
    taskId: document.getElementById("rTask").value || null,
    remindAt: new Date(document.getElementById("rDate").value).toISOString(),
    repeatType: document.getElementById("rRepeat").value
  };

  fetch("/api/reminders", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })
.then(() => {
  loadReminders();
  loadReminderSummary();
});
}

// LOAD TASKS DROPDOWN
function loadTasksDropdown() {
  fetch("/api/tasks", {
    headers: { "Authorization": "Bearer " + token }
  })
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("rTask");
      select.innerHTML = `<option value="">-- None --</option>`;
      data.tasks.forEach(t => {
        select.innerHTML += `<option value="${t.id}">${t.title}</option>`;
      });
    });
}
function loadTasksDropdownForEdit() {
  return fetch("/api/tasks", {
    headers: { "Authorization": "Bearer " + token }
  })
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("editTask");
      select.innerHTML = `<option value="">-- None --</option>`;

      data.tasks.forEach(t => {
        select.innerHTML += `<option value="${t.id}">${t.title}</option>`;
      });
    });
}

// Function to help change database time to local time
function toDatetimeLocal(dateStr) {
  const d = new Date(dateStr);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  // Required format for <input type="datetime-local">
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// UPDATE REMINDER
function openEditReminder(id) {
  //Load dropdown
  loadTasksDropdownForEdit().then(() => {
  return fetch(`/api/reminders/${id}`, {
    headers: { "Authorization": "Bearer " + token }
  });
})
    .then(res => res.json())
    .then(data => {
      const r = data.reminder;

      document.getElementById("editId").value = r.id;
      document.getElementById("editTitle").value = r.title;
      document.getElementById("editNotes").value = r.notes || "";
      document.getElementById("editDate").value = toDatetimeLocal(r.remindAt);
      document.getElementById("editRepeat").value = r.repeatType || "none";

      document.getElementById("editTask").value = r.taskId || "";

      document.getElementById("editModal").style.display = "flex";
    });
}

// close modal
function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

// save edit changes
function saveReminderChanges() {
  const id = document.getElementById("editId").value;

  const body = {
    title: document.getElementById("editTitle").value,
    notes: document.getElementById("editNotes").value,
    taskId: Number(document.getElementById("editTask").value) || null,
    remindAt: new Date(document.getElementById("editDate").value).toISOString(),
    repeatType: document.getElementById("editRepeat").value
  };

  fetch(`/api/reminders/${id}`, {
    method: "PUT",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })
    .then(() => {
      document.getElementById("editModal").style.display = "none";
      loadReminders();
      loadReminderSummary();
    });
}

// UPDATE REMINDER AS DONE
function markDone(id) {
  if (!confirm("Mark this reminder as done?")) return;

  fetch(`/api/reminders/${id}/complete`, {
    method: "PUT",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert("Error: " + data.error);
      return;
    }

    // Success
    alert("Reminder marked as done!");

    // Reload the reminders table
    loadReminders();
    loadReminderSummary();
  })
  .catch(err => {
    console.error("Error marking reminder done:", err);
    alert("Something went wrong.");
  });
}


// DELETE REMINDER
function deleteReminder(id) {
  const confirmDelete = confirm("Are you sure you want to delete this reminder?");
  if (!confirmDelete) return;

  fetch(`/api/reminders/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(data => {
      console.log("Reminder deleted:", data);
      loadReminders();  // reload table
      loadReminderSummary()
    })
    .catch(err => console.error("Error deleting reminder:", err));
}


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
