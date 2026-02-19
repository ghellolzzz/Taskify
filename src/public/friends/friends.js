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

function setMsg(msg) {
  document.getElementById('statusMsg').textContent = msg || '';
}

function li(text) {
  const el = document.createElement('li');
  el.textContent = text;
  return el;
}

function opKey(action, id) {
  return `${action}-${id}`;
}

function render() {
  const incoming = document.getElementById('incomingList');
  const outgoing = document.getElementById('outgoingList');
  const friends = document.getElementById('friendsList');

  incoming.innerHTML = '';
  outgoing.innerHTML = '';
  friends.innerHTML = '';

  state.incoming.forEach(r => {
    const el = document.createElement('li');
    el.textContent = `${r.otherUser.name} (${r.otherUser.email})`;

    const accept = document.createElement('button');
    accept.textContent = 'Accept';
    accept.disabled = state.pendingOps.has(opKey('ACCEPT', r.id));
    accept.onclick = () => transition(r.id, 'ACCEPT');

    const reject = document.createElement('button');
    reject.textContent = 'Reject';
    reject.disabled = state.pendingOps.has(opKey('REJECT', r.id));
    reject.onclick = () => transition(r.id, 'REJECT');

    el.appendChild(document.createTextNode(' '));
    el.appendChild(accept);
    el.appendChild(document.createTextNode(' '));
    el.appendChild(reject);
    incoming.appendChild(el);
  });

  state.outgoing.forEach(r => {
    const el = document.createElement('li');
    el.textContent = `${r.otherUser.name} (${r.otherUser.email})`;

    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.disabled = state.pendingOps.has(opKey('CANCEL', r.id));
    cancel.onclick = () => transition(r.id, 'CANCEL');

    el.appendChild(document.createTextNode(' '));
    el.appendChild(cancel);
    outgoing.appendChild(el);
  });

  state.friends.forEach(r => {
    const el = document.createElement('li');
    el.textContent = `${r.otherUser.name} (${r.otherUser.email})`;

    const remove = document.createElement('button');
    remove.textContent = 'Remove';
    remove.disabled = state.pendingOps.has(opKey('REMOVE', r.id));
    remove.onclick = () => transition(r.id, 'REMOVE');

    const undo = document.createElement('button');
    undo.textContent = 'Undo';
    undo.disabled = state.pendingOps.has(opKey('UNDO', r.id));
    undo.onclick = () => transition(r.id, 'UNDO');

    el.appendChild(document.createTextNode(' '));
    el.appendChild(remove);
    el.appendChild(document.createTextNode(' '));
    el.appendChild(undo);
    friends.appendChild(el);
  });
}

async function load() {
  setMsg('');
  const res = await fetch('/api/friends', { headers: authHeaders() });
  const data = await res.json();

  if (!res.ok) {
    setMsg(data.error || 'Failed to load');
    return;
  }

  state.incoming = data.incoming || [];
  state.outgoing = data.outgoing || [];
  state.friends = data.friends || [];
  render();
}

async function sendRequest() {
  const email = document.getElementById('friendEmail').value.trim();
  if (!email) return setMsg('Enter an email');

  setMsg('Sending...');
  const res = await fetch('/api/friends/request', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) {
    setMsg(data.error || 'Failed');
    return;
  }

  setMsg(data.action === 'AUTO_ACCEPTED' ? 'They requested you already — auto accepted.' : 'Request sent.');
  document.getElementById('friendEmail').value = '';
  await load();
  if (bc) bc.postMessage({ type: 'refresh' });
}

async function transition(id, action) {
  const key = opKey(action, id);
  state.pendingOps.add(key);
  render();

  // optimistic-ish: refresh after success; rollback is handled by just reloading
  const res = await fetch(`/api/friends/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action }),
  });
  const data = await res.json();

  state.pendingOps.delete(key);

  if (!res.ok) {
    setMsg(data.error || 'Action failed');
    await load();
    return;
  }

  setMsg('');
  await load();
  if (bc) bc.postMessage({ type: 'refresh' });
}

document.getElementById('btnSend').onclick = sendRequest;
load();
