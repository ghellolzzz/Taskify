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
let habitsSortMode = localStorage.getItem('habitsSortMode') || 'created';
let habitsSortable = null;


// --- Optimistic UI state ---
const appState = {
  // key: "habitId-YYYY-MM-DD" -> { habitId, date, prevCompleted, desiredCompleted, startedAt }
  pendingOps: new Map(),
};

function opKey(habitId, date) {
  return `${habitId}-${date}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message, variant = 'danger', delayMs = 3000) {
  const host = document.getElementById('toastHost');
  if (!host || !window.bootstrap?.Toast) return;

  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${variant} border-0`;
  el.role = 'alert';
  el.ariaLive = 'assertive';
  el.ariaAtomic = 'true';

  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  host.appendChild(el);
  const t = bootstrap.Toast.getOrCreateInstance(el, { delay: delayMs });
  t.show();

  el.addEventListener('hidden.bs.toast', () => el.remove());
}
const sharedInboxState = {
  items: [],
  unread: 0,
};

// Habits-page only: hide shared items locally (does NOT affect Friends inbox)
const SHARED_HIDE_KEY = '__taskify_habits_hidden_share_ids__';

function getHiddenShareIds() {
  try {
    const raw = localStorage.getItem(SHARED_HIDE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set((Array.isArray(arr) ? arr : []).map(Number).filter(Number.isFinite));
  } catch {
    return new Set();
  }
}

function saveHiddenShareIds(set) {
  try { localStorage.setItem(SHARED_HIDE_KEY, JSON.stringify([...set])); } catch {}
}

function hideShareIdLocally(id) {
  const hidden = getHiddenShareIds();
  hidden.add(Number(id));
  saveHiddenShareIds(hidden);
}

function isHiddenLocally(id) {
  return getHiddenShareIds().has(Number(id));
}


function timeAgoShort(iso) {
  const t = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

async function sharedInboxAction(id, action) {
  const res = await fetch(`/api/activity/inbox/habit-share/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
}

function renderSharedWithYou() {
  const badge = document.getElementById('sharedInboxBadge');
  const card = document.getElementById('sharedWithYouCard');
  const count = document.getElementById('sharedWithYouCount');
  const list = document.getElementById('sharedWithYouList');
  const empty = document.getElementById('sharedWithYouEmpty');

  if (!badge || !card || !count || !list) return;
  const visibleItems = (sharedInboxState.items || []).filter(it => !isHiddenLocally(it.id));


  // badge on Share button
  if (sharedInboxState.unread > 0) {
    badge.style.display = '';
    badge.textContent = String(sharedInboxState.unread);
  } else {
    badge.style.display = 'none';
  }

  // always show card
  card.style.display = '';

  // empty vs list
  if (!visibleItems.length) {
    count.textContent = '0';
    list.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }

  if (empty) empty.style.display = 'none';

  count.textContent = String(visibleItems.length);
  list.innerHTML = '';


  visibleItems.forEach((item) => {
    const sender = item.sender || {};
    const name = sender.name || sender.email || 'Someone';

    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-start gap-2';

    const left = document.createElement('div');
    left.className = 'flex-grow-1';
    left.innerHTML = `
      <div class="fw-semibold">
        ${escapeHtml(name)}
        ${item.isRead ? '' : `<span class="badge text-bg-success ms-2">New</span>`}
        ${item.isExpired ? `<span class="badge text-bg-secondary ms-2">Expired</span>` : ''}
      </div>
      <div class="small text-muted">habit progress • ${escapeHtml(timeAgoShort(item.createdAt))} ago</div>
      ${item.message ? `<div class="small mt-1">${escapeHtml(item.message)}</div>` : ''}
    `;

    const right = document.createElement('div');
    right.className = 'd-flex gap-2';

    const view = document.createElement('button');
    view.className = 'btn btn-outline-primary btn-sm';
    view.innerHTML = `<i class="bi bi-box-arrow-up-right me-1"></i>View`;
    view.onclick = async () => {
  if (!item.isRead) {
    item.isRead = true;
    sharedInboxState.unread = Math.max(0, (sharedInboxState.unread || 0) - 1);
    renderSharedWithYou();
  }

  try { await sharedInboxAction(item.id, 'READ'); } catch (_) {}
  if (item.link?.path) window.location.href = item.link.path;
};


    const dismiss = document.createElement('button');
    dismiss.className = 'btn btn-outline-secondary btn-sm';
    dismiss.innerHTML = `<i class="bi bi-x-lg me-1"></i>`;
    dismiss.title = 'Dismiss';
    dismiss.onclick = async () => {
  hideShareIdLocally(item.id);
  renderSharedWithYou();
  try {
    await sharedInboxAction(item.id, 'DISMISS');
    await loadSharedWithYou(true);
  } catch (e) {
    showToast(e.message || 'Failed', 'danger', 2000);
  }
};


    right.appendChild(view);
    right.appendChild(dismiss);

    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });
}

async function loadSharedWithYou(silent = true) {
  // Habits page should keep showing shares even if dismissed in Friends inbox
  const urlA = '/api/activity/inbox?limit=5&type=HABIT_SHARE&includeDismissed=1';
  const urlB = '/api/activity/inbox?limit=5&type=HABIT_SHARE';

  let res = await fetch(urlA, { headers: authHeaders() });

  // fallback if backend doesn't support includeDismissed yet
  if (!res.ok && (res.status === 400 || res.status === 404)) {
    res = await fetch(urlB, { headers: authHeaders() });
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (!silent) showToast(data.error || 'Failed to load shared items', 'danger', 2000);
    return;
  }

  sharedInboxState.items = data.items || [];
  sharedInboxState.unread = data.counts?.unread || 0;
  renderSharedWithYou();
}


function getTodayDateKey(board) {
  const days = Array.isArray(board?.week?.days) ? board.week.days : [];
  return days.find(d => d.isToday)?.date || null;
}

function getCellCompleted(board, habitId, date) {
  const habits = Array.isArray(board?.habits) ? board.habits : [];
  const hId = Number(habitId);
  const habit = habits.find(h => h.id === hId);
  if (!habit || !Array.isArray(habit.week)) return false;

  const entry = habit.week.find(w => w.date === date);
  return !!entry?.completed;
}

// idempotent set (NOT toggle) so reapplying pending ops is safe
function setCellCompleted(board, habitId, date, completed) {
  const habits = Array.isArray(board?.habits) ? board.habits : [];
  const hId = Number(habitId);
  const habit = habits.find(h => h.id === hId);
  if (!habit) return;

  if (!Array.isArray(habit.week)) habit.week = [];
  const entry = habit.week.find(w => w.date === date);

  if (entry) entry.completed = !!completed;
  else habit.week.push({ date, completed: !!completed });

  // keep weekly count consistent for sorting/labels
  habit.completionThisWeek = habit.week.filter(d => d.completed).length;
}

function recomputeDerivedSummary(board) {
  if (!board) return;

  const habits = Array.isArray(board.habits) ? board.habits : [];
  const archivedCount = Array.isArray(board.archivedHabits)
    ? board.archivedHabits.length
    : (board.summary?.archivedCount ?? 0);

  const todayKey = getTodayDateKey(board);

  let todayCompleted = 0;
  let totalCompletedChecksThisWeek = 0;

  habits.forEach(h => {
    const weekArr = Array.isArray(h.week) ? h.week : [];
    if (todayKey) {
      const e = weekArr.find(w => w.date === todayKey);
      if (e?.completed) todayCompleted++;
    }
    totalCompletedChecksThisWeek += weekArr.filter(w => w.completed).length;
  });

  const totalPossible = habits.length * 7;
  const avgWeeklyCompletion = totalPossible > 0
    ? Math.round((totalCompletedChecksThisWeek / totalPossible) * 100)
    : 0;

  board.summary = board.summary || {};
  board.summary.activeHabits = habits.length;
  board.summary.archivedCount = archivedCount;
  board.summary.totalHabits = habits.length + archivedCount;

  board.summary.todayTotal = habits.length;
  board.summary.todayCompleted = todayCompleted;
  board.summary.avgWeeklyCompletion = avgWeeklyCompletion;

}

function reapplyPendingOps(board) {
  if (!board) return;

  for (const op of appState.pendingOps.values()) {
    setCellCompleted(board, op.habitId, op.date, op.desiredCompleted);
  }

  recomputeDerivedSummary(board);
}

// --- Undo state (Part B) ---
const undoState = {
  // habitId -> { type: 'archive'|'hardDelete', snapshot, timerId, toastEl }
  pending: new Map(),
};

// shallow-safe clone for board snapshots
function cloneBoard(board) {
  return board ? JSON.parse(JSON.stringify(board)) : null;
}

function showUndoToast(message, actionLabel, onUndo, delayMs) {
  const host = document.getElementById('toastHost');
  if (!host || !window.bootstrap?.Toast) return null;

  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-dark border-0`;
  el.role = 'alert';
  el.ariaLive = 'assertive';
  el.ariaAtomic = 'true';

  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn btn-sm btn-outline-light me-2 my-2 undo-toast-btn">
        ${escapeHtml(actionLabel)}
      </button>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  host.appendChild(el);

  const undoBtn = el.querySelector('.undo-toast-btn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      try { onUndo?.(); } finally {
        const inst = bootstrap.Toast.getInstance(el);
        if (inst) inst.hide();
      }
    });
  }

  const t = bootstrap.Toast.getOrCreateInstance(el, { delay: delayMs, autohide: true });
  t.show();

  el.addEventListener('hidden.bs.toast', () => el.remove());
  return el;
}

