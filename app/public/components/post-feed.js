class PostFeed extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="section-header" id="feed-header-${this.id || 'default'}">// feed</div>
      <div id="posts-list-${this.id || 'default'}" class="posts-panel"></div>
    `;

    // Le feed principal écoute load-posts (posts publics)
    if (this.id !== 'feed-tous') {
      document.addEventListener('load-posts', (e) => {
        this.loadPosts(e.detail?.includeAdmin ?? false);
      });
      this.loadPosts(false);
    }

    // Le feed "tous" écoute load-posts-tous
    if (this.id === 'feed-tous') {
      document.addEventListener('load-posts-tous', (e) => {
        this.loadPosts(e.detail?.includeAdmin ?? true);
      });
    }

    document.addEventListener('post-created', () => {
      if (this.id !== 'feed-tous') this.loadPosts(false);
    });
  }

  async loadPosts(includeAdmin = false) {
    const token = localStorage.getItem('token');
    const url = `/api/posts${includeAdmin ? '?includeAdmin=true' : '?includeAdmin=false'}`;
    const res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return;
    const posts = await res.json();

    const suffix = this.id || 'default';
    const header = this.querySelector(`#feed-header-${suffix}`);
    const list   = this.querySelector(`#posts-list-${suffix}`);

    if (header) header.textContent = `// feed —— ${posts.length} post${posts.length !== 1 ? 's' : ''}`;

    if (!list) return;

    if (posts.length === 0) {
      list.innerHTML = `<div style="color:rgba(255,255,255,0.25);font-size:12px;letter-spacing:0.06em;">// aucun post disponible</div>`;
      return;
    }

    list.innerHTML = posts.map(post => {
      const initials = (post.authorUsername || '??').slice(0, 2).toUpperCase();
      const date = post.createdAt ? new Date(post.createdAt).toLocaleString('fr-FR') : '';
      return `
        <div class="post-card">
          <div class="post-header">
            <div class="post-avatar">${initials}</div>
            <div class="post-meta">
              <div class="post-author">${this.escape(post.authorUsername || 'inconnu')}</div>
              <div class="post-date">${date}</div>
            </div>
            <span class="post-badge">${this.escape(post.visibility || 'public')}</span>
          </div>
          <div class="post-body">
            <div class="post-title">${this.escape(post.title)}</div>
            <div class="post-content">${this.escape(post.content)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}

customElements.define('post-feed', PostFeed);