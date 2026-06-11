let token = localStorage.getItem('token');
let currentUser = null;

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
}

async function loadCurrentUser() {
  if (!token) return null;
  const res = await fetch('/api/me', { headers: authHeaders() });
  if (!res.ok) return null;
  currentUser = await res.json();

  const usernameEl = document.getElementById('gn-username-label');
  const roleEl     = document.getElementById('gn-role-label');
  const avatarEl   = document.getElementById('gn-avatar-initials');
  if (usernameEl) usernameEl.textContent = currentUser.username || '—';
  if (roleEl)     roleEl.textContent     = currentUser.role     || 'user';
  if (avatarEl)   avatarEl.textContent   = (currentUser.username || '??').slice(0, 2).toUpperCase();

  return currentUser;
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  window.location.replace('/pages/login.html');
}

// ─────────────────────────────────────────────
// Router de vues
// ─────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

async function handleAction(action) {
  switch (action) {

    case 'posts':
      showView('view-feed');
      // Recharge le feed public
      document.dispatchEvent(new CustomEvent('load-posts', { detail: { includeAdmin: false } }));
      break;

    case 'creer':
      showView('view-feed');
      // Scroll vers le créateur de post
      document.querySelector('post-creator')?.scrollIntoView({ behavior: 'smooth' });
      break;

    case 'tous':
      showView('view-tous');
      // Déclenche le chargement avec flag admin sur le feed-tous
      document.dispatchEvent(new CustomEvent('load-posts-tous', { detail: { includeAdmin: true } }));
      break;

    case 'admin':
      showView('view-result');
      await loadAdmin();
      break;

    case 'jwt':
      showView('view-result');
      showToken();
      break;

    case 'logout':
      logout();
      break;

    default:
      showView('view-feed');
  }
}

async function loadAdmin() {
  const res = await fetch('/api/admin', { headers: authHeaders() });
  const data = await res.json();
  const resultCard = document.getElementById('result-card');
  const resultEl   = document.getElementById('result');
  const titleEl    = document.getElementById('result-title');
  if (resultCard && resultEl && titleEl) {
    titleEl.textContent = 'Panneau Admin';
    resultEl.innerHTML  = `<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
    resultCard.classList.remove('hidden');
  }
}

function showToken() {
  const parts = token ? token.split('.') : [];
  let decoded = null;
  try { decoded = JSON.parse(atob(parts[1])); } catch(e) {}
  const resultCard = document.getElementById('result-card');
  const resultEl   = document.getElementById('result');
  const titleEl    = document.getElementById('result-title');
  if (resultCard && resultEl && titleEl) {
    titleEl.textContent = 'JWT Token';
    resultEl.innerHTML  = `<pre>${escapeHtml(JSON.stringify({ token, decodedPayload: decoded }, null, 2))}</pre>`;
    resultCard.classList.remove('hidden');
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!token) {
    window.location.replace('/pages/login.html');
    return;
  }

  await loadCurrentUser();

  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action') || 'posts';

  await handleAction(action);

  // Nettoie l'URL sans recharger la page
  window.history.replaceState({}, '', '/index.html');
});