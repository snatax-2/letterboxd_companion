// ═══════════════════════════════════════════
//  THEMING & SETTINGS
// ═══════════════════════════════════════════

// Applique une classe temporaire qui active une transition douce sur (quasi)
// tous les éléments pendant un changement de thème, plutôt qu'un changement
// de couleurs instantané et net. Limité à une courte fenêtre (350ms) pour ne
// pas garder ces transitions actives en permanence (coût de perf inutile,
// et risque d'interférer avec d'autres animations ponctuelles de l'app).
function withThemeTransition(applyFn) {
  const root = document.documentElement;
  root.classList.add('theme-transitioning');
  applyFn();
  setTimeout(() => root.classList.remove('theme-transitioning'), 350);
}

function loadSettings() {
  const defaultSettings = { appName: "<em>Ludex</em> Rating Companion", theme: "default" };
  try {
    const saved = JSON.parse(localStorage.getItem('lbx_settings')) || defaultSettings;
    applySettings(saved);
  } catch (e) {
    applySettings(defaultSettings);
  }
}

function applySettings(settings) {
  document.getElementById('main-app-title').innerHTML = settings.appName || "<em>Ludex</em> Rating Companion";
  
  let themeToApply = settings.theme || "default";
  // Repli pour quiconque avait Méridien enregistré avant son retrait — un
  // data-theme inconnu laisserait l'app sans variables CSS définies plutôt
  // que de retomber sur des couleurs cohérentes.
  if (themeToApply === 'meridien') themeToApply = 'default';
  
  if (themeToApply === "system") {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    themeToApply = prefersDark ? "default" : "filmnoir"; 
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (JSON.parse(localStorage.getItem('lbx_settings') || '{}').theme === 'system') {
            document.documentElement.setAttribute('data-theme', e.matches ? "default" : "filmnoir");
            renderAll();
        }
    });
  }
  
  document.documentElement.setAttribute('data-theme', themeToApply);
  document.getElementById('setting-app-name').value = (settings.appName || "").replace(/<\/?em>/g, '');
  document.getElementById('setting-genre-weights-enabled').checked = settings.genreWeightsEnabled !== false; // true par défaut (comportement historique conservé)
  // Suggestions Découvrir en liste compacte plutôt qu'en pile à glisser —
  // false par défaut (comportement historique conservé). Le changement de
  // mise en page proprement dit vit dans 11-discover.js (renderDiscoverCards
  // lit ce même data-attribute au moment du rendu).
  document.getElementById('setting-discover-swipe-compact').checked = settings.discoverSwipeCompact === true;
  document.documentElement.classList.toggle('discover-swipe-compact', settings.discoverSwipeCompact === true);
  const owned = loadOwnedProviders();
  document.querySelectorAll('.platform-chip').forEach(chip => {
    chip.classList.toggle('selected', owned.includes(chip.dataset.provider));
  });
  const th = settings.theme || 'default';
  document.querySelectorAll('.theme-card').forEach(tc => {
    const isSelected = tc.dataset.theme === th;
    tc.classList.toggle('selected', isSelected);
    tc.setAttribute('aria-checked', String(isSelected));
  });
}

document.getElementById('settings-btn').addEventListener('click', () => {
  lastFocusedBeforeModal = document.getElementById('settings-btn');
  document.getElementById('settings-modal').classList.add('open');
  document.getElementById('setting-app-name').focus();
});

document.getElementById('settings-cancel').addEventListener('click', () => {
  const s = JSON.parse(localStorage.getItem('lbx_settings') || '{}');
  applySettings(s); 
  document.getElementById('settings-modal').classList.remove('open');
  document.getElementById('settings-btn').focus();
});

function selectThemeCard(card) {
  document.querySelectorAll('.theme-card').forEach(tc => {
    tc.classList.remove('selected');
    tc.setAttribute('aria-checked', 'false');
  });
  card.classList.add('selected');
  card.setAttribute('aria-checked', 'true');
  withThemeTransition(() => {
    if (card.dataset.theme !== "system") {
        document.documentElement.setAttribute('data-theme', card.dataset.theme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? "default" : "filmnoir");
    }
  });
  renderAll();
}

document.getElementById('theme-grid').addEventListener('click', e => {
  const card = e.target.closest('.theme-card');
  if (!card) return;
  selectThemeCard(card);
});

// Accessibilité clavier : les cartes de thème ont role="radio" (voir index.html),
// donc Entrée et Espace doivent les activer comme un vrai bouton radio.
document.getElementById('theme-grid').addEventListener('keydown', e => {
  const card = e.target.closest('.theme-card');
  if (!card) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectThemeCard(card);
  }
});

const OWNED_PROVIDERS_KEY = 'lbx_owned_providers';
function loadOwnedProviders() {
  try { return JSON.parse(localStorage.getItem(OWNED_PROVIDERS_KEY)) || []; } catch { return []; }
}
function saveOwnedProviders(list) {
  localStorage.setItem(OWNED_PROVIDERS_KEY, JSON.stringify(list));
}

document.getElementById('platform-chips-grid').addEventListener('click', (e) => {
  const chip = e.target.closest('.platform-chip');
  if (!chip) return;
  chip.classList.toggle('selected');
});

document.getElementById('settings-save').addEventListener('click', () => {
  let rawName = document.getElementById('setting-app-name').value.trim();
  if(!rawName) rawName = "Ludex Rating Companion";
  const firstWord = rawName.split(' ')[0];
  const formattedName = rawName.replace(firstWord, `<em>${firstWord}</em>`);
  
  const newSettings = {
    appName: formattedName,
    theme: (document.querySelector('.theme-card.selected')||{dataset:{theme:'default'}}).dataset.theme,
    genreWeightsEnabled: document.getElementById('setting-genre-weights-enabled').checked,
    discoverSwipeCompact: document.getElementById('setting-discover-swipe-compact').checked,
  };
  
  localStorage.setItem('lbx_settings', JSON.stringify(newSettings));
  const selectedProviders = Array.from(document.querySelectorAll('.platform-chip.selected')).map(c => c.dataset.provider);
  saveOwnedProviders(selectedProviders);
  applySettings(newSettings);
  // Le mode d'affichage a pu changer : redessine la pile de suggestions dans
  // sa nouvelle forme si elle a déjà des films chargés (sinon rien à faire,
  // le prochain chargement lira directement la classe posée par applySettings).
  if (typeof renderDiscoverCards === 'function' && discoverQueue.length > 0) renderDiscoverCards();
  renderAll();
  document.getElementById('settings-modal').classList.remove('open');
  document.getElementById('settings-btn').focus();
});

loadSettings();


// ── theme-color dynamique ──
// La barre de statut iOS (et la couleur de fenêtre PWA) suit le thème actif
// au lieu de rester figée sur une couleur générique : le meta theme-color est
// resynchronisé avec le --bg calculé à chaque changement d'attribut data-theme
// (MutationObserver : couvre TOUS les chemins d'application — réglages,
// système, bascule jour/nuit de Méridien — sans dupliquer l'appel partout).
(function initDynamicThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  function sync() {
    // rAF : attend que le nouveau thème soit appliqué au style calculé
    requestAnimationFrame(() => {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      if (bg) meta.setAttribute('content', bg);
    });
  }
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  sync(); // etat initial
})();
