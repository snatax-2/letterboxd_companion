// Charge index.html + app.js dans un DOM simulé (jsdom) et vérifie qu'aucune
// erreur ne survient à l'exécution du script.
//
// Pourquoi : une erreur JS non interceptée pendant l'exécution initiale du
// script (ex: `document.getElementById('id-qui-n-existe-pas').addEventListener(...)`)
// arrête TOUT le reste du script — plus aucun bouton de l'app ne fonctionne,
// silencieusement, sans message d'erreur visible pour l'utilisateur. `node --check`
// ne détecte que les erreurs de SYNTAXE, pas ce genre d'erreur d'exécution.
//
// Lancé automatiquement par le CI (voir .github/workflows/ci.yml) et disponible
// en local via : npm run check:load

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

function main() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

  const dom = new JSDOM(html, {
    url: 'https://example.com/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // Polyfills minimaux : on ne teste pas le réseau/les capteurs, juste que le
  // script s'exécute sans planter sur une référence DOM manquante.
  window.navigator.vibrate = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });

  let caughtError = null;
  window.addEventListener('error', (e) => {
    caughtError = e.error || e.message;
  });

  try {
    dom.window.eval(appJs);
  } catch (err) {
    caughtError = err;
  }

  if (caughtError) {
    console.error('❌ Erreur au chargement de app.js dans un DOM simulé :');
    console.error(caughtError.stack || caughtError);
    console.error('\nUne erreur ici casse TOUT le reste du script pour de vrais utilisateurs.');
    process.exitCode = 1;
  } else {
    console.log('✓ app.js s\'exécute entièrement sans erreur (DOM simulé).');
  }

  // Force la sortie : un setInterval actif (ex: auto-sync cloud) garderait
  // sinon le process Node éveillé indéfiniment en attendant le prochain tick.
  process.exit(process.exitCode || 0);
}

main();
