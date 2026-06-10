class AppNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="gn-bar">
        <div class="gn-brand">
          <div class="gn-brand-icon">⬡</div>
          UnsafeSite<span style="color:#333">2026</span>
        </div>

        <div class="gn-divider"></div>

        <div class="gn-nav">
          <button class="gn-btn" onclick="loadMe()">👤 Profil</button>
          <button class="gn-btn" onclick="loadUsers()">👥 Agents</button>
          <button class="gn-btn" onclick="loadPosts(false)">📋 Posts</button>
          <button class="gn-btn" onclick="loadPosts(true)">👁 Tous</button>
          <button class="gn-btn" onclick="showCreatePost()">✏️ Créer</button>
          <button class="gn-btn" onclick="loadAdmin()">⚙️ Admin</button>
          <button class="gn-btn gn-btn-ghost" onclick="showToken()">🔑 JWT</button>
        </div>

        <div class="gn-actions">
          <div class="gn-user">
            <div class="gn-avatar" id="gn-avatar-initials">--</div>
            <div>
              <div class="gn-username" id="gn-username-label">—</div>
              <div class="gn-role" id="gn-role-label">offline</div>
            </div>
          </div>
          <button class="gn-btn gn-btn-danger" onclick="logout()" title="Déconnexion">⏻</button>
        </div>

        <button class="gn-mobile-toggle" id="gn-toggle" aria-label="Menu">☰</button>
      </nav>

      <div class="gn-drawer" id="gn-drawer">
        <button class="gn-btn" onclick="loadMe()">👤 Mon profil</button>
        <button class="gn-btn" onclick="loadUsers()">👥 Utilisateurs</button>
        <button class="gn-btn" onclick="loadPosts(false)">📋 Posts publics</button>
        <button class="gn-btn" onclick="loadPosts(true)">👁 Tous les posts</button>
        <button class="gn-btn" onclick="showCreatePost()">✏️ Créer un post</button>
        <button class="gn-btn" onclick="loadAdmin()">⚙️ Admin</button>
        <button class="gn-btn gn-btn-ghost" onclick="showToken()">🔑 JWT</button>
        <button class="gn-btn gn-btn-danger" onclick="logout()">⏻ Déconnexion</button>
      </div>
    `;

    document.getElementById('gn-toggle').addEventListener('click', () => {
      document.getElementById('gn-drawer').classList.toggle('open');
    });
  }
}

customElements.define('app-navbar', AppNavbar);