// --- Multi-tab sync (Part C) ---
// Unique per-tab id (session scoped)
const TASKIFY_TAB_ID =
  sessionStorage.getItem('TASKIFY_TAB_ID') ||
  (crypto?.randomUUID?.() || String(Math.random()).slice(2));

sessionStorage.setItem('TASKIFY_TAB_ID', TASKIFY_TAB_ID);

// Broadcast + fallback key
const HABITS_SYNC_CHANNEL = 'taskify-habits-sync';
const HABITS_SYNC_STORAGE_KEY = '__taskify_habits_sync__';

let habitsBC = null;
let lastRemoteSyncAt = 0;
let refreshTimerId = null;

function broadcastHabitsChanged(reason = 'changed') {
  const msg = {
    type: 'habits:changed',
    reason,
    at: Date.now(),
    tabId: TASKIFY_TAB_ID,
  };

  // 1) Best: BroadcastChannel
  if (habitsBC) {
    try { habitsBC.postMessage(msg); } catch (_) {}
  }

  // 2) Fallback: storage event (fires in other tabs)
  try {
    localStorage.setItem(HABITS_SYNC_STORAGE_KEY, JSON.stringify(msg));
  } catch (_) {}
}

function scheduleHabitsRefreshFromRemote(msg) {
  if (!msg || msg.tabId === TASKIFY_TAB_ID) return;
  if (!msg.at || msg.at <= lastRemoteSyncAt) return;

  lastRemoteSyncAt = msg.at;

  // Debounce multiple quick events
  if (refreshTimerId) return;
  refreshTimerId = setTimeout(() => {
    refreshTimerId = null;

    // refresh board, but preserve optimistic ops (we'll reapply after fetch)
    loadHabitsBoard();

    // optional tiny feedback (nice for demo)
    if (!document.hidden) showToast('Synced changes from another tab.', 'secondary', 1200);
  }, 250);
}

