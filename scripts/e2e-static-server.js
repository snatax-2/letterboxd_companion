// Petit serveur de fichiers statiques, en Node pur (aucune dépendance) —
// utilisé uniquement par les tests E2E (Playwright) pour servir l'app le
// temps des tests. Remplace l'ancienne solution "python3 -m http.server",
// qui supposait Python installé et accessible en ligne de commande — ce qui
// n'est pas garanti sur toutes les machines (Windows en particulier, où
// "python3" peut renvoyer une erreur au lieu de lancer un vrai interpréteur).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[2] ? parseInt(process.argv[2], 10) : 4174;
const ROOT = process.cwd();

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);

  // Sécurité minimale : interdit de sortir du dossier servi.
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serveur de test E2E prêt sur http://127.0.0.1:${PORT}`);
});
