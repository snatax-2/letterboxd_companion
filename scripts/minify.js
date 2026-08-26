// Minifie app.js (en place) et génère styles.min.css à partir de styles.css.
//
// Pourquoi deux traitements différents pour JS et CSS :
// - app.js est déjà un fichier GÉNÉRÉ (assemblé par build-app-js.js à partir
//   de src/*.js, jamais édité à la main — un gros avertissement en tête de
//   fichier le rappelle déjà). Le minifier EN PLACE ne change rien à
//   l'habitude de travail : on édite toujours les fichiers de src/, jamais
//   app.js.
// - styles.css, lui, est édité directement depuis le début du projet — pas
//   de fichiers séparés à concaténer comme pour le JS. Le minifier en place
//   écraserait la version lisible qu'on continue d'éditer à chaque
//   changement de style, avec un vrai risque d'éditer un jour du CSS
//   minifié par erreur dans une session future. On génère donc un fichier
//   SÉPARÉ (styles.min.css), et c'est LUI que index.html/sw.js chargent —
//   styles.css reste la source, jamais servie au navigateur directement.
//
// vercel.json (buildCommand) appelle simplement `npm run build`, ce script y
// suffit : il minifie déjà app.js EN PLACE et écrit styles.min.css, exactement
// ce qui est servi (outputDirectory: "."). Un script séparé
// scripts/minify-for-deploy.js existait en plus dans le buildCommand et
// refaisait le même travail après coup — re-minifier un app.js déjà minifié,
// re-minifier styles.css en CSS déjà couvert par styles.min.css — sans rien
// changer de servi. Doublait le temps de build à chaque déploiement, sans
// bénéfice. Retiré.
//
// Ordre important dans package.json (voir "build") : ce script doit tourner
// APRÈS le lint (qui a besoin du JS lisible, pas minifié, pour être
// pertinent) et AVANT generate-sw-cache.js (qui doit hasher les octets
// RÉELLEMENT servis, donc déjà minifiés).
//
// ── --css-only ──────────────────────────────────────────────────────────
// index.html charge styles.min.css, PAS styles.css. Sans regénération, une
// modification de styles.css n'atteint donc ni le navigateur ni les tests
// e2e : ils continuent de lire l'ancien minifié. Les hooks pretest:e2e /
// precheck:load appellent ce script avec --css-only pour partir du CSS à
// jour, sans toucher à app.js — le minifier avant les tests rendrait les
// traces d'erreur illisibles et casserait le lint qui suit.

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const ROOT = path.join(__dirname, '..');
const APP_JS = path.join(ROOT, 'app.js');
const STYLES_CSS = path.join(ROOT, 'styles.css');
const STYLES_MIN_CSS = path.join(ROOT, 'styles.min.css');

const cssOnly = process.argv.includes('--css-only');

async function run() {
  // ── JS : minifie app.js en place ──
  if (!cssOnly) await minifyJs();

  // ── CSS : génère styles.min.css à partir de styles.css (source intacte) ──
  const originalCss = fs.readFileSync(STYLES_CSS, 'utf8');
  const cssResult = new CleanCSS({ level: 2 }).minify(originalCss);
  if (cssResult.errors.length) throw new Error(cssResult.errors.join('\n'));
  fs.writeFileSync(STYLES_MIN_CSS, cssResult.styles, 'utf8');
  const cssBefore = Buffer.byteLength(originalCss, 'utf8');
  const cssAfter = Buffer.byteLength(cssResult.styles, 'utf8');
  console.log(`[minify] styles.min.css généré : ${(cssBefore/1024).toFixed(1)} Ko -> ${(cssAfter/1024).toFixed(1)} Ko (-${Math.round((1 - cssAfter/cssBefore)*100)}%)`);
}

async function minifyJs() {
  const originalJs = fs.readFileSync(APP_JS, 'utf8');
  const result = await minify(originalJs, {
    compress: true,
    mangle: true,
    format: { comments: false },
  });
  if (result.error) throw result.error;
  fs.writeFileSync(APP_JS, result.code, 'utf8');
  const jsBefore = Buffer.byteLength(originalJs, 'utf8');
  const jsAfter = Buffer.byteLength(result.code, 'utf8');
  console.log(`[minify] app.js : ${(jsBefore/1024).toFixed(1)} Ko -> ${(jsAfter/1024).toFixed(1)} Ko (-${Math.round((1 - jsAfter/jsBefore)*100)}%)`);
}

run().catch((err) => {
  console.error('[minify] échec :', err);
  process.exit(1);
});