function setupMultiTabSync() {
  // BroadcastChannel listener
  if ('BroadcastChannel' in window) {
    habitsBC = new BroadcastChannel(HABITS_SYNC_CHANNEL);
    habitsBC.onmessage = (ev) => {
      const msg = ev?.data;
      if (msg?.type === 'habits:changed') scheduleHabitsRefreshFromRemote(msg);
    };
  }

  // storage-event fallback listener
  window.addEventListener('storage', (e) => {
    if (e.key !== HABITS_SYNC_STORAGE_KEY || !e.newValue) return;
    try {
      const msg = JSON.parse(e.newValue);
      if (msg?.type === 'habits:changed') scheduleHabitsRefreshFromRemote(msg);
    } catch (_) {}
  });
}
// --- Share Progress (state + UI) ---
const shareState = {
  open: false,
  step: 'config', // 'config' | 'generated'
  generating: false,
  sending: false,

  token: null,
  url: null,

  friends: {
    loaded: false,
    loading: false,
    list: [],
    error: null,
  },

  selectedIds: new Set(),
};

function qs(id) { return document.getElementById(id); }

function resetShareUI() {
  shareState.step = 'config';
  shareState.generating = false;
  shareState.sending = false;

  shareState.token = null;
  shareState.url = null;

  shareState.selectedIds = new Set();

  qs('shareMsg').textContent = '';
  qs('shareLinkWrap').style.display = 'none';

  // send section
  const sendWrap = qs('shareSendWrap');
  if (sendWrap) sendWrap.style.display = 'none';

  const sel = qs('shareFriends');
  if (sel) sel.innerHTML = '';

  const hint = qs('shareFriendsHint');
  if (hint) hint.textContent = '';

  const note = qs('shareNote');
  if (note) note.value = '';

  const sendMsg = qs('shareSendMsg');
  if (sendMsg) sendMsg.textContent = '';

  const btnSend = qs('btnShareSend');
  if (btnSend) btnSend.disabled = true;
}

