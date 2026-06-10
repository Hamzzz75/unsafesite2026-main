class RegisterForm extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="card" id="register-card">
        <h2>Inscription</h2>
        <form id="register-form">
          <label>Nom utilisateur</label>
          <input id="register-username" autocomplete="username" />
          <label>Email</label>
          <input id="register-email" type="email" autocomplete="email" />
          <label>Mot de passe</label>
          <input id="register-password" type="password" autocomplete="new-password" />
          <button type="submit">Créer un compte</button>
        </form>
        <p class="hint">Après inscription, connectez-vous avec vos identifiants.</p>
      </section>
    `;
  }
}

customElements.define('register-form', RegisterForm);