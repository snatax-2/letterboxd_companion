// ═══════════════════════════════════════════
//  THEMING & SETTINGS
// ═══════════════════════════════════════════

// ─── Wordmark par défaut ───────────────────────────────────────────────────
// Repris du prototype Archives & Éditorial (.brand) : capitales très espacées
// avec UNE lettre en serif italique minuscule au milieu. Ce n'est donc pas le
// motif générique "premier mot en italique" que produit la sauvegarde des
// Réglages — d'où les deux constantes, et la garde dans settings-save plus
// bas : sans elle, ouvrir Réglages et sauvegarder sans rien changer écrasait
// le wordmark composé par un LUDEX entièrement italique.
//
// Le champ « Nom de l'application » reste pleinement fonctionnel : un nom
// personnalisé garde le traitement générique, seul le nom par défaut a droit
// à sa composition dessinée.
// ── Thèmes retirés ──
// Quatre thèmes historiques ont été retirés (Letterboxd, Carnet de Voyage,
// Film Noir, Moderne). Deux sont conservés à côté des deux thèmes Ludex :
// Cinéphile 70s et Technicolor.
//
// Chaque thème retiré rejoint celui des deux Ludex qui garde son CARACTÈRE
// clair ou sombre, plutôt que de renvoyer tout le monde sur le thème par
// défaut : quelqu'un qui avait choisi Carnet de Voyage (papier crème) ne doit
// pas se réveiller sur un fond noir.
const THEMES_RETIRES = {
  meridien: 'ludex-dark',   // retiré avant les autres, repli conservé
  default:  'ludex-dark',   // Letterboxd — #0E1116
  filmnoir: 'ludex-dark',   // #050505
  carnet:   'ludex-light',  // #FAF3EC
  moderne:  'ludex-light',  // #F9F6F0
};

// « Auto (Système) » désignait default (sombre) et filmnoir (sombre AUSSI,
// #050505) : sa branche « clair » n'a jamais rendu un thème clair. Défaut
// réel, corrigé au passage — la paire pointe maintenant sur les deux Ludex,
// qui sont bien l'un sombre et l'autre clair.
const THEME_AUTO_SOMBRE = 'ludex-dark';
const THEME_AUTO_CLAIR = 'ludex-light';

const DEFAULT_APP_NAME_TEXT = 'LUDEX';
const DEFAULT_APP_NAME_HTML = 'LUD<em>e</em>X';

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
  // Ludex Sombre est le thème des NOUVEAUX utilisateurs (identité cible,
  // voir styles.css bloc LUDEX — ARCHIVES & ÉDITORIAL). Ce défaut ne
  // s'applique qu'en l'absence totale de préférence enregistrée : toute
  // personne ayant déjà choisi un thème garde exactement le sien.
  const defaultSettings = { appName: DEFAULT_APP_NAME_HTML, theme: "ludex-dark" };
  try {
    const saved = JSON.parse(localStorage.getItem('lbx_settings')) || defaultSettings;
    applySettings(saved);
  } catch {
    applySettings(defaultSettings);
  }
}

function applySettings(settings) {
  document.getElementById('main-app-title').innerHTML = settings.appName || DEFAULT_APP_NAME_HTML;
  
  let themeToApply = settings.theme || "ludex-dark";
  // Repli pour les thèmes retirés — un data-theme inconnu laisserait l'app
  // sans variables CSS définies plutôt que de retomber sur des couleurs
  // cohérentes. La migration (00a-migrations.js) réécrit le réglage stocké,
  // mais ce repli reste indispensable : un appareil peut recevoir par
  // synchronisation un réglage écrit par une version antérieure.
  //
  // Chaque thème rejoint celui des deux Ludex qui garde son CARACTÈRE clair
  // ou sombre : on ne renvoie pas tout le monde sur le thème par défaut, ce
  // qui ferait passer un utilisateur de Carnet de Voyage (papier crème) à un
  // fond noir sans qu'il ait rien demandé.
  themeToApply = THEMES_RETIRES[themeToApply] || themeToApply;
  
  if (themeToApply === "system") {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    themeToApply = prefersDark ? THEME_AUTO_SOMBRE : THEME_AUTO_CLAIR;

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (JSON.parse(localStorage.getItem('lbx_settings') || '{}').theme === 'system') {
            const sysTheme = e.matches ? THEME_AUTO_SOMBRE : THEME_AUTO_CLAIR;
            if (typeof window.loadThemeFonts === 'function') window.loadThemeFonts(sysTheme);
            document.documentElement.setAttribute('data-theme', sysTheme);
            renderAll();
        }
    });
  }
  
  // Charge les polices du thème qu'on vient d'activer (voir loadThemeFonts
  // dans index.html) : seules celles du thème actif sont téléchargées, donc
  // changer de thème doit demander les siennes. La fonction est idempotente,
  // un thème déjà vu ne redéclenche aucune requête.
  if (typeof window.loadThemeFonts === 'function') window.loadThemeFonts(themeToApply);
  document.documentElement.setAttribute('data-theme', themeToApply);
  document.getElementById('setting-app-name').value = (settings.appName || "").replace(/<\/?em>/g, '');
  document.getElementById('setting-genre-weights-enabled').checked = settings.genreWeightsEnabled !== false; // true par défaut (comportement historique conservé)
  const owned = loadOwnedProviders();
  document.querySelectorAll('.platform-chip').forEach(chip => {
    chip.classList.toggle('selected', owned.includes(chip.dataset.provider));
  });
  const th = settings.theme || 'ludex-dark';
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
    // Même remarque que dans applySettings : les polices du thème choisi
    // doivent être demandées, elles ne sont plus toutes préchargées.
    const picked = card.dataset.theme !== "system"
      ? card.dataset.theme
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME_AUTO_SOMBRE : THEME_AUTO_CLAIR);
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
  let rawName = document.getElementById('setting-app-name').value.trim();
  if (!rawName) rawName = DEFAULT_APP_NAME_TEXT;
  // Le nom par défaut retrouve sa composition dessinée plutôt que le motif
  // générique : sans ça, un simple passage par Réglages suffisait à la perdre.
  const firstWord = rawName.split(' ')[0];
  const formattedName = rawName.toUpperCase() === DEFAULT_APP_NAME_TEXT
    ? DEFAULT_APP_NAME_HTML
    : rawName.replace(firstWord, `<em>${firstWord}</em>`);
  
  const newSettings = {
    appName: formattedName,
    theme: (document.querySelector('.theme-card.selected')||{dataset:{theme:'ludex-dark'}}).dataset.theme,
    genreWeightsEnabled: document.getElementById('setting-genre-weights-enabled').checked,
  };
  
  localStorage.setItem('lbx_settings', JSON.stringify(newSettings));
  const selectedProviders = Array.from(document.querySelectorAll('.platform-chip.selected')).map(c => c.dataset.provider);
  saveOwnedProviders(selectedProviders);
  applySettings(newSettings);
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
