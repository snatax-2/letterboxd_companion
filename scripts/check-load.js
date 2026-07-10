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

  // Vérification fonctionnelle légère en plus du simple "ça ne plante pas" :
  // le mode focus (bascule + navigation) doit réellement fonctionner.
  if (!caughtError) {
    try {
      const doc = window.document;
      const toggle = doc.getElementById('focus-mode-toggle');
      const list = doc.getElementById('criteria-list');
      toggle.dispatchEvent(new window.Event('click', { bubbles: true }));
      const activeBlocks = doc.querySelectorAll('.criterion-block.focus-active');
      if (!list.classList.contains('focus-mode') || activeBlocks.length !== 1) {
        console.error('❌ Le mode focus ne fonctionne pas comme attendu après un clic sur la bascule.');
        process.exitCode = 1;
      } else {
        console.log('✓ Mode focus : bascule et affichage d\'un seul critère fonctionnent.');
      }
    } catch (err) {
      console.error('❌ Erreur en testant le mode focus :', err.message);
      process.exitCode = 1;
    }
  }

  // Force la sortie : un setInterval actif (ex: auto-sync cloud) garderait
  // sinon le process Node éveillé indéfiniment en attendant le prochain tick.
  process.exit(process.exitCode || 0);
}

main();
