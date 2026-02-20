function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return { ...extra, Authorization: 'Bearer ' + token };
}

const state = {
  incoming: [],
  outgoing: [],
  friends: [],
  inbox: [],
  removed: [],
  pendingOps: new Set(), // e.g. "ACCEPT-12"
};

// --- Multi-tab sync (Friends + Inbox) ---
const TASKIFY_TAB_ID =
  sessionStorage.getItem('TASKIFY_TAB_ID') ||
  (crypto?.randomUUID?.() || String(Math.random()).slice(2));
sessionStorage.setItem('TASKIFY_TAB_ID', TASKIFY_TAB_ID);

const FRIENDS_SYNC_CHANNEL = 'taskify-friends-sync';
const FRIENDS_SYNC_STORAGE_KEY = '__taskify_friends_sync__';

let friendsBC = null;
let lastFriendsRemoteAt = 0;
let friendsRefreshTimer = null;

function broadcastFriendsChanged(reason = 'changed') {
  const msg = { type: 'friends:changed', reason, at: Date.now(), tabId: TASKIFY_TAB_ID };

  // BroadcastChannel best
  if (friendsBC) {
    try { friendsBC.postMessage(msg); } catch (_) {}
  }
  // storage-event fallback
  try { localStorage.setItem(FRIENDS_SYNC_STORAGE_KEY, JSON.stringify(msg)); } catch (_) {}
}

function scheduleFriendsRefreshFromRemote(msg) {
  if (!msg || msg.tabId === TASKIFY_TAB_ID) return;
  if (!msg.at || msg.at <= lastFriendsRemoteAt) return;

  lastFriendsRemoteAt = msg.at;

  if (friendsRefreshTimer) return;
  friendsRefreshTimer = setTimeout(() => {
    friendsRefreshTimer = null;

    // refresh both friends + inbox (but keep UI responsive)
    load(true);
    loadInbox(true);

    // optional small feedback
    if (!document.hidden) toast('Synced Friends/Inbox from another tab.', 'info');
  }, 250);
}

function setupFriendsMultiTabSync() {
  // BroadcastChannel
  if ('BroadcastChannel' in window) {
    friendsBC = new BroadcastChannel(FRIENDS_SYNC_CHANNEL);
    friendsBC.onmessage = (ev) => {
      const msg = ev?.data;
      if (msg?.type === 'friends:changed') scheduleFriendsRefreshFromRemote(msg);
    };
  }

  // storage fallback
  window.addEventListener('storage', (e) => {
    if (e.key !== FRIENDS_SYNC_STORAGE_KEY || !e.newValue) return;
    try {
      const msg = JSON.parse(e.newValue);
      if (msg?.type === 'friends:changed') scheduleFriendsRefreshFromRemote(msg);
    } catch (_) {}
  });
}



function opKey(action, id) {
  return `${action}-${id}`;
}

