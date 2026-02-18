// src/public/habit/habits.js

function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return {
    ...extra,
    Authorization: 'Bearer ' + token,
  };
}

let currentBoard = null;
let pendingDeleteHabit = null; // { id, title, rowEl }
let editingHabitId = null;


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
  setupHabitCreateButton();
  setupHabitForm();
    const reminderEnabledEl = document.getElementById("habitReminderEnabled");
  if (reminderEnabledEl) {
    reminderEnabledEl.addEventListener("change", syncReminderInputsEnabled);
  }
  syncReminderInputsEnabled();

  setupDeleteModal();
  loadHabitsBoard();
});

function loadHabitsBoard() {
  fetch('/api/habits', {
    headers: authHeaders(),
  })
    .then((res) => {
      if (res.status === 401) {
        console.warn('Not authenticated. Redirecting to login.');
        // If you use a different login path, change this:
        window.location.href = '../login.html';
        return null;
      }

      if (!res.ok) {
        throw new Error('Failed to load habits board. HTTP ' + res.status);
      }

      return res.json();
    })
    .then((board) => {
      if (!board) return; // already handled (e.g. redirected)
      currentBoard = board;
      renderHabitsBoard(board);
    })
    .catch((err) => {
      console.error('Failed to load habits board:', err);
    });
}

function syncReminderInputsEnabled() {
  const enabledEl = document.getElementById("habitReminderEnabled");
  const timeEl = document.getElementById("habitReminderTime");
  const repeatEl = document.getElementById("habitReminderRepeat");
  if (!enabledEl || !timeEl || !repeatEl) return;

  const enabled = !!enabledEl.checked;
  timeEl.disabled = !enabled;
  repeatEl.disabled = !enabled;
}



