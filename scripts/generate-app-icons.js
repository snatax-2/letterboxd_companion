// Exports techniques du visuel approuvé, sans régénérer ni redessiner le logo.
// Commande locale facultative : node scripts/generate-app-icons.js
// Prérequis : ImageMagick (convert). Les PNG sont versionnés, aucun outil
// d'image supplémentaire n'est nécessaire au build de déploiement.
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const source = path.join(root, 'assets', 'ludex-icon-source.png');
const outputs = [
  ['favicon.png', 64],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-192.png', 192, true],
  ['icon-maskable-512.png', 512, true],
];

for (const [name, size, maskable] of outputs) {
  // Réduire l'image entière à 72 % garde le cadre de pellicule dans le
  // cercle sûr de rayon 40 %. Le fond reste opaque et non arrondi.
  const contentSize = maskable ? Math.round(size * 0.72) : size;
  const args = [source, '-auto-orient', '-filter', 'Lanczos', '-resize', `${contentSize}x${contentSize}`,
    '-background', '#080807', '-alpha', 'remove', '-alpha', 'off'];
  if (maskable) args.push('-gravity', 'center', '-extent', `${size}x${size}`);
  args.push('-strip', `PNG24:${path.join(root, name)}`);
  execFileSync('convert', args);
  console.log(`${name} : ${size} × ${size}`);
}