function openShare() {
  shareState.open = true;
  resetShareUI();
  qs('shareBackdrop').style.display = 'flex';

  // preload friends so they’re ready after Generate
  ensureFriendsLoaded();
}

function closeShare() {
  shareState.open = false;
  qs('shareBackdrop').style.display = 'none';
}

function setShareMsg(msg) {
  qs('shareMsg').textContent = msg || '';
}

function setGenerating(on) {
  shareState.generating = on;
  qs('btnShareGenerate').disabled = on;
  qs('btnShareCancel').disabled = on;
}

function setSending(on) {
  shareState.sending = on;
  const btnSend = qs('btnShareSend');
  if (btnSend) btnSend.disabled = on || shareState.selectedIds.size === 0 || !shareState.token;
}

function normalizeFriendsPayload(data) {
  // Handles: array, {friends:[...]}, {data:[...]}
  const arr = Array.isArray(data) ? data
    : Array.isArray(data?.friends) ? data.friends
    : Array.isArray(data?.data) ? data.data
    : [];

  const picked = arr
    .map((row) =>
      row?.otherUser ||
      row?.friend ||
      row?.user ||
      row?.addressee ||
      row?.requester ||
      row
    )
    .filter(Boolean);

  const norm = picked
    .map(u => ({
      id: Number(u.id),
      name: (u.name || u.username || '').trim() || 'Unknown',
      email: (u.email || '').trim(),
    }))
    .filter(u => Number.isFinite(u.id) && u.id > 0);

  // Dedupe + sort
  const map = new Map();
  for (const f of norm) map.set(f.id, f);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}


function renderFriendsSelect(list) {
  const sel = qs('shareFriends');
  const hint = qs('shareFriendsHint');
  if (!sel) return;

  sel.innerHTML = '';

  if (!list.length) {
    if (hint) hint.textContent = 'No friends found. Add friends to use Send.';
    sel.disabled = true;
    return;
  }

  sel.disabled = false;
  if (hint) hint.textContent = 'Tip: select multiple friends (Ctrl/Cmd + click).';

  for (const f of list) {
    const opt = document.createElement('option');
    opt.value = String(f.id);
    opt.textContent = f.email ? `${f.name} (${f.email})` : f.name;
    sel.appendChild(opt);
  }
}

