#!/usr/bin/env node
// Minifie app.js et styles.css APRÈS le build normal, pour réduire la charge
// réseau réelle (mesuré : ~95Ko -> ~48Ko gzippé pour le JS, ~45Ko -> ~29Ko
// pour le CSS). N'est PAS appelé par `npm run build` : ce script tourne
// uniquement dans le buildCommand Vercel (voir vercel.json), après le build
// normal. Le fichier app.js commité en Git reste lisible pour les diffs/revues
// et la vérification CI ("app.js pas modifié sans rebuild") continue de
// comparer contre la version NON minifiée — cette étape n'existe que pour la
// version réellement servie aux utilisateurs.
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

async function main() {
  const root = path.join(__dirname, '..');

  const jsPath = path.join(root, 'app.js');
  const jsSrc = fs.readFileSync(jsPath, 'utf8');
  const jsResult = await minify(jsSrc, { compress: true, mangle: true });
  if (jsResult.error) throw jsResult.error;
  fs.writeFileSync(jsPath, jsResult.code);
  console.log(`app.js minifié : ${jsSrc.length} -> ${jsResult.code.length} octets`);

  const cssPath = path.join(root, 'styles.css');
  const cssSrc = fs.readFileSync(cssPath, 'utf8');
  const cssResult = new CleanCSS({ level: 1 }).minify(cssSrc);
  if (cssResult.errors.length > 0) throw new Error(cssResult.errors.join('\n'));
  fs.writeFileSync(cssPath, cssResult.styles);
  console.log(`styles.css minifié : ${cssSrc.length} -> ${cssResult.styles.length} octets`);
}

main().catch(err => { console.error(err); process.exit(1); });
