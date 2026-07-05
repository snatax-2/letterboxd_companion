// ═══════════════════════════════════════════
//  PWA : enregistrement du service worker
// ═══════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Échec silencieux : l'app reste 100% fonctionnelle sans service worker,
      // seul l'usage hors-ligne / l'installation ne sera pas dispo.
    });
  });
}

