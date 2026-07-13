// Génère automatiquement un CACHE_NAME unique pour sw.js, basé sur un hash du
// contenu réel des fichiers de l'app (le "app shell" mis en cache par le service worker).
//
// Pourquoi : le service worker (sw.js) ne recharge sa liste de fichiers en cache que
// lorsque CACHE_NAME change. Sans ça, il faudrait penser à l'incrémenter à la main à
// chaque modif d'index.html/styles.css/app.js, sous peine de laisser certains
// utilisateurs bloqués sur une ancienne version en cache.
//
// Ce script tourne automatiquement à chaque déploiement Vercel (voir "build" dans
// package.json). Il ne modifie jamais les fichiers sources : il ne touche qu'à la
// valeur de CACHE_NAME dans sw.js, dans l'environnement de build.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

// Fichiers qui composent l'app shell (doivent rester synchronisés avec APP_SHELL dans sw.js)
const APP_SHELL_FILES = [
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'favicon.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
];

function computeHash() {
  const hash = crypto.createHash('sha256');
  for (const file of APP_SHELL_FILES) {
    const filePath = path.join(ROOT, file);
    if (fs.existsSync(filePath)) {
      hash.update(fs.readFileSync(filePath));
    } else {
      console.warn(`[generate-sw-cache] Fichier introuvable, ignoré : ${file}`);
    }
  }
  return hash.digest('hex').slice(0, 10);
}

function updateServiceWorker(cacheVersion) {
  const swPath = path.join(ROOT, 'sw.js');
  const content = fs.readFileSync(swPath, 'utf8');
  const pattern = /const CACHE_NAME = '.*';/;

  if (!pattern.test(content)) {
    console.warn('[generate-sw-cache] Aucune ligne CACHE_NAME trouvée à remplacer dans sw.js.');
    return;
  }

  const newLine = `const CACHE_NAME = 'ludex-shell-${cacheVersion}';`;
  const updated = content.replace(pattern, newLine);

  fs.writeFileSync(swPath, updated, 'utf8');
  console.log(`[generate-sw-cache] CACHE_NAME mis à jour : ludex-shell-${cacheVersion}`);
}

const version = computeHash();
updateServiceWorker(version);
