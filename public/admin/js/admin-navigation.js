(function () {
  // Basic hash-based nav highlight (optional split from inline script)
  function highlight() {
    const route = location.hash.replace('#', '') || '/merchants';
    document.querySelectorAll('#admin-nav a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-route') === '/' + route);
    });
  }

  window.addEventListener('hashchange', highlight);
  window.addEventListener('DOMContentLoaded', highlight);
})();
