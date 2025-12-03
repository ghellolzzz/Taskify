// src/public/habit/habits.js

function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return {
    ...extra,
    Authorization: 'Bearer ' + token,
  };
}

document.addEventListener('DOMContentLoaded', () => {
  // Handle logout like other pages
  const logoutBtn = document.querySelector('.sidebar-footer a');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('accountNo');
      localStorage.removeItem('role');
      localStorage.removeItem('memberId');
      window.location.href = '../login.html';
    });
  }

  setupColourSwatches();
  setupHabitForm();
  loadHabitsBoard();
});

let currentBoard = null;

function loadHabitsBoard() {
  fetch('/api/habits', {
    headers: authHeaders(),
  })
    .then((res) => res.json())
    .then((board) => {
      currentBoard = board;
      renderHabitsBoard(board);
    })
    .catch((err) => {
      console.error('Failed to load habits board:', err);
    });
}

function renderHabitsBoard(board) {
  const { week, habits, summary } = board;

  // Week header labels
  const headerRow = document.getElementById('habitsWeekHeaderRow');
  headerRow.innerHTML = '';

  // ⬇⬇ ADD THESE TWO SPACER CELLS ⬇⬇
  const spacerHabit = document.createElement('th');
  const spacerTarget = document.createElement('th');
  spacerTarget.classList.add('text-center');
  headerRow.appendChild(spacerHabit);
  headerRow.appendChild(spacerTarget);
  // ⬆⬆ NOW THE DAYS LINE UP UNDER THE "Week" COLUMNS ⬆⬆

  week.days.forEach((day) => {
    const d = new Date(day.date);
    const th = document.createElement('th');
    th.classList.add('text-center', 'small');
    if (day.isToday) th.classList.add('is-today-header');
    th.innerHTML = `
      <div>${day.label}</div>
      <div class="fw-semibold">${d.getDate()}</div>
    `;
    headerRow.appendChild(th);
  });


  // Habits count badge
  const badge = document.getElementById('habitsCountBadge');
  if (badge) {
    badge.textContent =
      habits.length === 1 ? '1 habit tracked' : `${habits.length} habits tracked`;
  }

  // Table body
  const tbody = document.getElementById('habitsTableBody');
  tbody.innerHTML = '';

  if (habits.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="9" class="text-center text-muted small py-4">
        No habits yet. Click <strong>New habit</strong> to create your first one.
      </td>
    `;
    tbody.appendChild(tr);
  } else {
    habits.forEach((habit) => {
      const tr = document.createElement('tr');

      const color = habit.color || 'var(--accent-color)';
      const targetLabel = habit.targetPerWeek
        ? `${habit.targetPerWeek}× / week`
        : 'Flexible';

      let daysHtml = '';
      week.days.forEach((day, idx) => {
        const entry = habit.week.find(w => w.date === day.date);
        const isDone = entry?.completed;
        const extraClasses = [
          'habit-dot',
          isDone ? 'is-complete' : '',
          day.isToday ? 'is-today' : '',
        ]
          .filter(Boolean)
          .join(' ');

        daysHtml += `
          <td class="text-center">
            <button
              type="button"
              class="${extraClasses}"
              data-habit-id="${habit.id}"
              data-date="${day.date}"
              aria-label="Toggle ${habit.title} on ${day.label}"
            ></button>
          </td>
        `;
      });

      tr.innerHTML = `
        <td>
          <div class="d-flex align-items-center gap-2">
            <span class="habit-color-dot" style="background:${color};"></span>
            <span class="habit-title">${habit.title}</span>
          </div>
        </td>
        <td class="text-center">
          <span class="badge bg-light text-dark small">${targetLabel}</span>
        </td>
        ${daysHtml}
      `;

      tbody.appendChild(tr);
    });
  }

  // Attach click handlers for toggles
  tbody.querySelectorAll('.habit-dot').forEach((btn) => {
    btn.addEventListener('click', () => {
      const habitId = btn.dataset.habitId;
      const date = btn.dataset.date;
      toggleHabitDay(habitId, date);
    });
  });

  // Week range label
  const weekRangeLabel = document.getElementById('weekRangeLabel');
  if (weekRangeLabel) {
    const start = new Date(week.start);
    const end = new Date(week.start);
    end.setDate(end.getDate() + 6);
    weekRangeLabel.textContent = `${start.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    })} – ${end.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    })}`;
  }

  // Sidebar stats
  updateSidebarStats(summary);
}

function toggleHabitDay(habitId, date) {
  fetch(`/api/habits/${habitId}/toggle`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ date }),
  })
    .then((res) => res.json())
    .then((board) => {
      currentBoard = board;
      renderHabitsBoard(board);
    })
    .catch((err) => {
      console.error('Failed to toggle habit day:', err);
    });
}

function updateSidebarStats(summary) {
  const todayLabel = document.getElementById('todayLabel');
  const todayBar = document.getElementById('todayProgressBar');
  const todayMessage = document.getElementById('todayMessage');

  const weeklyBar = document.getElementById('weeklyProgressBar');
  const weeklyMessage = document.getElementById('weeklyMessage');
  const streakHighlight = document.getElementById('streakHighlight');

  const todayTotal = summary.todayTotal || 0;
  const todayCompleted = summary.todayCompleted || 0;
  const todayPct =
    todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  if (todayLabel) {
    todayLabel.textContent = `${todayCompleted} / ${todayTotal} habits completed`;
  }
  if (todayBar) {
    todayBar.style.width = `${todayPct}%`;
  }
  if (todayMessage) {
    if (todayCompleted === 0) {
      todayMessage.textContent = 'Start by ticking just one habit today.';
    } else if (todayPct < 100) {
      todayMessage.textContent = 'Nice! See if you can complete the remaining habits.';
    } else {
      todayMessage.textContent = 'Perfect! All habits done for today 🎉';
    }
  }

  const weeklyPct = summary.avgWeeklyCompletion || 0;
  if (weeklyBar) {
    weeklyBar.style.width = `${weeklyPct}%`;
  }
  if (weeklyMessage) {
    if (weeklyPct === 0) {
      weeklyMessage.textContent = 'Your week is still blank. Tiny actions add up fast.';
    } else if (weeklyPct < 60) {
      weeklyMessage.textContent = 'You are building momentum. Keep going!';
    } else {
      weeklyMessage.textContent = 'Strong consistency this week. Great job 🔥';
    }
  }

  if (streakHighlight) {
    const streakInfo = summary.longestStreakHabit;
    if (!streakInfo || streakInfo.streak === 0) {
      streakHighlight.textContent = 'No streaks yet. Your first one is waiting 🔥';
    } else {
      streakHighlight.innerHTML = `
        <strong>${streakInfo.title}</strong><br/>
        <span class="small text-muted">${streakInfo.streak}-day streak</span>
      `;
    }
  }
}

// --- New habit modal & colour swatches ---

function setupColourSwatches() {
  const swatches = document.querySelectorAll('.habit-color-swatch');
  const hiddenInput = document.getElementById('habitColor');

  swatches.forEach((sw) => {
    sw.addEventListener('click', () => {
      swatches.forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      if (hiddenInput) hiddenInput.value = sw.dataset.color;
    });
  });
}

function setupHabitForm() {
  const form = document.getElementById('habitForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const titleInput = document.getElementById('habitTitle');
    const targetInput = document.getElementById('habitTargetPerWeek');
    const colorInput = document.getElementById('habitColor');

    const payload = {
      title: titleInput.value.trim(),
      targetPerWeek: targetInput.value,
      color: colorInput.value,
    };

    if (!payload.title) {
      alert('Please enter a habit name.');
      return;
    }

    fetch('/api/habits', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((board) => {
        currentBoard = board;
        renderHabitsBoard(board);

        // Reset form
        form.reset();
        if (colorInput) colorInput.value = '#198754';
        document
          .querySelectorAll('.habit-color-swatch')
          .forEach((s) => s.classList.remove('active'));
        const firstSwatch = document.querySelector('.habit-color-swatch');
        if (firstSwatch) firstSwatch.classList.add('active');

        // Close modal
        const modalEl = document.getElementById('habitModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
      })
      .catch((err) => {
        console.error('Failed to create habit:', err);
        alert('Failed to create habit. Please try again.');
      });
  });
}
