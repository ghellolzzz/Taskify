// /src/public/js/profile.js

document.addEventListener('DOMContentLoaded', () => {
  // Enable Bootstrap tooltips on badges once DOM is ready
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map((el) => new bootstrap.Tooltip(el));

  // Get userId from localStorage (set during login)
  let userId = localStorage.getItem('userId');
  if (!userId) {
    // Fallback for now; in production, redirect to login
    userId = '1';
    console.warn(
      'No userId in localStorage. Using fallback userId = 1. Make sure login sets userId properly.'
    );
  }

  Promise.all([
    fetch(`/api/profile/${userId}/overview`).then((res) => res.json()),
    fetch(`/api/profile/${userId}/badges`).then((res) => res.json()),
    fetch(`/api/profile/${userId}/activity`).then((res) => res.json()),
  ])
    .then(([overview, badges, activity]) => {
      setupProfileUI(overview);
      setupBadgesUI(badges);
      setupActivityUI(activity);
      setupThemeControls(overview.user);
      setupEditProfileModal(overview.user);
    })
    .catch((err) => {
      console.error('Failed to load profile data:', err);
    });
});

/**
 * Populate identity, streak, stats, categories, chain.
 * overview = { user, stats, categories, chain }
 */
function setupProfileUI(overview) {
  const { user, stats, categories, chain } = overview;

  // Identity
  document.getElementById('profileName').textContent = user.name;
  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileMemberSince').textContent =
    'Member since ' + new Date(user.createdAt).toLocaleDateString();
  document.getElementById('profileBio').textContent =
    user.bio || 'Add a short bio to describe yourself.';

  if (user.avatarUrl) {
    document.getElementById('profileAvatar').src = user.avatarUrl;
  }

  // Streak
  document.getElementById('streakCount').textContent = user.streakCount;
  document.getElementById('streakSubtitle').textContent =
    user.streakCount > 0
      ? `${user.streakCount}-day focus streak`
      : 'Start your first streak today!';

  // Mini stats
  document.getElementById('tasksToday').textContent =
    stats.tasksToday ?? 0;
  document.getElementById('tasksWeek').textContent = stats.tasksWeek ?? 0;
  document.getElementById('goalsDone').textContent = stats.goalsDone ?? 0;

  // Goals progress
  document.getElementById('goalsCompleted').textContent =
    stats.goalsDone ?? 0;
  document.getElementById('goalsTotal').textContent =
    stats.goalsTotal ?? 0;
  const goalsPct =
    stats.goalsTotal > 0
      ? Math.round((stats.goalsDone / stats.goalsTotal) * 100)
      : 0;
  document.getElementById('goalsProgressBar').style.width =
    goalsPct + '%';

  // Tasks completion
  document.getElementById('tasksCompletedRange').textContent =
    stats.tasksCompletedRange ?? 0;
  document.getElementById('tasksTotalRange').textContent =
    stats.tasksTotalRange ?? 0;
  const tasksPct =
    stats.tasksTotalRange > 0
      ? Math.round(
          (stats.tasksCompletedRange / stats.tasksTotalRange) * 100
        )
      : 0;
  document.getElementById('tasksProgressBar').style.width =
    tasksPct + '%';

  // Focus areas (categories)
  const focusCardBody = document.querySelector(
    '.card-body:has(#goalsMessage)'
  ).parentElement.nextElementSibling; 

  const categoriesContainer = document.querySelector(
    '#categoriesContainer'
  );
  if (categoriesContainer) {
    categoriesContainer.innerHTML = '';
    const totalTasksAcrossCategories = categories.reduce(
      (sum, c) => sum + c.taskCount,
      0
    );

    categories.forEach((cat) => {
      const percentage =
        totalTasksAcrossCategories > 0
          ? Math.round((cat.taskCount / totalTasksAcrossCategories) * 100)
          : 0;
      const wrapper = document.createElement('div');
      wrapper.classList.add('mb-2');
      wrapper.innerHTML = `
        <div class="d-flex justify-content-between small mb-1">
          <span>${cat.name}</span>
          <span>${cat.taskCount} tasks</span>
        </div>
        <div class="progress" style="height: 6px;">
          <div class="progress-bar bg-success" style="width:${percentage}%;"></div>
        </div>
      `;
      categoriesContainer.appendChild(wrapper);
    });
  }

  // 7-day chain
  const chainContainer = document.getElementById('sevenDayChain');
  if (chainContainer && Array.isArray(chain)) {
    chainContainer.innerHTML = '';
    let activeCount = 0;
    chain.forEach((day) => {
      const div = document.createElement('div');
      div.classList.add('chain-day');
      if (day.active) {
        div.classList.add('active');
        activeCount++;
      }
      chainContainer.appendChild(div);
    });
    document.getElementById(
      'chainCaption'
    ).textContent = `Active ${activeCount} of the last 7 days.`;
  }
}

/**
 * Populate badges tab.
 * badges = { unlocked: [], locked: [] }
 */