async function ensureFriendsLoaded() {
  if (shareState.friends.loaded || shareState.friends.loading) return;

  shareState.friends.loading = true;
  shareState.friends.error = null;

  try {
    const res = await fetch('/api/friends', { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to load friends');

    const list = normalizeFriendsPayload(data);
    shareState.friends.list = list;
    shareState.friends.loaded = true;

    // if modal is open and we’re already on generated step, render now
    renderFriendsSelect(list);
  } catch (e) {
    shareState.friends.error = e.message || 'Failed to load friends';
    const hint = qs('shareFriendsHint');
    if (hint) hint.textContent = shareState.friends.error;
  } finally {
    shareState.friends.loading = false;
  }
}

async function generateShareLink() {
  setShareMsg('');
  setGenerating(true);

  const visibility = qs('shareVisibility').value;
  const expiry = qs('shareExpiry').value;

  try {
    const res = await fetch('/api/share/habits', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ visibility, expiry }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate');

    const url = window.location.origin + data.path;

    shareState.token = data.token;
    shareState.url = url;
    shareState.step = 'generated';

    qs('shareLink').value = url;
    qs('shareLinkWrap').style.display = '';
    setShareMsg('Link generated.');

    // show send section
    const sendWrap = qs('shareSendWrap');
    if (sendWrap) sendWrap.style.display = '';

    // render friends (preloaded or load now)
    await ensureFriendsLoaded();
    renderFriendsSelect(shareState.friends.list);

    // enable send button if any selection exists
    setSending(false);
  } catch (e) {
    setShareMsg(e.message || 'Failed');
  } finally {
    setGenerating(false);
  }
}

async function copyShareLink() {
  const url = qs('shareLink').value;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    setShareMsg('Copied.');
  } catch {
    qs('shareLink').select();
    document.execCommand('copy');
    setShareMsg('Copied.');
  }
}

function updateSelectedFriendsFromSelect() {
  const sel = qs('shareFriends');
  shareState.selectedIds = new Set();

  if (sel) {
    for (const opt of sel.selectedOptions) {
      const id = Number(opt.value);
      if (Number.isFinite(id)) shareState.selectedIds.add(id);
    }
  }

  const btnSend = qs('btnShareSend');
  if (btnSend) btnSend.disabled = shareState.sending || shareState.selectedIds.size === 0 || !shareState.token;
}

async function sendShareToFriends() {
  if (!shareState.token) return;

  const sendMsg = qs('shareSendMsg');
  if (sendMsg) sendMsg.textContent = '';

  const recipientIds = [...shareState.selectedIds];
  if (!recipientIds.length) {
    if (sendMsg) sendMsg.textContent = 'Select at least one friend.';
    return;
  }

  const message = (qs('shareNote')?.value || '').trim();

  setSending(true);
  if (sendMsg) sendMsg.textContent = 'Sending...';

  try {
    const res = await fetch(`/api/share/habits/${shareState.token}/send`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ recipientIds, message }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to send');

    const sentCount = Array.isArray(data.sent) ? data.sent.length : (data.createdCount || 0);
    const rejectedCount = Array.isArray(data.rejected) ? data.rejected.length : 0;

    if (sendMsg) {
      sendMsg.textContent =
        rejectedCount
          ? `Sent to ${sentCount}. Skipped ${rejectedCount} (not friends).`
          : `Sent to ${sentCount} friend${sentCount === 1 ? '' : 's'} ✓`;
    }

    showToast?.(`Share sent to ${sentCount} friend${sentCount === 1 ? '' : 's'}.`, 'success', 1800);

    // optional UX: clear selection after send
    const sel = qs('shareFriends');
    if (sel) sel.selectedIndex = -1;
    shareState.selectedIds = new Set();
    updateSelectedFriendsFromSelect();
  } catch (e) {
    if (sendMsg) sendMsg.textContent = e.message || 'Failed to send';
  } finally {
    setSending(false);
  }
}

function setupShareProgressModal() {
  const $ = (id) => document.getElementById(id);

  $('btnShareProgress')?.addEventListener('click', openShare);

  $('btnShareCancel')?.addEventListener('click', closeShare);
  $('shareBackdrop')?.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'shareBackdrop') closeShare();
  });

  $('btnShareGenerate')?.addEventListener('click', generateShareLink);
  $('btnShareCopy')?.addEventListener('click', copyShareLink);

  $('shareFriends')?.addEventListener('change', updateSelectedFriendsFromSelect);
  $('btnShareSend')?.addEventListener('click', sendShareToFriends);
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
  setupHabitCreateButton();
  setupHabitForm();
    const reminderEnabledEl = document.getElementById("habitReminderEnabled");
  if (reminderEnabledEl) {
    reminderEnabledEl.addEventListener("change", syncReminderInputsEnabled);
  }
  syncReminderInputsEnabled();
  setupShareProgressModal();
  setupMultiTabSync(); 
  setupDeleteModal();
  loadHabitsBoard();
  loadSharedWithYou(false);
  window.addEventListener('pageshow', () => loadSharedWithYou(true));

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
  if (!board) return;

  currentBoard = board;

  reapplyPendingOps(currentBoard);

  renderHabitsBoard(currentBoard);
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

