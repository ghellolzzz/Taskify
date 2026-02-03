const token = localStorage.getItem("token");

// Load everything on page load
document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    window.location.href = "/login.html";
    return;
  }
  setDefaultDates();
  loadTasks();
  loadTimeEntries();
});

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date();
  from.setDate(from.getDate() - 30);
  document.getElementById("timeDate").value = today;
  document.getElementById("filterFrom").value = from.toISOString().slice(0, 10);
  document.getElementById("filterTo").value = today;
}

function loadTasks() {
  fetch("/api/tasks", {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
    .then((res) => res.json())
    .then((data) => {
      const select = document.getElementById("timeTask");
      select.innerHTML = '<option value="">Select a task</option>';
      (data.tasks || []).forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.title;
        select.appendChild(opt);
      });
    })
    .catch((err) => console.error("Failed to load tasks:", err));
}

function getFilterParams() {
  const from = document.getElementById("filterFrom").value;
  const to = document.getElementById("filterTo").value;
  let q = "";
  if (from) q += "from=" + encodeURIComponent(from);
  if (to) q += (q ? "&" : "") + "to=" + encodeURIComponent(to);
  return q ? "?" + q : "";
}

function loadTimeEntries() {
  const query = getFilterParams();
  fetch("/api/time-entries" + query, {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
    .then((res) => res.json())
    .then((data) => {
      renderTable(data.timeEntries || []);
      updateSummary(data.timeEntries || []);
    })
    .catch((err) => console.error("Failed to load time entries:", err));
}

function formatMinutes(mins) {
  if (mins < 60) return mins + "m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? h + "h " + m + "m" : h + "h";
}

function renderTable(entries) {
  const tbody = document.querySelector("#timeTable tbody");
  const noEntries = document.getElementById("noEntries");
  tbody.innerHTML = "";
  if (entries.length === 0) {
    noEntries.style.display = "block";
    return;
  }
  noEntries.style.display = "none";
  entries.forEach((e) => {
    const dateStr = new Date(e.date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    const taskTitle = e.task ? e.task.title : "Task #" + e.taskId;
    tbody.innerHTML += `
    <tr>
      <td>${taskTitle}</td>
      <td>${dateStr}</td>
      <td>${formatMinutes(e.minutes)}</td>
      <td>${e.note || "-"}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="openEditTimeEntry(${e.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteTimeEntry(${e.id})" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
    `;
  });
}

function updateSummary(entries) {
  const total = entries.reduce((acc, e) => acc + e.minutes, 0);
  document.getElementById("sumTotal").textContent = formatMinutes(total);
}

function applyFilter() {
  loadTimeEntries();
}

// CREATE time entry
function createTimeEntry() {
  const authToken = localStorage.getItem("token");
  if (!authToken) {
    alert("Session expired. Please log in again.");
    window.location.href = "/login.html";
    return;
  }
  const taskId = document.getElementById("timeTask").value;
  const minutes = document.getElementById("timeMinutes").value;
  const date = document.getElementById("timeDate").value;
  const note = document.getElementById("timeNote").value.trim();

  if (!taskId || !minutes) {
    alert("Please select a task and enter minutes.");
    return;
  }
  const mins = parseInt(minutes, 10);
  if (isNaN(mins) || mins < 1) {
    alert("Minutes must be a positive number.");
    return;
  }

  const body = {
    taskId: parseInt(taskId, 10),
    minutes: mins,
    date: date || undefined,
    note: note || undefined
  };

  fetch("/api/time-entries", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + authToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        alert(data.error);
        return;
      }
      document.getElementById("timeMinutes").value = "";
      document.getElementById("timeNote").value = "";
      loadTimeEntries();
    })
    .catch((err) => {
      console.error(err);
      alert("Failed to log time.");
    });
}

function openEditTimeEntry(id) {
  fetch("/api/time-entries/" + id, {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        alert(data.error);
        return;
      }
      const e = data.timeEntry;
      document.getElementById("editId").value = e.id;
      document.getElementById("editMinutes").value = e.minutes;
      document.getElementById("editDate").value = new Date(e.date).toISOString().slice(0, 10);
      document.getElementById("editNote").value = e.note || "";
      document.getElementById("editModal").style.display = "block";
    })
    .catch((err) => console.error(err));
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
}

function saveTimeEntry() {
  const id = document.getElementById("editId").value;
  const minutes = document.getElementById("editMinutes").value;
  const date = document.getElementById("editDate").value;
  const note = document.getElementById("editNote").value.trim();

  const mins = parseInt(minutes, 10);
  if (isNaN(mins) || mins < 1) {
    alert("Minutes must be a positive number.");
    return;
  }

  fetch("/api/time-entries/" + id, {
    method: "PUT",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ minutes: mins, date: date, note: note })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        alert(data.error);
        return;
      }
      closeEditModal();
      loadTimeEntries();
    })
    .catch((err) => {
      console.error(err);
      alert("Failed to update.");
    });
}

function deleteTimeEntry(id) {
  if (!confirm("Delete this time entry?")) return;
  fetch("/api/time-entries/" + id, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        alert(data.error);
        return;
      }
      loadTimeEntries();
    })
    .catch((err) => {
      console.error(err);
      alert("Failed to delete.");
    });
}
