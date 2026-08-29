// Service worker Ludex Rating Companion
// Stratégie : "network-first" pour les fichiers de l'app (toujours la dernière version
// si le réseau répond, sinon on retombe sur la dernière copie en cache pour marcher hors-ligne).
// Les appels /api/* ne sont JAMAIS interceptés ici : le cache CDN de Vercel s'en occupe déjà
// (voir Cache-Control dans api/search.js), et les données doivent rester à jour.

// La valeur de CACHE_NAME est réécrite automatiquement à chaque déploiement par
// scripts/generate-sw-cache.js (voir package.json > "build"), à partir d'un hash
// du contenu réel de l'app (index.html, styles.min.css, app.js, manifest.json, icônes).
// Elle change donc seulement quand ces fichiers changent vraiment — rien à faire manuellement.
const CACHE_NAME = 'ludex-shell-7986ddb848';

const APP_SHELL = [
  '/',
  '/index.html',
  '/bootstrap.js',
  '/styles.min.css',
  '/app.js',
  '/favicon.png',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ne jamais intercepter les appels API : ils doivent toujours passer par le réseau
  // (le cache HTTP de Vercel gère déjà leur fraîcheur côté serveur).
  if (request.url.includes('/api/')) return;

  // Seules les requêtes GET sont mises en cache.
  if (request.method !== 'GET') return;

  // Ne jamais intercepter une requête vers un AUTRE domaine (affiches TMDb,
  // vignettes YouTube, polices Google). Deux raisons :
  //  1. Ré-émettre la requête depuis le service worker la transforme en
  //     `connect-src` du point de vue de la CSP, au lieu du `img-src` qu'elle
  //     est réellement — toutes les affiches disparaissaient avec un
  //     "Refused to connect" pointant sur cette ligne.
  //  2. Ces réponses sont opaques : les mettre en cache faisait grossir le
  //     cache sans limite, sans qu'on puisse jamais vérifier leur validité.
  // Laissées au navigateur, elles suivent leur cache HTTP normal (les images
  // TMDb sont servies en `immutable`, c'est déjà optimal).
  if (new URL(request.url).origin !== self.location.origin) return;

  const isNavigation = request.mode === 'navigate';
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Ne met en cache que les réponses effectivement valides. Sans ce
        // contrôle, une 404 (fichier renommé, déploiement en cours) ou une
        // 500 passagère était mise en cache et resservie indéfiniment hors
        // ligne, jusqu'au prochain changement de CACHE_NAME.
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (isNavigation) return caches.match('/index.html');
        return new Response('Ressource indisponible hors ligne.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});