function getSortedHabits(habits, sortMode) {
  const list = Array.isArray(habits) ? [...habits] : [];

  const safeNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  // Stable fallback ordering: createdAt then id
  const baseCompare = (a, b) => {
    const aT = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bT = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aT !== bT) return aT - bT;
    return safeNum(a?.id) - safeNum(b?.id);
  };

  if (sortMode === 'manual') {
    return list.sort((a, b) => {
      const diff = safeNum(a?.sortOrder) - safeNum(b?.sortOrder);
      if (diff !== 0) return diff;
      return baseCompare(a, b);
    });
  }

  if (sortMode === 'streak') {
    return list.sort((a, b) => {
      const diff = safeNum(b?.streak) - safeNum(a?.streak);
      if (diff !== 0) return diff;
      return baseCompare(a, b);
    });
  }

  if (sortMode === 'consistency') {
    return list.sort((a, b) => {
      const diff = safeNum(b?.completionThisWeek) - safeNum(a?.completionThisWeek);
      if (diff !== 0) return diff;

      const sdiff = safeNum(b?.streak) - safeNum(a?.streak);
      if (sdiff !== 0) return sdiff;

      return baseCompare(a, b);
    });
  }

  if (sortMode === 'atrisk') {
    return list.sort((a, b) => {
      const ar = safeNum(a?.onTrack?.riskScore);
      const br = safeNum(b?.onTrack?.riskScore);

      const diff = br - ar; // higher risk first
      if (diff !== 0) return diff;

      const aFlex = a?.onTrack?.status === 'flex';
      const bFlex = b?.onTrack?.status === 'flex';
      if (aFlex !== bFlex) return aFlex ? 1 : -1;

      const cdiff = safeNum(a?.completionThisWeek) - safeNum(b?.completionThisWeek);
      if (cdiff !== 0) return cdiff;

      const sdiff = safeNum(a?.streak) - safeNum(b?.streak);
      if (sdiff !== 0) return sdiff;

      return baseCompare(a, b);
    });
  }

  // default: created
  return list.sort(baseCompare);
}



function renderHabitsBoard(board) {
  if (!board || !board.week || !Array.isArray(board.week.days)) {
    console.error('Unexpected response for habits board:', board);
    return;
  }

  const { week, habits, summary, archivedHabits = [] } = board;
  const sortedHabits = getSortedHabits(habits, habitsSortMode);
  const todayKey = getTodayDateKey(board);

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

if (sortedHabits.length === 0) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td colspan="10" class="text-center text-muted small py-4">
      No habits yet. Click <strong>New habit</strong> to create your first one.
    </td>
  `;
  tbody.appendChild(tr);

  // IMPORTANT: still render sidebar + week label + drag setup
  renderArchivedHabits(archivedHabits);

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

  updateSidebarStats(summary);
  updatePatternsCard(board);
  setupDragDropIfNeeded();

  return;
}
  sortedHabits.forEach((habit) => {
    const tr = document.createElement('tr');

    const color = habit.color || 'var(--accent-color)';
    const targetLabel = habit.targetPerWeek
      ? `${habit.targetPerWeek}× / week`
      : 'Flexible';

   let daysHtml = '';
week.days.forEach((day) => {
  const entry = habit.week.find((w) => w.date === day.date);
  const isDone = entry?.completed;

  const key = opKey(habit.id, day.date);
  const isPending = appState.pendingOps.has(key);

  const isFuture = todayKey && day.date > todayKey;

  const extraClasses = [
    'habit-dot',
    isDone ? 'is-complete' : '',
    day.isToday ? 'is-today' : '',
    isPending ? 'is-pending' : '',
    isFuture ? 'is-future' : '',
  ].filter(Boolean).join(' ');

  daysHtml += `
    <td class="text-center">
      <button
        type="button"
        class="${extraClasses}"
        data-habit-id="${habit.id}"
        data-date="${day.date}"
        ${isPending || isFuture ? 'disabled aria-busy="true"' : ''}
        aria-label="Toggle ${habit.title} on ${day.label}"
        ${isFuture ? 'title="You can’t tick future days."' : ''}
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
  <span class="habit-drag-handle" title="Drag to reorder" style="cursor:grab; user-select:none;">
    <i class="bi bi-grip-vertical"></i>
  </span>

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


  const sortEl = document.getElementById('habitsSortSelect');
if (sortEl) {
  sortEl.value = habitsSortMode;

  // prevent stacking listeners on rerender
  sortEl.onchange = null;

  sortEl.onchange = () => {
    habitsSortMode = sortEl.value || 'created';
    localStorage.setItem('habitsSortMode', habitsSortMode);
    renderHabitsBoard(currentBoard); // re-render using same board, different sort
  };
}

  // Sidebar stats
  updateSidebarStats(summary);
  updatePatternsCard(board);
  setupDragDropIfNeeded();

}

