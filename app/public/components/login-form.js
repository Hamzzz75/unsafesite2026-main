class LoginForm extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section id="login-card">
        <div class="term-titlebar">
          <span class="term-dot"></span>
          <span class="term-dot"></span>
          <span class="term-dot"></span>
          <span class="term-title-text">Vas-y essaie de me hacker p'tit bouffon</span>
        </div>
        <div class="term-body">
          <div class="term-prompt-line">
            <span class="prompt-sym">C:\\SYSTEM\\AUTH&gt;</span>
            <span>login --secure --session=new</span>
            <span class="cursor-blink"></span>
          </div>
          <div class="term-header">
            <h2>Authentication</h2>
            <p>Enter credentials to establish session</p>
          </div>
          <form id="login-form">
            <div class="term-field">
              <label for="username">// username</label>
              <input id="username" value="alice" autocomplete="username" placeholder="user@domain" />
            </div>
            <div class="term-field">
              <label for="password">// password</label>
              <input id="password" type="password" value="alice123" autocomplete="current-password" placeholder="••••••••" />
            </div>
            <div class="term-btn-row">
              <button type="submit">[ Authenticate ]</button>
            </div>
          </form>
          <p class="hint">walid / julien / hamza</p>
        </div>
      </section>
    `;
  }
}

customElements.define('login-form', LoginForm);