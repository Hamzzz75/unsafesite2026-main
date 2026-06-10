class AppNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="toolbar">
        <button onclick="loadMe()">Mon profil</button>
        <button onclick="loadUsers()">Utilisateurs</button>
        <button onclick="loadPosts(false)">Posts publics</button>
        <button onclick="loadPosts(true)">Tous les posts ?</button>
        <button onclick="showCreatePost()">Créer un post</button>
        <button onclick="loadAdmin()">Admin</button>
        <button onclick="showToken()">Voir JWT</button>
        <button onclick="logout()">Déconnexion</button>
      </div>
    `;
  }
}

customElements.define('app-navbar', AppNavbar);