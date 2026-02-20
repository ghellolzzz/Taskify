function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  if (!token) return { ...extra };
  return { ...extra, Authorization: 'Bearer ' + token };
}

const SHARE_SYNC_CHANNEL = 'taskify-habits-sync';
const SHARE_SYNC_STORAGE_KEY = '__taskify_habits_sync__';

let shareBC = null;
let lastRemoteAt = 0;
let refreshTimer = null;

function scheduleShareRefresh(msg) {
  if (!msg || msg.type !== 'habits:changed') return;
  if (!msg.at || msg.at <= lastRemoteAt) return;

  lastRemoteAt = msg.at;

  if (refreshTimer) return;

  refreshTimer = setTimeout(() => {
    refreshTimer = null;

    showUpdating(true);

    load().finally(() => {
      showUpdating(false);
    });

  }, 300);
}


function setupShareMultiTabSync() {
  if ('BroadcastChannel' in window) {
    shareBC = new BroadcastChannel(SHARE_SYNC_CHANNEL);
    shareBC.onmessage = (ev) => {
      scheduleShareRefresh(ev?.data);
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key !== SHARE_SYNC_STORAGE_KEY || !e.newValue) return;
    try {
      const msg = JSON.parse(e.newValue);
      scheduleShareRefresh(msg);
    } catch (_) {}
  });
}

function showUpdating(on) {
  const el = document.getElementById('liveBadge');
  if (!el) return;
  el.style.display = on ? '' : 'none';
}

function tokenFromPath() {
  // /share/habits/<token>
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[2] || '';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function setState(msg) {
  const el = document.getElementById('shareState');
  if (el) el.textContent = msg;
}

function showBody(show) {
  document.getElementById('shareBody').style.display = show ? '' : 'none';
}

function pct(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function barRow(h, windowDays) {
  const wrap = document.createElement('div');
  wrap.className = 'habit-row';

  const completedDays = Number(h.completedDays ?? 0);
  const completionRate = pct(h.completionRate);

  const currentStreak = Number(h.currentStreak ?? 0);
  const bestStreak = Number(h.bestStreak ?? 0);

  const left = document.createElement('div');
  left.className = 'habit-left';
  left.innerHTML = `
    <div class="habit-title">
      <span class="dot" style="background:${escapeHtml(h.color || '#999')}"></span>
      ${escapeHtml(h.title)}
    </div>
    <div class="muted small">
      ${completedDays} / ${windowDays} days · streak ${currentStreak} (best ${bestStreak})
    </div>
  `;

  const right = document.createElement('div');
  right.className = 'habit-right';
  right.innerHTML = `<div class="muted small">${completionRate}%</div>`;

  const bar = document.createElement('div');
  bar.className = 'progress';
  const fill = document.createElement('div');
  fill.className = 'progress-fill';
  fill.style.width = `${completionRate}%`;
  bar.appendChild(fill);

  wrap.appendChild(left);
  wrap.appendChild(right);
  wrap.appendChild(bar);

  return wrap;
}

let shareData = null;
let activeWindowKey = 'd7';

function renderWindow(win) {
  if (!win) return;

  // subtitle
  document.getElementById('subtitle').textContent =
    `${shareData.card.owner?.name || 'User'} • ${win.range.start} to ${win.range.end}`;

  // metrics
  document.getElementById('mHabits').textContent = win.totals.habitsCount;
  document.getElementById('mCompletions').textContent = win.totals.totalCompletions;
  document.getElementById('mAvg').textContent = `${win.totals.avgDailyRate}%`;

  // trend row (mostly useful for 30d)
  const trendRow = document.getElementById('trendRow');
  const trendText = document.getElementById('trendText');
  const weeklyText = document.getElementById('weeklyText');

  if (win.trend && (win.weekly?.length || win.trend.delta != null)) {
    trendRow.style.display = '';

    const d = win.trend.delta;
    if (d == null) trendText.textContent = '—';
    else if (d > 0) trendText.textContent = `Up ${d}% vs previous week`;
    else if (d < 0) trendText.textContent = `Down ${Math.abs(d)}% vs previous week`;
    else trendText.textContent = `Flat vs previous week`;

    if (Array.isArray(win.weekly) && win.weekly.length) {
      const last = win.weekly[win.weekly.length - 1];
      weeklyText.textContent = `${last.label}: ${last.totalCompletions} completions (${last.completionRate}%)`;
    } else {
      weeklyText.textContent = '—';
    }
  } else {
    trendRow.style.display = 'none';
  }

  // daily grid
  const dailyGrid = document.getElementById('dailyGrid');
  dailyGrid.innerHTML = '';
  for (const d of win.daily) {
    const el = document.createElement('div');
    el.className = 'day';
    el.innerHTML = `
      <div class="day-date">${escapeHtml(d.date.slice(5))}</div>
      <div class="day-rate">${pct(d.completionRate)}%</div>
      <div class="muted small">${d.completedCount}/${d.totalHabits}</div>
    `;
    dailyGrid.appendChild(el);
  }

  // top habits
  const top = document.getElementById('topHabits');
  top.innerHTML = '';
  win.topHabits.forEach(h => top.appendChild(barRow(h, win.range.days)));

  // all habits
  const all = document.getElementById('allHabits');
  all.innerHTML = '';
  win.perHabit.forEach(h => all.appendChild(barRow(h, win.range.days)));
}

function setActiveWindow(key) {
  activeWindowKey = key;

  const btn7 = document.getElementById('btn7');
  const btn30 = document.getElementById('btn30');

  if (btn7) btn7.classList.toggle('active', key === 'd7');
  if (btn30) btn30.classList.toggle('active', key === 'd30');

  const win = shareData?.card?.windows?.[key];
  renderWindow(win);
}

async function load() {
  const token = tokenFromPath();
  if (!token) {
    setState('Invalid link.');
    return;
  }

  setState('Loading...');
  showBody(false);

  const res = await fetch(`/api/share/habits/${token}`, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (data.error === 'LOGIN_REQUIRED') setState('Friends-only: please login to view.');
    else if (data.error === 'ACCESS_DENIED') setState('Friends-only: access denied.');
    else if (data.error === 'LINK_EXPIRED') setState('This link has expired.');
    else setState(data.error || 'Failed to load.');
    return;
  }

  shareData = data;

  // wire toggles
  document.getElementById('btn7')?.addEventListener('click', () => setActiveWindow('d7'));
  document.getElementById('btn30')?.addEventListener('click', () => setActiveWindow('d30'));

  setState('');
  showBody(true);
  setActiveWindow('d7');
}

setupShareMultiTabSync();
load();
