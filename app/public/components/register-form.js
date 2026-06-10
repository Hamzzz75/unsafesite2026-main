class RegisterForm extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section id="register-card">
        <div class="term-titlebar">
          <span class="term-dot"></span>
          <span class="term-dot"></span>
          <span class="term-dot"></span>
          <span class="term-title-text">hack moi si tu peux :)</span>
        </div>
        <div class="term-body">
          <div class="term-prompt-line">
            <span class="prompt-sym">C:\\SYSTEM\\AUTH&gt;</span>
            <span>si tu me hackes j'te brises les os</span>
            <span class="cursor-blink"></span>
          </div>
          <div class="term-header">
            <h2>Registration</h2>
            <p>Create a new account to access the system</p>
          </div>
          <form id="register-form">
            <div class="term-field">
              <label for="register-username">// username</label>
              <input id="register-username" autocomplete="username" placeholder="mail@facile.fr" />
            </div>
            <div class="term-field">
              <label for="register-email">// email</label>
              <input id="register-email" type="email" autocomplete="email" placeholder="ton@pere.com" />
            </div>
            <div class="term-field">
              <label for="register-password">// password</label>
              <input id="register-password" type="password" autocomplete="new-password" placeholder="••••••••" />
            </div>
            <div class="term-btn-row">
              <button type="submit">[ Create account ]</button>
            </div>
          </form>
          <p class="hint">After registration, sign in with your credentials.</p>
        </div>
      </section>
    `;
  }
}

customElements.define('register-form', RegisterForm);