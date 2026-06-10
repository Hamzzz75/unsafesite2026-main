class ResultCard extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="card hidden" id="result-card">
        <h2 id="result-title">Résultat</h2>
        <div id="result"></div>
      </section>
    `;
  }
}

customElements.define('result-card', ResultCard);