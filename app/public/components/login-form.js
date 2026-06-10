class LoginForm extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="card" id="login-card">
        <h2>Connexion</h2>
        <form id="login-form">
          <label>Nom utilisateur</label>
          <input id="username" value="alice" autocomplete="username" />
          <label>Mot de passe</label>
          <input id="password" type="password" value="alice123" autocomplete="current-password" />
          <button type="submit">Se connecter</button>
        </form>
        <p class="hint">Comptes : admin/admin123, alice/alice123, bob/bob123</p>
      </section>
    `;
  }
}

customElements.define('login-form', LoginForm);