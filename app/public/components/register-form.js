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
            <div id="register-error" style="color:rgba(255,80,80,0.8); font-size:11px; letter-spacing:0.08em; margin-top:12px; display:none;"></div>
            <div class="term-btn-row">
              <button type="submit">[ Create account ]</button>
            </div>
          </form>
          <p class="hint" style="margin-top:16px; text-align:center;">
            Déjà un compte ?
            <a href="/pages/login.html"
               style="color:rgba(255,255,255,0.55); text-decoration:underline; letter-spacing:0.06em;">
              [ Login ]
            </a>
          </p>
        </div>
      </section>
    `;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value;
      const email    = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const errorEl  = document.getElementById('register-error');
      errorEl.style.display = 'none';

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = '// erreur : ' + (data.error || 'inscription échouée');
        errorEl.style.display = 'block';
        return;
      }

      window.location.href = '/pages/login.html';
    });
  }
}

customElements.define('register-form', RegisterForm);