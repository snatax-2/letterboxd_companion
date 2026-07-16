// ═══════════════════════════════════════════
//  PWA : enregistrement du service worker
// ═══════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Détecte une NOUVELLE version qui vient de s'installer (pas la toute
      // première installation — on ne veut prévenir que d'un vrai changement
      // de contenu par rapport à ce que l'utilisateur a déjà ouvert).
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const banner = document.getElementById('update-banner');
            if (banner) banner.classList.add('show');
          }
        });
      });
    }).catch(() => {
      // Échec silencieux : l'app reste 100% fonctionnelle sans service worker,
      // seul l'usage hors-ligne / l'installation ne sera pas dispo.
    });
  });
}

document.getElementById('update-banner-reload-btn')?.addEventListener('click', () => {
  window.location.reload();
});

// ── Indicateur hors-ligne ──
// L'app fonctionne largement sans réseau (historique, watchlist, duels,
// stats : tout est local) — seuls TMDb et le quiz en dépendent. Un badge
// discret l'indique plutôt que de laisser les recherches échouer sans
// explication. Créé une fois, simplement montré/caché ensuite.
(function initOfflineIndicator() {
  const badge = document.createElement('div');
  badge.id = 'offline-badge';
  badge.className = 'offline-badge';
  badge.setAttribute('role', 'status');
  badge.textContent = 'Hors-ligne — tes données restent disponibles';
  document.body.appendChild(badge);

  function update() {
    badge.classList.toggle('visible', !navigator.onLine);
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
})();
