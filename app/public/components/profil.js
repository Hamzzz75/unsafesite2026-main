function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

async function initProfilPage() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return;
  }

  const res = await fetch('/api/me', {
    headers: { 'Authorization': 'Bearer ' + token }
  });

  if (!res.ok) {
    document.getElementById('profil-content').innerHTML =
      `<div class="profil-error">// erreur : session invalide</div>`;
    return;
  }

  const user = await res.json();
  renderProfil(user, token);
}

function renderProfil(user, token) {
  const userId = user._id || user.id || '';
  const initials = (user.username || '??').slice(0, 2).toUpperCase();
  const roleClass = user.role === 'admin' ? 'badge-admin' : 'badge-user';

  document.getElementById('profil-content').innerHTML = `
    <div class="profil-card">
      <div class="profil-card-top">
        <div class="profil-avatar">${escapeHtml(initials)}</div>
        <div class="profil-info">
          <div class="profil-name">${escapeHtml(user.username || '—')}</div>
          <div class="profil-email">${escapeHtml(user.email || '—')}</div>
          <span class="profil-badge ${roleClass}">${escapeHtml(user.role || 'user')}</span>
        </div>
      </div>

      ${user.bio ? `<div class="profil-bio">// ${escapeHtml(user.bio)}</div>` : ''}
      <div class="profil-id">ID: ${escapeHtml(userId)}</div>

      <div class="profil-divider"></div>

      <form id="profil-form">
        <div class="profil-field">
          <label>// username</label>
          <input id="profil-username" value="${escapeHtml(user.username || '')}" />
        </div>
        <div class="profil-field">
          <label>// email</label>
          <input id="profil-email" type="email" value="${escapeHtml(user.email || '')}" />
        </div>
        <div class="profil-field">
          <label>// bio</label>
          <textarea id="profil-bio">${escapeHtml(user.bio || '')}</textarea>
        </div>
        <div class="profil-field">
          <label>// avatar</label>
          <div class="profil-file-row">
            <input id="profil-avatar-file" type="file" accept="image/*" style="display:none" />
            <label for="profil-avatar-file" class="profil-browse">[ parcourir ]</label>
            <span id="profil-file-name" class="profil-file-name">aucun fichier</span>
          </div>
          ${user.avatar ? `<img class="profil-avatar-preview" src="${escapeHtml(user.avatar)}" alt="avatar" />` : ''}
        </div>
        <div class="profil-field">
          <label>// nouveau mot de passe</label>
          <input id="profil-password" type="password" placeholder="laisser vide pour ne pas changer" />
        </div>
        <div id="profil-msg" class="profil-msg" style="display:none"></div>
        <div class="profil-btn-row">
          <button type="submit">[ Enregistrer ]</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('profil-avatar-file').addEventListener('change', (e) => {
    const fileName = e.target.files[0] ? e.target.files[0].name : 'aucun fichier';
    document.getElementById('profil-file-name').textContent = fileName;
  });

  document.getElementById('profil-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('profil-msg');
    msgEl.style.display = 'none';

    const formData = new FormData();
    formData.append('username', document.getElementById('profil-username').value);
    formData.append('email', document.getElementById('profil-email').value);
    formData.append('bio', document.getElementById('profil-bio').value);
    const password = document.getElementById('profil-password').value;
    if (password) formData.append('password', password);
    const avatarFile = document.getElementById('profil-avatar-file').files[0];
    if (avatarFile) formData.append('avatar', avatarFile);

    const res = await fetch('/api/users/' + userId, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    });

    const data = await res.json();
    msgEl.style.display = 'block';

    if (res.ok) {
      msgEl.textContent = '// profil mis à jour avec succès';
      msgEl.className = 'profil-msg profil-msg-ok';
      renderProfil(data, token);
    } else {
      msgEl.textContent = '// erreur : ' + (data.error || 'mise à jour échouée');
      msgEl.className = 'profil-msg profil-msg-error';
    }
  });
}

document.addEventListener('DOMContentLoaded', initProfilPage);