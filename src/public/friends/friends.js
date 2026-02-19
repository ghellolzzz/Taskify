function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return { ...extra, Authorization: 'Bearer ' + token };
}

const state = {
  incoming: [],
  outgoing: [],
  friends: [],
  pendingOps: new Set(), // e.g. "ACCEPT-12"
};

const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('friends-sync') : null;
if (bc) bc.onmessage = () => load();

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
  if (!host) return;

  const id = 't' + Math.random().toString(16).slice(2);
  const icon = kind === 'success' ? 'bi-check-circle' :
               kind === 'danger' ? 'bi-exclamation-triangle' :
               kind === 'warning' ? 'bi-exclamation-circle' :
               'bi-info-circle';

  const el = document.createElement('div');
  el.className = 'toast align-items-center';
  el.id = id;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.setAttribute('aria-atomic', 'true');

  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi ${icon} me-2"></i>${escapeHtml(msg)}
      </div>
      <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  host.appendChild(el);
  const t = new bootstrap.Toast(el, { delay: 2600 });
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

    const undo = document.createElement('button');
    undo.className = 'btn btn-outline-success btn-sm';
    undo.innerHTML = `<i class="bi bi-arrow-counterclockwise me-1"></i>Undo`;
    undo.disabled = state.pendingOps.has(opKey('UNDO', r.id));
    undo.onclick = () => transition(r.id, 'UNDO');

    actions.appendChild(remove);
    actions.appendChild(undo);
  }

  return li;
}

function render() {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();

  const incomingEl = document.getElementById('incomingList');
  const outgoingEl = document.getElementById('outgoingList');
  const friendsEl = document.getElementById('friendsList');

  incomingEl.innerHTML = '';
  outgoingEl.innerHTML = '';
  friendsEl.innerHTML = '';

  state.incoming.filter(r => matchesSearch(r, q)).forEach(r => incomingEl.appendChild(makeRow(r, 'incoming')));
  state.outgoing.filter(r => matchesSearch(r, q)).forEach(r => outgoingEl.appendChild(makeRow(r, 'outgoing')));
  state.friends.filter(r => matchesSearch(r, q)).forEach(r => friendsEl.appendChild(makeRow(r, 'friends')));

  applyCounts();
}

async function load(silent = false) {
  if (!silent) toast('Loading friends…', 'info');

  const res = await fetch('/api/friends', { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    toast(data.error || 'Failed to load friends.', 'danger');
    return;
  }

  state.incoming = data.incoming || [];
  state.outgoing = data.outgoing || [];
  state.friends = data.friends || [];
  render();
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
  if (bc) bc.postMessage({ type: 'refresh' });
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
    action === 'REMOVE' ? 'Friend removed.' :
    action === 'UNDO'   ? 'Undo complete ✅' :
    'Updated.';

  toast(msg, action === 'ACCEPT' || action === 'UNDO' ? 'success' : 'info');

  await load(true);
  if (bc) bc.postMessage({ type: 'refresh' });
}

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
