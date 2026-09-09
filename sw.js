// Service worker Ludex Rating Companion
// Stratégie : "network-first" pour les fichiers de l'app (toujours la dernière version
// si le réseau répond, sinon on retombe sur la dernière copie en cache pour marcher hors-ligne).
// Les appels /api/* ne sont JAMAIS interceptés ici : le cache CDN de Vercel s'en occupe déjà
// (voir Cache-Control dans api/search.js), et les données doivent rester à jour.

// La valeur de CACHE_NAME est réécrite automatiquement à chaque déploiement par
// scripts/generate-sw-cache.js (voir package.json > "build"), à partir d'un hash
// du contenu réel de l'app (index.html, styles.min.css, app.js, manifest.json, icônes).
// Elle change donc seulement quand ces fichiers changent vraiment — rien à faire manuellement.
const CACHE_NAME = 'ludex-shell-4d46d6b698';

const APP_SHELL = [
  '/',
  '/index.html',
  '/bootstrap.js',
  '/styles.min.css',
  '/app.js',
  '/favicon.png?v=ludex-l1',
  '/apple-touch-icon.png?v=ludex-l1',
  '/manifest.json',
  '/icon-192.png?v=ludex-l1',
  '/icon-512.png?v=ludex-l1',
  '/icon-maskable-192.png?v=ludex-l1',
  '/icon-maskable-512.png?v=ludex-l1'
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
  if (request.url.includes('/api/')) return;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  const isNavigation = request.mode === 'navigate';
  event.respondWith(
    fetch(request)
      .then((response) => {
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