function initials(nameOrEmail = '') {
  const s = String(nameOrEmail).trim();
  if (!s) return 'U';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function toast(msg, kind = 'info') {
  const host = document.getElementById('toastHost');
  if (!host || !window.bootstrap?.Toast) return;

  const icon = kind === 'success' ? 'bi-check-circle' :
               kind === 'danger'  ? 'bi-exclamation-triangle' :
               kind === 'warning' ? 'bi-exclamation-circle' :
               'bi-info-circle';
  const bgClass =
    kind === 'danger'  ? 'text-bg-danger'  :
    kind === 'success' ? 'text-bg-success' :
    kind === 'warning' ? 'text-bg-warning' :
    kind === 'info'    ? 'text-bg-secondary' :
                         'text-bg-dark';

  const el = document.createElement('div');
  el.className = `toast align-items-center border-0 ${bgClass}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.setAttribute('aria-atomic', 'true');

  const closeBtnClass = (kind === 'warning') ? 'btn-close' : 'btn-close btn-close-white';

  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi ${icon} me-2"></i>${escapeHtml(msg)}
      </div>
      <button type="button" class="${closeBtnClass} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  host.appendChild(el);
  const t = bootstrap.Toast.getOrCreateInstance(el, { delay: 2600 });
  t.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}


function applyCounts() {
  const i = state.incoming.length;
  const o = state.outgoing.length;
  const f = state.friends.length;

  document.getElementById('countIncoming').textContent = i;
  document.getElementById('countOutgoing').textContent = o;
  document.getElementById('countFriends').textContent = f;

  document.getElementById('badgeIncoming').textContent = i;
  document.getElementById('badgeOutgoing').textContent = o;
  document.getElementById('badgeFriends').textContent = f;

  document.getElementById('incomingEmpty').style.display = i ? 'none' : '';
  document.getElementById('outgoingEmpty').style.display = o ? 'none' : '';
  document.getElementById('friendsEmpty').style.display = f ? 'none' : '';

    const r = state.removed.length;

  const badgeRemoved = document.getElementById('badgeRemoved');
  if (badgeRemoved) badgeRemoved.textContent = r;

  const removedEmpty = document.getElementById('removedEmpty');
  if (removedEmpty) removedEmpty.style.display = r ? 'none' : '';
}

function matchesSearch(r, q) {
  if (!q) return true;
  const name = r?.otherUser?.name || '';
  const email = r?.otherUser?.email || '';
  return (name + ' ' + email).toLowerCase().includes(q);
}

function makeRow(r, type) {
  const other = r.otherUser || {};
  const name = other.name || 'Unknown';
  const email = other.email || '';

  const li = document.createElement('li');
  li.className = 'list-group-item';

  const left = document.createElement('div');
  left.className = 'friend-left';
  left.innerHTML = `
    <div class="friend-avatar">${escapeHtml(initials(name || email))}</div>
    <div class="friend-meta">
      <div class="friend-name">${escapeHtml(name)}</div>
      <div class="friend-email text-muted">${escapeHtml(email)}</div>
    </div>
  `;

  const actions = document.createElement('div');
  actions.className = 'friend-actions';

  const row = document.createElement('div');
  row.className = 'friend-row';
  row.appendChild(left);
  row.appendChild(actions);
  li.appendChild(row);

  if (type === 'incoming') {
    const accept = document.createElement('button');
    accept.className = 'btn btn-success btn-sm';
    accept.innerHTML = `<i class="bi bi-check2 me-1"></i>Accept`;
    accept.disabled = state.pendingOps.has(opKey('ACCEPT', r.id));
    accept.onclick = () => transition(r.id, 'ACCEPT');

    const reject = document.createElement('button');
    reject.className = 'btn btn-outline-secondary btn-sm';
    reject.innerHTML = `<i class="bi bi-x-lg me-1"></i>Reject`;
    reject.disabled = state.pendingOps.has(opKey('REJECT', r.id));
    reject.onclick = () => transition(r.id, 'REJECT');

    actions.appendChild(accept);
    actions.appendChild(reject);
  }

  if (type === 'outgoing') {
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-outline-secondary btn-sm';
    cancel.innerHTML = `<i class="bi bi-slash-circle me-1"></i>Cancel`;
    cancel.disabled = state.pendingOps.has(opKey('CANCEL', r.id));
    cancel.onclick = () => transition(r.id, 'CANCEL');
    actions.appendChild(cancel);
  }

    if (type === 'friends') {
    const remove = document.createElement('button');
    remove.className = 'btn btn-outline-danger btn-sm';
    remove.innerHTML = `<i class="bi bi-person-dash me-1"></i>Remove`;
    remove.disabled = state.pendingOps.has(opKey('REMOVE', r.id));
    remove.onclick = () => transition(r.id, 'REMOVE');
    actions.appendChild(remove);
  }

    if (type === 'removed') {
    const undo = document.createElement('button');
    undo.className = 'btn btn-outline-success btn-sm';
    undo.innerHTML = `<i class="bi bi-arrow-counterclockwise me-1"></i>Undo`;
    undo.disabled = state.pendingOps.has(opKey('UNDO', r.id));
    undo.onclick = () => transition(r.id, 'UNDO');
    actions.appendChild(undo);
  }


  return li;
}

function render() {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();

  const incomingEl = document.getElementById('incomingList');
  const outgoingEl = document.getElementById('outgoingList');
  const friendsEl  = document.getElementById('friendsList');
  const removedEl  = document.getElementById('removedList');

  if (incomingEl) incomingEl.innerHTML = '';
  if (outgoingEl) outgoingEl.innerHTML = '';
  if (friendsEl)  friendsEl.innerHTML = '';
  if (removedEl)  removedEl.innerHTML = '';

  state.incoming.filter(r => matchesSearch(r, q)).forEach(r => incomingEl?.appendChild(makeRow(r, 'incoming')));
  state.outgoing.filter(r => matchesSearch(r, q)).forEach(r => outgoingEl?.appendChild(makeRow(r, 'outgoing')));
  state.friends.filter(r => matchesSearch(r, q)).forEach(r => friendsEl?.appendChild(makeRow(r, 'friends')));
  state.removed.filter(r => matchesSearch(r, q)).forEach(r => removedEl?.appendChild(makeRow(r, 'removed')));

  applyCounts();
}


async function load(silent = false) {
  if (!silent) toast('Loading friends…', 'info');

  const [friendsRes, inboxRes] = await Promise.all([
    fetch('/api/friends', { headers: authHeaders() }),
    fetch('/api/activity/inbox?limit=20&type=HABIT_SHARE', { headers: authHeaders() }),
  ]);

  const data = await friendsRes.json().catch(() => ({}));
  const inbox = await inboxRes.json().catch(() => ({}));

  if (!friendsRes.ok) {
    toast(data.error || 'Failed to load friends.', 'danger');
    return;
  }

  state.incoming = data.incoming || [];
  state.outgoing = data.outgoing || [];
  state.friends = data.friends || [];
  state.removed = data.removed || [];
  state.inbox = inbox.items || [];
  state.inboxUnread = inbox.counts?.unread || 0;

  render();
  renderInbox();
}


async function sendRequest() {
  const input = document.getElementById('friendEmail');
  const email = (input?.value || '').trim();
  if (!email) return toast('Enter an email address.', 'warning');

  const btn = document.getElementById('btnSend');
  btn.disabled = true;

  const res = await fetch('/api/friends/request', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));
  btn.disabled = false;

  if (!res.ok) {
    toast(data.error || 'Failed to send request.', 'danger');
    return;
  }

  if (data.action === 'AUTO_ACCEPTED') toast('They already requested you — auto accepted ✅', 'success');
  else toast('Friend request sent ✅', 'success');

  input.value = '';
  await load(true);
  broadcastFriendsChanged('friend_request_sent');
}

async function transition(id, action) {
  const key = opKey(action, id);
  state.pendingOps.add(key);
  render();

  const res = await fetch(`/api/friends/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action }),
  });

  const data = await res.json().catch(() => ({}));

  state.pendingOps.delete(key);

  if (!res.ok) {
    toast(data.error || 'Action failed.', 'danger');
    await load(true);
    return;
  }

  // Friendly toasts
  const msg =
    action === 'ACCEPT' ? 'Request accepted ✅' :
    action === 'REJECT' ? 'Request rejected.' :
    action === 'CANCEL' ? 'Request cancelled.' :
    action === 'REMOVE' ? 'Friend removed. Undo available in “Recently removed”.' :
    action === 'UNDO'   ? 'Undo complete ✅' :
    'Updated.';

  toast(msg, action === 'ACCEPT' || action === 'UNDO' ? 'success' : 'info');

  await load(true);
  broadcastFriendsChanged(`friend_${action.toLowerCase()}`);
}

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

