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

