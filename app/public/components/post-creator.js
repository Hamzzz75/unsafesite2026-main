class PostCreator extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="section-header">// new_post</div>
      <div class="term-panel" id="post-creator-panel">
        <div class="term-titlebar">
          <span class="term-dot"></span>
          <span class="term-dot"></span>
          <span class="term-dot"></span>
          <span class="term-title-text">post --create</span>
        </div>
        <div class="term-body">
          <div class="term-prompt-line">
            <span class="prompt-sym">C:\\POSTS&gt;</span>
            <span>write --new</span>
          </div>
          <div class="term-field">
            <label>// title</label>
            <input id="post-title" maxlength="200" placeholder="Subject line..." />
          </div>
          <div class="term-field">
            <label>// content</label>
            <textarea id="post-content" maxlength="5000" placeholder="Message body..."></textarea>
          </div>
          <div id="post-error" style="color:rgba(255,80,80,0.8);font-size:11px;letter-spacing:0.08em;margin-bottom:12px;display:none;"></div>
          <button class="term-btn" id="post-submit">[ Publish ]</button>
        </div>
      </div>
    `;
    this.querySelector('#post-submit').addEventListener('click', async () => {
      const title = this.querySelector('#post-title').value.trim();
      const content = this.querySelector('#post-content').value.trim();
      const errorEl = this.querySelector('#post-error');
      errorEl.style.display = 'none';

      if (!title || !content) {
        errorEl.textContent = '// erreur : titre et contenu obligatoires';
        errorEl.style.display = 'block';
        return;
      }

      if (title.length > 200) {
        errorEl.textContent = '// erreur : titre trop long (200 caractères max)';
        errorEl.style.display = 'block';
        return;
      }

      if (content.length > 5000) {
        errorEl.textContent = '// erreur : contenu trop long (5000 caractères max)';
        errorEl.style.display = 'block';
        return;
      }

      const token = localStorage.getItem('token');
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ title, content })
      });
      if (res.ok) {
        this.querySelector('#post-title').value = '';
        this.querySelector('#post-content').value = '';
        document.dispatchEvent(new CustomEvent('post-created'));
      } else {
        const data = await res.json();
        errorEl.textContent = '// erreur : ' + (data.error || 'impossible de publier');
        errorEl.style.display = 'block';
      }
    });
  }
}
customElements.define('post-creator', PostCreator);