async function inboxAction(id, action) {
  const res = await fetch(`/api/activity/inbox/habit-share/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action }),
    
  });
  broadcastFriendsChanged(`inbox_${action.toLowerCase()}`);
  const data = await res.json().catch(() => ({}));
if (!res.ok) throw new Error(data.error || 'Failed');

broadcastFriendsChanged(`inbox_${action.toLowerCase()}`);

}

function makeInboxRow(item) {
  const sender = item.sender || {};
  const name = sender.name || sender.email || 'Someone';

  const li = document.createElement('li');
  li.className = 'list-group-item';

  const left = document.createElement('div');
  left.className = 'friend-left';
  left.innerHTML = `
    <div class="friend-avatar">${escapeHtml(initials(name))}</div>
    <div class="friend-meta">
      <div class="friend-name">
        ${escapeHtml(name)}
        ${item.isRead ? '' : `<span class="badge text-bg-success ms-2">New</span>`}
        ${item.isExpired ? `<span class="badge text-bg-secondary ms-2">Expired</span>` : ''}
      </div>
      <div class="friend-email text-muted">
        shared habit progress • ${escapeHtml(timeAgo(item.createdAt))} ago
      </div>
      ${item.message ? `<div class="small mt-1">${escapeHtml(item.message)}</div>` : ''}
    </div>
  `;

  const actions = document.createElement('div');
  actions.className = 'friend-actions';

  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn btn-outline-primary btn-sm';
  viewBtn.innerHTML = `<i class="bi bi-box-arrow-up-right me-1"></i>View`;
  viewBtn.onclick = async () => {
    try {
      await inboxAction(item.id, 'READ');
    } catch (_) {}
    if (item.link?.path) window.open(item.link.path, '_blank');
    await loadInbox(true);
  };

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'btn btn-outline-secondary btn-sm';
  dismissBtn.innerHTML = `<i class="bi bi-x-lg me-1"></i>Dismiss`;
  dismissBtn.onclick = async () => {
    try {
      await inboxAction(item.id, 'DISMISS');
      await loadInbox(true);
    } catch (e) {
      toast(e.message || 'Failed', 'danger');
    }
  };

  actions.appendChild(viewBtn);
  actions.appendChild(dismissBtn);

  const row = document.createElement('div');
  row.className = 'friend-row';
  row.appendChild(left);
  row.appendChild(actions);

  li.appendChild(row);
  return li;
}

function renderInbox() {
  const list = document.getElementById('inboxList');
  const empty = document.getElementById('inboxEmpty');
  const badge = document.getElementById('badgeInbox');

  if (!list || !empty || !badge) return;

  list.innerHTML = '';
  badge.textContent = String(state.inboxUnread || 0);

  empty.style.display = state.inbox.length ? 'none' : '';
  state.inbox.forEach(item => list.appendChild(makeInboxRow(item)));
}

async function loadInbox(silent = false) {
  const res = await fetch('/api/activity/inbox?limit=20&type=HABIT_SHARE', { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (!silent) toast(data.error || 'Failed to load inbox.', 'danger');
    return;
  }

  state.inbox = data.items || [];
  state.inboxUnread = data.counts?.unread || 0;
  renderInbox();
}

setupFriendsMultiTabSync();


/* Wire up */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnSend')?.addEventListener('click', sendRequest);
  document.getElementById('btnRefresh')?.addEventListener('click', () => load());
  document.getElementById('searchInput')?.addEventListener('input', render);

  // Logout (same behavior as your profile page)
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('accountNo');
    localStorage.removeItem('role');
    localStorage.removeItem('memberId');
    window.location.href = '../login.html';
  });

  load(true);
});