function setupBadgesUI(badges) {
  const { unlocked, locked } = badges;

  const unlockedContainer = document.getElementById(
    'unlockedBadgesContainer'
  );
  const lockedContainer = document.getElementById(
    'lockedBadgesContainer'
  );

  if (unlockedContainer) {
    unlockedContainer.innerHTML = '';
    unlocked.forEach((b) => {
      const col = document.createElement('div');
      col.className = 'col-md-4 col-sm-6';
      const earnedDate = b.awardedAt
        ? new Date(b.awardedAt).toLocaleDateString()
        : '';
      col.innerHTML = `
        <div class="achievement-card" data-bs-toggle="tooltip"
             title="${b.description || ''}">
          <div class="achievement-icon">
            ${b.icon || '🏅'}
          </div>
          <div>
            <div class="small fw-semibold">${b.name}</div>
            <div class="small text-muted">
              ${b.description || ''}
            </div>
            ${
              earnedDate
                ? `<div class="small text-muted">Earned on ${earnedDate}</div>`
                : ''
            }
          </div>
        </div>
      `;
      unlockedContainer.appendChild(col);
    });
  }

  if (lockedContainer) {
    lockedContainer.innerHTML = '';
    locked.forEach((b) => {
      const col = document.createElement('div');
      col.className = 'col-md-4 col-sm-6';
      col.innerHTML = `
        <div class="achievement-card locked" data-bs-toggle="tooltip"
             title="${b.description || ''}">
          <div class="achievement-icon">
            🔒
          </div>
          <div>
            <div class="small fw-semibold">${b.name}</div>
            <div class="small text-muted">
              ${b.description || ''}
            </div>
          </div>
        </div>
      `;
      lockedContainer.appendChild(col);
    });
  }

  // Re-init tooltips because we created new elements
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map((el) => new bootstrap.Tooltip(el));
}

/**
 * Populate activity tab.
 * activity = { heatmap: [], recent: [] }
 */
function setupActivityUI(activity) {
  const { heatmap, recent } = activity;

  const heatmapContainer = document.getElementById('activityHeatmap');
  if (heatmapContainer) {
    heatmapContainer.innerHTML = '';
    heatmap.forEach((day) => {
      const cell = document.createElement('div');
      cell.classList.add('heat-cell');
      if (day.level && day.level > 0) {
        cell.classList.add(`level-${day.level}`);
      }
      heatmapContainer.appendChild(cell);
    });
  }

  const recentList = document.getElementById('recentActivityList');
  if (recentList) {
    recentList.innerHTML = '';
    recent.forEach((event) => {
      const li = document.createElement('li');
      li.classList.add('list-group-item');

      let emoji = '📌';
      if (event.type === 'TASK_COMPLETED') emoji = '✅';
      else if (event.type === 'TASK_CREATED') emoji = '📝';
      else if (event.type === 'GOAL_COMPLETED') emoji = '🎯';
      else if (event.type === 'CALENDAR_NOTE') emoji = '📅';

      const when = new Date(event.createdAt).toLocaleString();
      li.innerHTML = `
        ${emoji} ${event.label}
        <span class="text-muted">· ${when}</span>
      `;
      recentList.appendChild(li);
    });
  }
}

/**
 * Setup theme & accent controls that persist via PUT /api/profile/:userId
 */

function setupThemeControls(user) {
  const userId = user.id;

  // Apply initial theme + accent
  if (user.theme === 'dark') {
    document.body.classList.remove('profile-theme-light');
    document.body.classList.add('profile-theme-dark');
    document.getElementById('btnThemeLight').classList.remove('active');
    document.getElementById('btnThemeDark').classList.add('active');
  } else {
    document.body.classList.add('profile-theme-light');
  }

  if (user.accentColor) {
    document.documentElement.style.setProperty(
      '--accent-color',
      user.accentColor
    );
  }

  const btnLight = document.getElementById('btnThemeLight');
  const btnDark = document.getElementById('btnThemeDark');

  btnLight.addEventListener('click', () => {
    document.body.classList.remove('profile-theme-dark');
    document.body.classList.add('profile-theme-light');
    btnLight.classList.add('active');
    btnDark.classList.remove('active');

    saveProfileTheme(userId, { theme: 'light' });
  });

  btnDark.addEventListener('click', () => {
    document.body.classList.remove('profile-theme-light');
    document.body.classList.add('profile-theme-dark');
    btnDark.classList.add('active');
    btnLight.classList.remove('active');

    saveProfileTheme(userId, { theme: 'dark' });
  });

  // Accent swatches
  document.querySelectorAll('.theme-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const color = swatch.dataset.color;
      document.documentElement.style.setProperty('--accent-color', color);

      document
        .querySelectorAll('.theme-swatch')
        .forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');

      saveProfileTheme(userId, { accentColor: color });
    });
  });
}

/**
 * PUT theme/accentColor to backend
 */
function saveProfileTheme(userId, partial) {
  fetch(`/api/profile/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  }).catch((err) => {
    console.error('Failed to update theme settings:', err);
  });
}

/**
 * Hook up Edit Profile modal to update name/bio/avatarUrl
 */
function setupEditProfileModal(user) {
  const form = document.getElementById('editProfileForm');
  const inputName = document.getElementById('editName');
  const inputBio = document.getElementById('editBio');
  const inputAvatarUrl = document.getElementById('editAvatarUrl');

  if (!form) return;

  // Pre-fill
  inputName.value = user.name || '';
  inputBio.value = user.bio || '';
  inputAvatarUrl.value = user.avatarUrl || '';

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const payload = {
      name: inputName.value.trim(),
      bio: inputBio.value.trim(),
      avatarUrl: inputAvatarUrl.value.trim() || null,
    };

    fetch(`/api/profile/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((updated) => {
        // Update the header UI immediately
        document.getElementById('profileName').textContent =
          updated.name || user.name;
        document.getElementById('profileBio').textContent =
          updated.bio || 'Add a short bio to describe yourself.';
        if (updated.avatarUrl) {
          document.getElementById('profileAvatar').src = updated.avatarUrl;
        }

        // Close modal
        const modalEl = document.getElementById('editProfileModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
      })
      .catch((err) => {
        console.error('Failed to update profile:', err);
      });
  });
}
