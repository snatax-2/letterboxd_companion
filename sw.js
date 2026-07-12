// Service worker Ludex Rating Companion
// Stratégie : "network-first" pour les fichiers de l'app (toujours la dernière version
// si le réseau répond, sinon on retombe sur la dernière copie en cache pour marcher hors-ligne).
// Les appels /api/* ne sont JAMAIS interceptés ici : le cache CDN de Vercel s'en occupe déjà
// (voir Cache-Control dans api/search.js), et les données doivent rester à jour.

// La valeur de CACHE_NAME est réécrite automatiquement à chaque déploiement par
// scripts/generate-sw-cache.js (voir package.json > "build"), à partir d'un hash
// du contenu réel de l'app (index.html, styles.css, app.js, manifest.json, icônes).
// Elle change donc seulement quand ces fichiers changent vraiment — rien à faire manuellement.
const CACHE_NAME = 'ludex-shell-b62898d9d3';

const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
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

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
  );
});
