class PostCreator extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section id="create-post-section" class="hidden">
        <h2>Créer un post</h2>
        <form id="post-form">
          <input id="post-title" placeholder="Titre" />
          <textarea id="post-content" placeholder="Votre message"></textarea>
          <button type="submit">Publier</button>
        </form>
      </section>
    `;
  }
}

customElements.define('post-creator', PostCreator);