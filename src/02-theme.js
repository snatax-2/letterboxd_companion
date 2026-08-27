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

const DEFAULT_APP_NAME = 'Ludex Rating Companion';
const APP_NAME_MAX_LENGTH = 80;

// Les anciennes versions stockaient volontairement <em> autour du premier
// mot. On accepte ce format historique, mais le stockage et le rendu sont
// désormais exclusivement textuels : aucune donnée persistée ne passe par
// innerHTML.
function normalizeAppName(value) {
  const plain = String(value || '')
    .replace(/<\/?em>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, APP_NAME_MAX_LENGTH);
  return plain || DEFAULT_APP_NAME;
}

function renderAppTitle(value) {
  const titleEl = document.getElementById('main-app-title');
  const words = normalizeAppName(value).split(' ');
  const first = document.createElement('em');
  first.textContent = words.shift();
  titleEl.replaceChildren(first);
  if (words.length) titleEl.append(document.createTextNode(` ${words.join(' ')}`));
}

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
let systemThemeListenerAttached = false;

function readStoredTheme() {
  try { return JSON.parse(localStorage.getItem('lbx_settings') || '{}').theme; }
  catch { return undefined; }
}

function ensureSystemThemeListener() {
  if (systemThemeListenerAttached) return;
  systemThemeListenerAttached = true;
  systemThemeQuery.addEventListener('change', e => {
    if (readStoredTheme() !== 'system') return;
    const sysTheme = e.matches ? 'default' : 'filmnoir';
    if (typeof window.loadThemeFonts === 'function') window.loadThemeFonts(sysTheme);
    document.documentElement.setAttribute('data-theme', sysTheme);
    renderAll();
  });
}

function loadSettings() {
  const defaultSettings = { appName: DEFAULT_APP_NAME, theme: 'default' };
  try {
    const saved = JSON.parse(localStorage.getItem('lbx_settings')) || defaultSettings;
    applySettings(saved);
  } catch {
    applySettings(defaultSettings);
  }
}

function applySettings(settings) {
  settings = settings && typeof settings === 'object' ? settings : {};
  const appName = normalizeAppName(settings.appName);
  renderAppTitle(appName);
  
  let themeToApply = settings.theme || "default";
  // Repli pour quiconque avait Méridien enregistré avant son retrait — un
  // data-theme inconnu laisserait l'app sans variables CSS définies plutôt
  // que de retomber sur des couleurs cohérentes.
  if (themeToApply === 'meridien') themeToApply = 'default';
  
  if (themeToApply === "system") {
    const prefersDark = systemThemeQuery.matches;
    themeToApply = prefersDark ? "default" : "filmnoir"; 
    ensureSystemThemeListener();
  }
  
  // Charge les polices du thème qu'on vient d'activer (voir loadThemeFonts
  // dans index.html) : seules celles du thème actif sont téléchargées, donc
  // changer de thème doit demander les siennes. La fonction est idempotente,
  // un thème déjà vu ne redéclenche aucune requête.
  if (typeof window.loadThemeFonts === 'function') window.loadThemeFonts(themeToApply);
  document.documentElement.setAttribute('data-theme', themeToApply);
  document.getElementById('setting-app-name').value = appName;
  document.getElementById('setting-genre-weights-enabled').checked = settings.genreWeightsEnabled !== false; // true par défaut (comportement historique conservé)
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
  openModalElement(document.getElementById('settings-modal'), {
    initialFocus: document.getElementById('setting-app-name'),
    returnFocus: document.getElementById('settings-btn'),
  });
});

document.getElementById('settings-cancel').addEventListener('click', () => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('lbx_settings') || '{}'); } catch { /* réglages corrompus : valeurs par défaut */ }
  applySettings(s); 
  closeModal(document.getElementById('settings-modal'));
});

function selectThemeCard(card) {
  document.querySelectorAll('.theme-card').forEach(tc => {
    tc.classList.remove('selected');
    tc.setAttribute('aria-checked', 'false');
  });
  card.classList.add('selected');
  card.setAttribute('aria-checked', 'true');
  withThemeTransition(() => {
    // Même remarque que dans applySettings : les polices du thème choisi
    // doivent être demandées, elles ne sont plus toutes préchargées.
    const picked = card.dataset.theme !== "system"
      ? card.dataset.theme
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? "default" : "filmnoir");
    if (typeof window.loadThemeFonts === 'function') window.loadThemeFonts(picked);
    document.documentElement.setAttribute('data-theme', picked);
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
  const appName = normalizeAppName(document.getElementById('setting-app-name').value);
  
  const newSettings = {
    appName,
    theme: (document.querySelector('.theme-card.selected')||{dataset:{theme:'default'}}).dataset.theme,
    genreWeightsEnabled: document.getElementById('setting-genre-weights-enabled').checked,
  };
  
  localStorage.setItem('lbx_settings', JSON.stringify(newSettings));
  const selectedProviders = Array.from(document.querySelectorAll('.platform-chip.selected')).map(c => c.dataset.provider);
  saveOwnedProviders(selectedProviders);
  applySettings(newSettings);
  renderAll();
  closeModal(document.getElementById('settings-modal'));
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