function renderHabitsBoard(board) {
  if (!board || !board.week || !Array.isArray(board.week.days)) {
    console.error('Unexpected response for habits board:', board);
    return;
  }

  const { week, habits, summary, archivedHabits = [] } = board;

  // Week header labels (second header row)
  const headerRow = document.getElementById('habitsWeekHeaderRow');
  headerRow.innerHTML = '';

  // spacer cells for Habit + Target columns
  const spacerHabit = document.createElement('th');
  const spacerTarget = document.createElement('th');
  spacerTarget.classList.add('text-center');
  headerRow.appendChild(spacerHabit);
  headerRow.appendChild(spacerTarget);

  // day headers under "Week"
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

  // "Actions" header (first row) has no sub-header, so no extra <th> here

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
      <td colspan="10" class="text-center text-muted small py-4">
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
      week.days.forEach((day) => {
        const entry = habit.week.find((w) => w.date === day.date);
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

      const tp = habit.targetProgress || {};
      const ot = habit.onTrack || {};

      const done = Number(tp.done ?? habit.completionThisWeek ?? 0);
      const target = tp.target; // null = flexible
      const progressText = target ? `${done}/${target} this week` : `${done} done this week`;

      const badgeClass =
        ot.status === 'completed' ? 'ontrack-badge completed' :
        ot.status === 'ontrack'   ? 'ontrack-badge ontrack'   :
        ot.status === 'behind'    ? 'ontrack-badge behind'    :
        ot.status === 'atrisk'    ? 'ontrack-badge atrisk'    :
                                   'ontrack-badge flex';

      const badgeLabel = ot.label || (target ? 'On track' : 'Flexible');
      const hint = ot.hint ? String(ot.hint).replace(/"/g, '&quot;') : '';

      tr.innerHTML = `
        <td>
          <div class="d-flex align-items-start gap-2">
            <span class="habit-color-dot" style="background:${color};"></span>

            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="habit-title">${habit.title}</span>
                <span class="${badgeClass}" title="${hint}">
                  ${badgeLabel}
                </span>
              </div>

              <div class="habit-submeta">
                <span class="habit-progress-text">${progressText}</span>
                ${
                  target
                    ? `<span class="habit-expected">· expected by today: ${tp.expectedByToday ?? 0}</span>`
                    : ''
                }
              </div>
            </div>
          </div>
        </td>

        <td class="text-center">
          <span class="badge bg-light text-dark small">${targetLabel}</span>
        </td>

        ${daysHtml}

        <td class="text-end">
          <div class="dropdown habit-actions-dropdown">
            <button
              class="btn btn-sm btn-light habit-actions-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <button
                  class="dropdown-item habit-edit-btn"
                  type="button"
                  data-habit-id="${habit.id}"
                >
                  <i class="bi bi-pencil-square me-2"></i> Edit habit
                </button>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li>
                <button
                  class="dropdown-item habit-archive-btn"
                  type="button"
                  data-habit-id="${habit.id}"
                >
                  <i class="bi bi-archive me-2"></i> Archive habit
                </button>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li>
                <button
                  class="dropdown-item text-danger habit-delete-btn"
                  type="button"
                  data-habit-id="${habit.id}"
                  data-habit-title="${habit.title.replace(/"/g, '&quot;')}"
                >
                  <i class="bi bi-trash3 me-2"></i> Delete permanently
                </button>
              </li>
            </ul>
          </div>
        </td>
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

    // Archive buttons
  tbody.querySelectorAll('.habit-archive-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const habitId = btn.dataset.habitId;
      const rowEl = btn.closest('tr');
      archiveHabit(habitId, rowEl);
    });
  });

  // Delete buttons
  tbody.querySelectorAll('.habit-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const habitId = btn.dataset.habitId;
      const title = btn.dataset.habitTitle || 'this habit';
      const rowEl = btn.closest('tr');
      openHabitDeleteModal(habitId, title, rowEl);
    });
  });

  // Edit buttons
  tbody.querySelectorAll('.habit-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const habitId = btn.dataset.habitId;
      const habit = findHabitById(habitId);
      if (habit) {
        openHabitEditModal(habit);
      }
    });
  });

  renderArchivedHabits(archivedHabits);

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
  updatePatternsCard(board);
}

function findHabitById(habitId) {
  if (!currentBoard || !Array.isArray(currentBoard.habits)) return null;
  const idNum = Number(habitId);
  return currentBoard.habits.find((h) => h.id === idNum) || null;
}

function openHabitEditModal(habit) {
  setHabitModalMode('edit', habit);
  resetHabitFormFields(habit);

  const modalEl = document.getElementById('habitModal');
  if (!modalEl) return;
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function setHabitModalMode(mode, habit) {
  const titleEl = document.getElementById('habitModalTitle');
  const submitBtn = document.getElementById('habitModalSubmitBtn');
  const idInput = document.getElementById('habitId');

  if (mode === 'edit' && habit) {
    editingHabitId = habit.id;
    if (idInput) idInput.value = habit.id;
    if (titleEl) titleEl.textContent = 'Edit habit';
    if (submitBtn) submitBtn.textContent = 'Save changes';
  } else {
    editingHabitId = null;
    if (idInput) idInput.value = '';
    if (titleEl) titleEl.textContent = 'New habit';
    if (submitBtn) submitBtn.textContent = 'Create habit';
  }
}

function resetHabitFormFields(habit) {
  const titleInput = document.getElementById('habitTitle');
  const targetInput = document.getElementById('habitTargetPerWeek');
  const colorInput = document.getElementById('habitColor');
  const swatches = document.querySelectorAll('.habit-color-swatch');
    const reminderEnabledEl = document.getElementById("habitReminderEnabled");
  const reminderTimeEl = document.getElementById("habitReminderTime");
  const reminderRepeatEl = document.getElementById("habitReminderRepeat");


  if (habit) {
    if (titleInput) titleInput.value = habit.title || '';
    if (targetInput) {
      targetInput.value =
        habit.targetPerWeek !== null && habit.targetPerWeek !== undefined
          ? String(habit.targetPerWeek)
          : '';
    }
    if (colorInput) colorInput.value = habit.color || '#198754';

    swatches.forEach((sw) => {
      sw.classList.toggle('active', sw.dataset.color === colorInput.value);
    });

        if (reminderEnabledEl) reminderEnabledEl.checked = !!habit.reminderEnabled;
    if (reminderTimeEl) reminderTimeEl.value = habit.reminderTime || "09:00";
    if (reminderRepeatEl) reminderRepeatEl.value = habit.reminderRepeat || "daily";

  } else {
    if (titleInput) titleInput.value = '';
    if (targetInput) targetInput.value = '';
    if (colorInput) colorInput.value = '#198754';

    swatches.forEach((sw, idx) => {
      sw.classList.toggle('active', idx === 0);
    });

        if (reminderEnabledEl) reminderEnabledEl.checked = false;
    if (reminderTimeEl) reminderTimeEl.value = "09:00";
    if (reminderRepeatEl) reminderRepeatEl.value = "daily";

  }
    syncReminderInputsEnabled();
}


function renderArchivedHabits(archivedHabits) {
  const listEl = document.getElementById('archivedHabitsList');
  const countBadge = document.getElementById('archivedCountBadge');
  const card = document.getElementById('archivedHabitsCard');

  if (!listEl || !countBadge || !card) return;

  const count = archivedHabits.length;
  countBadge.textContent = count === 1 ? '1 habit' : `${count} habits`;

  listEl.innerHTML = '';

  if (count === 0) {
    card.classList.add('archived-empty-state');
    listEl.innerHTML = `
      <div class="archived-habits-empty">
        You haven't archived any habits yet.
      </div>
    `;
    return;
  }

  card.classList.remove('archived-empty-state');

  archivedHabits.forEach((habit) => {
    const color = habit.color || 'var(--accent-color)';
    const container = document.createElement('div');
    container.className = 'archived-habit-item';
    container.dataset.habitId = habit.id;

    let metaText = '';
    if (habit.archivedAt) {
      const d = new Date(habit.archivedAt);
      metaText = `Archived on ${d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      })}`;
    }

    container.innerHTML = `
      <div class="d-flex align-items-center gap-2 flex-grow-1">
        <span class="habit-color-dot" style="background:${color};"></span>
        <div class="flex-grow-1">
          <div class="archived-habit-name text-truncate">${habit.title}</div>
          ${
            metaText
              ? `<div class="archived-habit-meta">${metaText}</div>`
              : ''
          }
        </div>
      </div>
      <div class="btn-group btn-group-sm archived-actions" role="group">
        <button
          type="button"
          class="btn btn-outline-success archived-unarchive-btn"
          data-habit-id="${habit.id}"
          data-habit-title="${habit.title.replace(/"/g, '&quot;')}"
        >
          <i class="bi bi-arrow-counterclockwise me-1"></i>Restore
        </button>
        <button
          type="button"
          class="btn btn-outline-danger archived-delete-btn"
          data-habit-id="${habit.id}"
          data-habit-title="${habit.title.replace(/"/g, '&quot;')}"
        >
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    `;

    listEl.appendChild(container);
  });

  // Wire up archive list buttons
  listEl.querySelectorAll('.archived-unarchive-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const habitId = btn.dataset.habitId;
      const rowEl = btn.closest('.archived-habit-item');
      unarchiveHabit(habitId, rowEl);
    });
  });

  listEl.querySelectorAll('.archived-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const habitId = btn.dataset.habitId;
      const title = btn.dataset.habitTitle || 'this habit';
      const rowEl = btn.closest('.archived-habit-item');
      openHabitDeleteModal(habitId, title, rowEl);
    });
  });
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

function archiveHabit(habitId, rowEl) {
  if (rowEl) {
    rowEl.classList.add('habit-row-removing');
  }

  fetch(`/api/habits/${habitId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
    .then((res) => {
      if (res.status === 401) {
        console.warn('Not authenticated. Redirecting to login.');
        window.location.href = '../login.html';
        return null;
      }

      if (!res.ok) {
        throw new Error('Failed to archive habit. HTTP ' + res.status);
      }

      return res.json();
    })
    .then((board) => {
      if (!board) return;
      currentBoard = board;
      renderHabitsBoard(board);
    })
    .catch((err) => {
      console.error('Failed to archive habit:', err);
      if (rowEl) rowEl.classList.remove('habit-row-removing');
    });
}