function setupDragDropIfNeeded() {
  const tbody = document.getElementById('habitsTableBody');
  if (!tbody) return;

  // Only allow drag in manual mode
  if (habitsSortMode !== 'manual') {
    if (habitsSortable) {
      habitsSortable.destroy();
      habitsSortable = null;
    }
    return;
  }

  if (habitsSortable) return; // already set up

  habitsSortable = new Sortable(tbody, {
    animation: 150,
    handle: '.habit-drag-handle', // we will add this
    draggable: 'tr',
    onEnd: () => {
      const ids = [...tbody.querySelectorAll('tr[data-habit-id]')]
        .map(tr => Number(tr.dataset.habitId))
        .filter(Number.isFinite);

      // optimistic: update local board sortOrder immediately
      const map = new Map(ids.map((id, idx) => [id, idx + 1]));
      (currentBoard?.habits || []).forEach(h => {
        if (map.has(h.id)) h.sortOrder = map.get(h.id);
      });

      // persist
      fetch('/api/habits/reorder', {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ids }),
      })
        .then(res => res.json().then(d => ({ ok: res.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) throw new Error(d.error || 'Failed to save order');
          currentBoard = d;
          renderHabitsBoard(currentBoard);
          broadcastHabitsChanged('reorder');
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to save order. Refreshing…', 'danger', 1800);
          loadHabitsBoard(); // reload from server
        });
    },
  });
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
  if (!currentBoard) return;
const todayKey = getTodayDateKey(currentBoard);
  if (todayKey && date > todayKey) {
    showToast("Can't mark future days yet.", "secondary", 1800);
    return;
  }
  const key = opKey(habitId, date);

  if (appState.pendingOps.has(key)) return;

  const prevCompleted = getCellCompleted(currentBoard, habitId, date);
  const desiredCompleted = !prevCompleted;

  // 1) optimistic update immediately
  appState.pendingOps.set(key, {
    habitId: Number(habitId),
    date,
    prevCompleted,
    desiredCompleted,
    startedAt: Date.now(),
  });

  setCellCompleted(currentBoard, habitId, date, desiredCompleted);
  recomputeDerivedSummary(currentBoard);
  renderHabitsBoard(currentBoard);

  // 2) sync to server
  fetch(`/api/habits/${habitId}/toggle`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ date }),
  })
    .then((res) => {
      if (res.status === 401) {
        window.location.href = '../login.html';
        return null;
      }
      if (!res.ok) {
        throw new Error('Toggle failed. HTTP ' + res.status);
      }
      return res.json();
    })
    .then((board) => {
      if (!board) return;

      currentBoard = board;

      appState.pendingOps.delete(key);

      reapplyPendingOps(currentBoard);
      renderHabitsBoard(currentBoard);
      broadcastHabitsChanged('toggle');
    })
    .catch((err) => {
      console.error('Failed to toggle habit day:', err);

      appState.pendingOps.delete(key);

      setCellCompleted(currentBoard, habitId, date, prevCompleted);
      recomputeDerivedSummary(currentBoard);
      renderHabitsBoard(currentBoard);

      showToast('Sync failed. Change reverted.', 'danger');
    });
}


