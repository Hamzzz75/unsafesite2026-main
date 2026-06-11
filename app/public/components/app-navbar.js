class AppNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="gn-bar">
        <div class="gn-brand" onclick="goHome()" style="cursor:pointer">
          <div class="gn-brand-icon">⬡</div>
          Tu vas rien hacker enculé<span style="color:#333">2026</span>
        </div>
        <div class="gn-divider"></div>
        <div class="gn-nav">
          <button class="gn-btn" onclick="goToProfil()">👤 Profil</button>
          <button class="gn-btn" onclick="goToUsers()">👥 Agents</button>
          <button class="gn-btn" onclick="goHome('posts')">📋 Posts</button>
          <button class="gn-btn" onclick="goHome('tous')">👁 Tous</button>
          <button class="gn-btn" onclick="goHome('creer')">✏️ Créer</button>
          <button class="gn-btn" onclick="goHome('admin')">⚙️ Admin</button>
          <button class="gn-btn gn-btn-ghost" onclick="goHome('jwt')">🔑 JWT</button>
        </div>
        <div class="gn-actions">
          <div class="gn-user">
            <div class="gn-avatar" id="gn-avatar-initials">--</div>
            <div>
              <div class="gn-username" id="gn-username-label">—</div>
              <div class="gn-role" id="gn-role-label">offline</div>
            </div>
          </div>
          <button class="gn-btn gn-btn-danger" onclick="goHome('logout')" title="Déconnexion">⏻</button>
        </div>
        <button class="gn-mobile-toggle" id="gn-toggle" aria-label="Menu">☰</button>
      </nav>
      <div class="gn-drawer" id="gn-drawer">
        <button class="gn-btn" onclick="goToProfil()">👤 Mon profil</button>
        <button class="gn-btn" onclick="goToUsers()">👥 Agents</button>
        <button class="gn-btn" onclick="goHome('posts')">📋 Posts publics</button>
        <button class="gn-btn" onclick="goHome('tous')">👁 Tous les posts</button>
        <button class="gn-btn" onclick="goHome('creer')">✏️ Créer un post</button>
        <button class="gn-btn" onclick="goHome('admin')">⚙️ Admin</button>
        <button class="gn-btn gn-btn-ghost" onclick="goHome('jwt')">🔑 JWT</button>
        <button class="gn-btn gn-btn-danger" onclick="goHome('logout')">⏻ Déconnexion</button>
      </div>
    `;

    document.getElementById('gn-toggle').addEventListener('click', () => {
      document.getElementById('gn-drawer').classList.toggle('open');
    });

    window.goHome = function(action) {
      window.location.href = action ? '/index.html?action=' + action : '/index.html';
    };

    window.goToUsers = function() {
      if (!localStorage.getItem('token')) {
        alert('Vous devez être connecté pour accéder à cette page.');
        return;
      }
      window.location.href = '/pages/users.html';
    };

    window.goToProfil = function() {
      if (!localStorage.getItem('token')) {
        alert('Vous devez être connecté pour accéder à cette page.');
        return;
      }
      window.location.href = '/pages/profil.html';
    };
  }
}
customElements.define('app-navbar', AppNavbar);