function unarchiveHabit(habitId, itemEl) {
  if (itemEl) {
    itemEl.classList.add('habit-row-removing');
  }

  fetch(`/api/habits/${habitId}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ isArchived: false }),
  })
    .then((res) => {
      if (res.status === 401) {
        console.warn('Not authenticated. Redirecting to login.');
        window.location.href = '../login.html';
        return null;
      }

      if (!res.ok) {
        throw new Error('Failed to unarchive habit. HTTP ' + res.status);
      }

      return res.json();
    })
    .then((board) => {
      if (!board) return;
      currentBoard = board;
      renderHabitsBoard(board);
    })
    .catch((err) => {
      console.error('Failed to unarchive habit:', err);
      if (itemEl) itemEl.classList.remove('habit-row-removing');
    });
}


function updateSidebarStats(summary) {
  const todayLabel = document.getElementById('todayLabel');
  const todayBar = document.getElementById('todayProgressBar');
  const todayMessage = document.getElementById('todayMessage');

  const weeklyBar = document.getElementById('weeklyProgressBar');
  const weeklyMessage = document.getElementById('weeklyMessage');
  const weeklyDeltaLabel = document.getElementById('weeklyDeltaLabel');
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
  const prevWeeklyPct = summary.prevWeekCompletionPct ?? 0;
const delta = weeklyPct - prevWeeklyPct;

if (weeklyDeltaLabel) {
  if (summary.activeHabits === 0) {
    weeklyDeltaLabel.textContent = '';
  } else if (delta === 0) {
    weeklyDeltaLabel.textContent = `Same as last week (${prevWeeklyPct}%).`;
  } else if (delta > 0) {
    weeklyDeltaLabel.textContent = `▲ Up ${delta}% vs last week (${prevWeeklyPct}%).`;
  } else {
    weeklyDeltaLabel.textContent = `▼ Down ${Math.abs(delta)}% vs last week (${prevWeeklyPct}%).`;
  }
}

  if (weeklyBar) {
    weeklyBar.style.width = `${weeklyPct}%`;
  }
  if (weeklyMessage) {
  if (weeklyPct === 0) {
    weeklyMessage.textContent = 'Your week is still blank. Tiny actions add up fast.';
  } else if (delta > 0) {
    weeklyMessage.textContent = 'Nice — you’re improving from last week. Keep it going!';
  } else if (delta < 0) {
    weeklyMessage.textContent = 'Slight dip from last week — you can still catch up.';
  } else {
    weeklyMessage.textContent = 'Steady consistency. Try to push a little higher!';
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

function updatePatternsCard(board) {
  const bestDayEl = document.getElementById('patternsBestDay');
  const perfectEl = document.getElementById('patternsPerfectDays');
  const hintEl = document.getElementById('patternsHint');

  if (!bestDayEl || !perfectEl || !hintEl) return;

  const habits = Array.isArray(board?.habits) ? board.habits : [];
  const days = Array.isArray(board?.week?.days) ? board.week.days : [];

  const activeHabitsCount = habits.length;

  if (activeHabitsCount === 0 || days.length !== 7) {
    bestDayEl.textContent = '—';
    perfectEl.textContent = '0';
    hintEl.textContent = 'Create a habit to start seeing your patterns.';
    return;
  }

  // Count completions per day across all habits
  const counts = days.map((day) => {
    let completed = 0;

    habits.forEach((h) => {
      const entry = Array.isArray(h.week) ? h.week.find((w) => w.date === day.date) : null;
      if (entry && entry.completed) completed++;
    });

    return { ...day, completed };
  });

  // Best day = max completed
  const maxCompleted = Math.max(...counts.map((c) => c.completed));
  const bestDays = counts.filter((c) => c.completed === maxCompleted);

  // Prefer today if tie, else earliest best day
  const best =
    bestDays.find((d) => d.isToday) ||
    bestDays[0];

  bestDayEl.textContent = `${best.label} (${best.completed}/${activeHabitsCount})`;

  // Perfect days = days where all habits done
  const perfectDays = counts.filter((c) => c.completed === activeHabitsCount);

  perfectEl.textContent = String(perfectDays.length);

  if (maxCompleted === 0) {
    hintEl.textContent = 'No check-ins yet this week — start with one small win today.';
  } else if (perfectDays.length > 0) {
    hintEl.textContent = `You had ${perfectDays.length} perfect day${perfectDays.length === 1 ? '' : 's'} this week. Nice consistency.`;
  } else {
    hintEl.textContent = `Your strongest day so far is ${best.label}. Aim for a full “perfect day”!`;
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

function setupHabitCreateButton() {
  const btn = document.getElementById('habitNewBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    // Reset modal to "create" mode
    setHabitModalMode('create');
    resetHabitFormFields(null);
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

        const reminderEnabledEl = document.getElementById("habitReminderEnabled");
    const reminderTimeEl = document.getElementById("habitReminderTime");
    const reminderRepeatEl = document.getElementById("habitReminderRepeat");

    const payload = {
      title: titleInput.value.trim(),
      targetPerWeek: targetInput.value,
      color: colorInput.value,

      reminderEnabled: reminderEnabledEl ? reminderEnabledEl.checked : false,
      reminderTime: reminderTimeEl ? reminderTimeEl.value : "09:00",
      reminderRepeat: reminderRepeatEl ? reminderRepeatEl.value : "daily",
    };


    const isEdit = !!editingHabitId;
    const url = isEdit ? `/api/habits/${editingHabitId}` : '/api/habits';
    const method = isEdit ? 'PATCH' : 'POST';

    fetch(url, {
      method,
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (res.status === 401) {
          console.warn('Not authenticated. Redirecting to login.');
          window.location.href = '../login.html';
          return null;
        }

        if (!res.ok) {
          throw new Error(
            (isEdit ? 'Failed to update habit. HTTP ' : 'Failed to create habit. HTTP ') +
              res.status
          );
        }

        return res.json();
      })
      .then((board) => {
        if (!board) return;

        currentBoard = board;
        renderHabitsBoard(board);

        // Reset form back into "create" mode for next time
        form.reset();
        setHabitModalMode('create');
        resetHabitFormFields(null);

        // Close modal
        const modalEl = document.getElementById('habitModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      })
      .catch((err) => {
        console.error(isEdit ? 'Failed to update habit:' : 'Failed to create habit:', err);
        alert(isEdit ? 'Failed to update habit. Please try again.' : 'Failed to create habit. Please try again.');
      });
  });
}


// --- Delete habit modal wiring ---

function setupDeleteModal() {
  const confirmBtn = document.getElementById('habitDeleteConfirmBtn');
  if (!confirmBtn) return;

  confirmBtn.addEventListener('click', () => {
    if (!pendingDeleteHabit) return;

    const { id, rowEl } = pendingDeleteHabit;
    const modalEl = document.getElementById('habitDeleteModal');
    const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;

    if (rowEl) {
      rowEl.classList.add('habit-row-removing');
    }

    fetch(`/api/habits/${id}/hard`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
      .then((res) => res.json())
      .then((board) => {
        pendingDeleteHabit = null;
        if (modal) modal.hide();
        currentBoard = board;
        renderHabitsBoard(board);
      })
      .catch((err) => {
        console.error('Failed to delete habit:', err);
        if (rowEl) rowEl.classList.remove('habit-row-removing');
      });
  });
}

function openHabitDeleteModal(habitId, title, rowEl) {
  pendingDeleteHabit = { id: habitId, title, rowEl };

  const msgEl = document.getElementById('habitDeleteMessage');
  if (msgEl) {
    msgEl.textContent = `Delete "${title}"?`;
  }

  const modalEl = document.getElementById('habitDeleteModal');
  if (!modalEl) return;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}