function archiveHabit(habitId, rowEl) {
  if (!currentBoard) return;

  const idNum = Number(habitId);

  // prevent stacking multiple pending actions on same habit
  if (undoState.pending.has(idNum)) return;

  const snapshot = cloneBoard(currentBoard);

  // 1) optimistic UI: remove from active list immediately
  currentBoard.habits = (currentBoard.habits || []).filter(h => h.id !== idNum);
  recomputeDerivedSummary(currentBoard);
  renderHabitsBoard(currentBoard);

  // 2) call server immediately (archive), but allow undo within 5s
  fetch(`/api/habits/${idNum}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
    .then((res) => {
      if (res.status === 401) {
        window.location.href = '../login.html';
        return null;
      }
      if (!res.ok) throw new Error('Failed to archive habit. HTTP ' + res.status);
      return res.json();
    })
    .then((board) => {
      if (!board) return;
      currentBoard = board;
      broadcastHabitsChanged('archive');
      reapplyPendingOps(currentBoard);
      renderHabitsBoard(currentBoard);
    })
    .catch((err) => {
      console.error('Failed to archive habit:', err);
      // rollback immediately if archive request fails
      currentBoard = snapshot;
      renderHabitsBoard(currentBoard);
      showToast('Archive failed. Change reverted.', 'danger');
    });

  // 3) show undo toast (5s)
  const toastEl = showUndoToast(`Archived.`, 'Undo', () => {
    const pending = undoState.pending.get(idNum);
    if (!pending) return;

    // cancel timer + remove pending marker
    clearTimeout(pending.timerId);
    undoState.pending.delete(idNum);

    // restore UI immediately (snapshot)
    currentBoard = pending.snapshot;
    renderHabitsBoard(currentBoard);

    // sync undo to server: unarchive (PATCH isArchived:false)
    fetch(`/api/habits/${idNum}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ isArchived: false }),
    })
      .then((res) => {
        if (res.status === 401) {
          window.location.href = '../login.html';
          return null;
        }
        if (!res.ok) throw new Error('Failed to undo archive. HTTP ' + res.status);
        return res.json();
      })
      .then((board) => {
        if (!board) return;
        currentBoard = board;
        broadcastHabitsChanged('undo-archive');
        reapplyPendingOps(currentBoard);
        renderHabitsBoard(currentBoard);
      })
      .catch((err) => {
        console.error('Undo archive failed:', err);
        showToast('Undo failed. Please refresh.', 'danger');
      });
  }, 5000);

  const timerId = setTimeout(() => {
    undoState.pending.delete(idNum);
  }, 5000);

  undoState.pending.set(idNum, { type: 'archive', snapshot, timerId, toastEl });
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
       reapplyPendingOps(currentBoard);
  renderHabitsBoard(currentBoard);
  broadcastHabitsChanged('restore');
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
  todayBar.style.minWidth = todayPct === 0 ? '1px' : '';
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
  weeklyBar.style.minWidth = weeklyPct === 0 ? '1px' : '';
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
        broadcastHabitsChanged(isEdit ? 'edit-habit' : 'create-habit');

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
  if (!pendingDeleteHabit || !currentBoard) return;

  const idNum = Number(pendingDeleteHabit.id);

  // prevent stacking
  if (undoState.pending.has(idNum)) return;

  const snapshot = cloneBoard(currentBoard);

  // close modal first
  const modalEl = document.getElementById('habitDeleteModal');
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
  if (modal) modal.hide();

  // 1) optimistic UI remove immediately
  currentBoard.habits = (currentBoard.habits || []).filter(h => h.id !== idNum);
  currentBoard.archivedHabits = (currentBoard.archivedHabits || []).filter(h => h.id !== idNum);
  recomputeDerivedSummary(currentBoard);
  renderHabitsBoard(currentBoard);

  pendingDeleteHabit = null;

  // 2) show undo toast for 10s
  const toastEl = showUndoToast(`Deleting in 10s…`, 'Undo', () => {
    const pending = undoState.pending.get(idNum);
    if (!pending) return;

    clearTimeout(pending.timerId);
    undoState.pending.delete(idNum);

    // restore snapshot locally (no server call was made yet)
    currentBoard = pending.snapshot;
    renderHabitsBoard(currentBoard);
  }, 10000);

  // 3) after 10s, actually call server hard delete
  const timerId = setTimeout(() => {
    // if already undone, do nothing
    if (!undoState.pending.has(idNum)) return;

    fetch(`/api/habits/${idNum}/hard`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
      .then((res) => {
        if (res.status === 401) {
          window.location.href = '../login.html';
          return null;
        }
        if (!res.ok) throw new Error('Failed to delete habit. HTTP ' + res.status);
        return res.json();
      })
      .then((board) => {
        if (!board) return;
        undoState.pending.delete(idNum);
        currentBoard = board;
        broadcastHabitsChanged('hard-delete');
        reapplyPendingOps(currentBoard);
        renderHabitsBoard(currentBoard);
      })
      .catch((err) => {
        console.error('Failed to hard delete habit:', err);
        // rollback to snapshot if delete fails
        const pending = undoState.pending.get(idNum);
        undoState.pending.delete(idNum);
        currentBoard = pending?.snapshot || currentBoard;
        renderHabitsBoard(currentBoard);
        showToast('Delete failed. Change reverted.', 'danger');
      });
  }, 10000);

  undoState.pending.set(idNum, { type: 'hardDelete', snapshot, timerId, toastEl });
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
