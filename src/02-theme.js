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

const DEFAULT_APP_NAME = 'Ludex';
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
  // Remplace seulement l'ancien nom par défaut, pas les noms personnalisés.
  if (/^ludex(?: rating companion)?$/i.test(plain)) return DEFAULT_APP_NAME;
  return plain || DEFAULT_APP_NAME;
}

function renderAppTitle(value) {
  const titleEl = document.getElementById('main-app-title');
  const name = normalizeAppName(value);
  const branded = name === DEFAULT_APP_NAME;
  titleEl.classList.toggle('app-wordmark', branded);
  titleEl.removeAttribute('aria-label');
  if (!branded) {
    titleEl.textContent = name;
    return;
  }
  titleEl.setAttribute('aria-label', 'Ludex');
  const wordmark = document.createElement('span');
  wordmark.setAttribute('aria-hidden', 'true');
  const signature = document.createElement('span');
  signature.className = 'app-wordmark-e';
  signature.textContent = 'e';
  wordmark.append('LUD', signature, 'X');
  titleEl.replaceChildren(wordmark);
}

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
let systemThemeListenerAttached = false;
const THEME_PREFERENCES = new Set(['dark', 'light', 'system']);
const LEGACY_LIGHT_THEMES = new Set(['carnet', 'cinephile', 'moderne']);

// Les anciennes préférences restent lisibles dans les sauvegardes et sont
// converties une seule fois vers la nouvelle paire Dark/Light. Les autres
// réglages de l'objet sont conservés tels quels.
function normalizeThemePreference(theme) {
  if (THEME_PREFERENCES.has(theme)) return theme;
  if (LEGACY_LIGHT_THEMES.has(theme)) return 'light';
  return 'dark';
}

function resolveThemePreference(theme) {
  const preference = normalizeThemePreference(theme);
  if (preference !== 'system') return preference;
  return systemThemeQuery.matches ? 'dark' : 'light';
}

function readStoredTheme() {
  return readRegisteredStorage('settings', {}).theme;
}

function ensureSystemThemeListener() {
  if (systemThemeListenerAttached) return;
  systemThemeListenerAttached = true;
  systemThemeQuery.addEventListener('change', e => {
    if (readStoredTheme() !== 'system') return;
    const sysTheme = e.matches ? 'dark' : 'light';
    if (typeof window.loadThemeFonts === 'function') window.loadThemeFonts(sysTheme);
    document.documentElement.setAttribute('data-theme', sysTheme);
    renderAll();
  });
}

function loadSettings() {
  const defaultSettings = { appName: DEFAULT_APP_NAME, theme: 'dark' };
  const stored = readRegisteredStorage('settings', defaultSettings);
  const normalizedTheme = normalizeThemePreference(stored.theme);
  const normalizedSettings = { ...stored, theme: normalizedTheme };
  if (stored.theme !== normalizedTheme) writeRegisteredStorage('settings', normalizedSettings);
  applySettings(normalizedSettings);
}

function applySettings(settings) {
  settings = settings && typeof settings === 'object' ? settings : {};
  const appName = normalizeAppName(settings.appName);
  renderAppTitle(appName);
  
  const themePreference = normalizeThemePreference(settings.theme);
  const themeToApply = resolveThemePreference(themePreference);
  if (themePreference === 'system') ensureSystemThemeListener();
  
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
  const th = themePreference;
  document.querySelectorAll('.theme-card').forEach(tc => {
    const isSelected = tc.dataset.theme === th;
    tc.classList.toggle('selected', isSelected);
    tc.setAttribute('aria-checked', String(isSelected));
    tc.tabIndex = isSelected ? 0 : -1;
  });
}

document.getElementById('settings-btn').addEventListener('click', () => {
  openModalElement(document.getElementById('settings-modal'), {
    initialFocus: document.getElementById('setting-app-name'),
    returnFocus: document.getElementById('settings-btn'),
  });
});

document.getElementById('settings-cancel').addEventListener('click', () => {
  applySettings(readRegisteredStorage('settings', {}));
  closeModal(document.getElementById('settings-modal'));
});

function selectThemeCard(card) {
  document.querySelectorAll('.theme-card').forEach(tc => {
    tc.classList.remove('selected');
    tc.setAttribute('aria-checked', 'false');
    tc.tabIndex = -1;
  });
  card.classList.add('selected');
  card.setAttribute('aria-checked', 'true');
  card.tabIndex = 0;
  withThemeTransition(() => {
    // Même remarque que dans applySettings : les polices du thème choisi
    // doivent être demandées, elles ne sont plus toutes préchargées.
    const picked = resolveThemePreference(card.dataset.theme);
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

// Accessibilité clavier : groupe radio avec roving tabindex. Une seule carte
// participe à l'ordre Tab ; les flèches, Début et Fin déplacent ET activent la
// sélection comme un groupe de boutons radio natif.
document.getElementById('theme-grid').addEventListener('keydown', e => {
  const card = e.target.closest('.theme-card');
  if (!card) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectThemeCard(card);
    return;
  }
  const cards = Array.from(document.querySelectorAll('.theme-card'));
  const currentIndex = cards.indexOf(card);
  let nextIndex;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (currentIndex + 1) % cards.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (currentIndex - 1 + cards.length) % cards.length;
  else if (e.key === 'Home') nextIndex = 0;
  else if (e.key === 'End') nextIndex = cards.length - 1;
  else return;
  e.preventDefault();
  const nextCard = cards[nextIndex];
  selectThemeCard(nextCard);
  nextCard.focus();
});

function loadOwnedProviders() {
  return readRegisteredStorage('ownedProviders', []);
}
function saveOwnedProviders(list) {
  return writeRegisteredStorage('ownedProviders', list);
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
    theme: (document.querySelector('.theme-card.selected')||{dataset:{theme:'dark'}}).dataset.theme,
    genreWeightsEnabled: document.getElementById('setting-genre-weights-enabled').checked,
  };
  
  const selectedProviders = Array.from(document.querySelectorAll('.platform-chip.selected')).map(c => c.dataset.provider);
  if (!writeRegisteredStorage('settings', newSettings) || !saveOwnedProviders(selectedProviders)) return;
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
