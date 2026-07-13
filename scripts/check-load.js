// Charge index.html + app.js dans un DOM simulé (jsdom) et vérifie qu'aucune
// erreur ne survient à l'exécution du script — à la fois à vide et avec des
// données réelles déjà présentes (historique, watchlist).
//
// Pourquoi les deux cas : certains bugs ne se manifestent QUE lorsqu'il y a
// déjà des données au chargement (ex: une const top-level référencée par un
// appel précoce dans un autre fichier, avant que sa propre ligne de
// déclaration se soit exécutée — bug réel rencontré et corrigé dans
// createRadarSVG). Ne tester qu'à vide aurait laissé passer ce genre de bug
// silencieusement, alors qu'il casse l'app pour tout utilisateur ayant déjà
// noté des films.
//
// `node --check` ne détecte que les erreurs de SYNTAXE, pas ce genre d'erreur
// d'exécution — d'où ce script, qui simule un vrai chargement de page.
//
// Lancé automatiquement par le CI (voir .github/workflows/ci.yml) et disponible
// en local via : npm run check:load

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const APP_JS = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

let hasFailure = false;

function freshDom() {
  const dom = new JSDOM(HTML, {
    url: 'https://example.com/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.navigator.vibrate = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  return { dom, window };
}

// ─── Test 1 : chargement à vide ──────────────────────────────────────────────
(function testEmptyLoad() {
  const { dom, window } = freshDom();
  let caughtError = null;
  window.addEventListener('error', (e) => { caughtError = e.error || e.message; });

  try {
    dom.window.eval(APP_JS);
  } catch (err) {
    caughtError = err;
  }

  if (caughtError) {
    console.error('❌ Erreur au chargement à vide (DOM simulé) :');
    console.error(caughtError.stack || caughtError);
    console.error('\nUne erreur ici casse TOUT le reste du script pour de vrais utilisateurs.');
    hasFailure = true;
    return;
  }
  console.log('✓ app.js s\'exécute entièrement sans erreur (chargement à vide).');

  try {
    const doc = window.document;
    const toggle = doc.getElementById('focus-mode-toggle');
    const list = doc.getElementById('criteria-list');
    toggle.dispatchEvent(new window.Event('click', { bubbles: true }));
    const activeBlocks = doc.querySelectorAll('.criterion-block.focus-active');
    if (!list.classList.contains('focus-mode') || activeBlocks.length !== 1) {
      console.error('❌ Le mode focus ne fonctionne pas comme attendu après un clic sur la bascule.');
      hasFailure = true;
    } else {
      console.log('✓ Mode focus : bascule et affichage d\'un seul critère fonctionnent.');
    }
  } catch (err) {
    console.error('❌ Erreur en testant le mode focus :', err.message);
    hasFailure = true;
  }
})();

// ─── Test 2 : chargement avec un historique et une watchlist déjà remplis ────
(function testLoadWithData() {
  const { dom, window } = freshDom();

  const fakeHistory = [{
    title: 'Film de test', score: '8.5', savedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    mode: 'detail', date: '2026-01-01',
    values: { scenario: 8, realisation: 8, photo: 8, acteurs: 8, ambiance: 8, rythme: 8, affect: 8 },
    poster: '', tmdbId: '123', liked: true, review: 'Une critique de test',
    contextTags: ['🍿 Cinéma', '🔄 Re-visionnage', '📝 Analyse / Étude', '🛋️ À la maison'],
  }];
  window.localStorage.setItem('lbx_v2', JSON.stringify(fakeHistory));
  window.localStorage.setItem('lbx_watchlist', JSON.stringify([
    { title: 'Film watchlist de test', tmdbId: '456', addedAt: new Date().toISOString(), poster: '' },
  ]));

  let caughtError = null;
  window.addEventListener('error', (e) => { caughtError = e.error || e.message; });

  try {
    dom.window.eval(APP_JS);
    window.renderHistory();
    window.renderWatchlist();
    window.renderStats(); // renderAll() est différée (setTimeout 0) depuis le fix de la zone morte temporelle — appel explicite ici pour la même raison que renderHistory/renderWatchlist juste au-dessus
  } catch (err) {
    caughtError = err;
  }

  if (caughtError) {
    console.error('❌ Erreur au chargement AVEC un historique existant (DOM simulé) :');
    console.error(caughtError.stack || caughtError);
    hasFailure = true;
    return;
  }
  console.log('✓ app.js fonctionne aussi avec un historique et une watchlist non vides.');

  const doc = window.document;
  const radarOk = doc.getElementById('radar-chart-container').innerHTML.includes('svg');
  const iconsOk = !!doc.querySelector('.hist-action-btn svg') && !!doc.querySelector('.wl-btn.rate svg');
  if (!radarOk || !iconsOk) {
    console.error('❌ Rendu incomplet avec des données réelles (radar ou icônes manquants).');
    hasFailure = true;
  } else {
    console.log('✓ Radar et icônes des boutons se rendent correctement avec des données réelles.');
  }

  // Actions rapides (menu d'appui long) : vérifie que le menu s'ouvre avec les
  // 4 actions attendues pour un film donné.
  try {
    window.openActionSheetForItem(0);
    const sheet = doc.getElementById('action-sheet');
    const actionCount = doc.querySelectorAll('.action-sheet-item').length;
    if (!sheet.classList.contains('open') || actionCount !== 4) {
      console.error(`❌ Menu d'actions rapides : attendu 4 actions et ouvert, reçu ${actionCount} action(s), ouvert=${sheet.classList.contains('open')}.`);
      hasFailure = true;
    } else {
      console.log('✓ Menu d\'actions rapides (appui long) : ouverture et 4 actions correctes.');
    }
  } catch (err) {
    console.error('❌ Erreur en testant le menu d\'actions rapides :', err.message);
    hasFailure = true;
  }
})();

process.exit(hasFailure ? 1 : 0);
