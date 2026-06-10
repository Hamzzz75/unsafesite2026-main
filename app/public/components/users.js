function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

let allUsers = [];

async function initUsersPage() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return;
  }

  const res = await fetch('/api/users', {
    headers: { 'Authorization': 'Bearer ' + token }
  });

  if (!res.ok) {
    document.getElementById('users-grid').innerHTML =
      `<div class="users-error">// erreur : accès refusé</div>`;
    return;
  }

  allUsers = await res.json();
  renderUsers(allUsers);

  document.getElementById('users-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
    renderUsers(filtered);
  });
}

function renderUsers(users) {
  const grid = document.getElementById('users-grid');
  if (users.length === 0) {
    grid.innerHTML = `<div class="users-empty">// aucun agent trouvé</div>`;
    return;
  }

  grid.innerHTML = users.map(u => {
    const initials = (u.username || '??').slice(0, 2).toUpperCase();
    const roleClass = u.role === 'admin' ? 'badge-admin' : 'badge-user';
    return `
      <div class="user-card">
        <div class="user-card-top">
          <div class="user-avatar">${escapeHtml(initials)}</div>
          <div class="user-info">
            <div class="user-name">${escapeHtml(u.username || '—')}</div>
            <div class="user-email">${escapeHtml(u.email || '—')}</div>
          </div>
          <span class="user-badge ${roleClass}">${escapeHtml(u.role || 'user')}</span>
        </div>
        ${u.bio ? `<div class="user-bio">// ${escapeHtml(u.bio)}</div>` : ''}
        <div class="user-id">ID: ${escapeHtml(u._id || u.id || '—')}</div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', initUsersPage);