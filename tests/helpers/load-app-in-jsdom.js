// Charge index.html + app.js dans un DOM simulé (jsdom), pour tester des
// fonctions qui ne peuvent pas se `require()` isolément (elles font du
// `document.getElementById(...)` au niveau du module, comme la plupart des
// fichiers de src/ — voir 03b-pure-logic.js pour le seul fichier VRAIMENT
// sans DOM, déjà testable par require() direct). Même principe que
// scripts/check-load.js, extrait ici pour être réutilisé par plusieurs
// fichiers de test (mergeWithRemote, escAttr/buildStripMeta...) sans dupliquer
// la config jsdom trois fois.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let appJsCache = null;
function readAppJs() {
  // app.js est un artefact généré (gitignored, voir scripts/build-app-js.js) —
  // ce module suppose qu'il a déjà été construit, comme check-load.js. Mis en
  // cache : plusieurs fichiers de test l'utilisent, pas besoin de relire le
  // disque à chaque fenêtre créée.
  if (!appJsCache) appJsCache = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  return appJsCache;
}

// `t` : le TestContext de node:test (premier argument du callback passé à
// test(...)). Sert à enregistrer window.close() en nettoyage — app.js pose un
// setInterval de synchro auto (10-cloud-sync.js) qui, sans fermeture
// explicite de la fenêtre, garde le process node --test vivant indéfiniment
// après la fin des tests (timer jamais nettoyé). window.close() annule tous
// les timers créés par CETTE fenêtre.
function loadAppInJsdom(t) {
  const dom = new JSDOM(HTML, { url: 'https://example.com/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.navigator.vibrate = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  dom.window.eval(readAppJs());
  t.after(() => window.close());
  return window;
}

module.exports = { loadAppInJsdom };
