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
              <input id="username" maxlength="50" autocomplete="username" placeholder="user@domain" />
            </div>
            <div class="term-field">
              <label for="password">// password</label>
              <input id="password" type="password" maxlength="128" autocomplete="current-password" placeholder="••••••••" />
            </div>
            <div id="login-error" style="color:rgba(255,80,80,0.8); font-size:11px; letter-spacing:0.08em; margin-top:12px; display:none;"></div>
            <div class="term-btn-row">
              <button type="submit" id="login-btn">[ Authenticate ]</button>
            </div>
          </form>
          <p class="hint" style="margin-top:20px; text-align:center;">
            Pas encore de compte ?
            <a href="/pages/register.html"
               style="color:rgba(255,255,255,0.55); text-decoration:underline; letter-spacing:0.06em;">
              [ Register ]
            </a>
          </p>
        </div>
      </section>
    `;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const errorEl = document.getElementById('login-error');
      const btnEl = document.getElementById('login-btn');
      errorEl.style.display = 'none';

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = '// erreur : ' + (data.error || 'identifiants invalides');
        errorEl.style.display = 'block';
        if (data.blocked) {
          btnEl.disabled = true;
          btnEl.textContent = '[ Bloqué ]';
          btnEl.style.opacity = '0.4';
          btnEl.style.cursor = 'not-allowed';
        }
        return;
      }
      localStorage.setItem('token', data.token);
      window.location.href = '/index.html';
    });
  }
}
customElements.define('login-form', LoginForm);