// ⚠️ FICHIER GÉNÉRÉ AUTOMATIQUEMENT — NE PAS ÉDITER DIRECTEMENT.
// Modifie les fichiers dans src/, puis lance `npm run build`.
// Assemblé depuis : 00-pwa.js, 00b-icons.js, 00c-poster-color.js, 01-navigation.js, 02-theme.js, 03-foundation.js, 03b-pure-logic.js, 04-search.js, 05-rating-form.js, 06-history.js, 07-data-io.js, 08-watchlist.js, 09-modal-init.js, 10-cloud-sync.js, 11-discover.js, 12-movie-detail.js

// ═══════════════════════════════════════════
//  PWA : enregistrement du service worker
// ═══════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Échec silencieux : l'app reste 100% fonctionnelle sans service worker,
      // seul l'usage hors-ligne / l'installation ne sera pas dispo.
    });
  });
}

// ═══════════════════════════════════════════
//  BIBLIOTHÈQUE D'ICÔNES SVG (remplace les emoji de l'interface)
// ═══════════════════════════════════════════
// Icônes en traits fins (style "line icon"), en `currentColor` : elles héritent
// automatiquement la couleur du texte environnant, donc s'adaptent au thème
// actif sans configuration supplémentaire. L'épaisseur du trait elle-même
// est pilotée par la variable CSS --icon-stroke (définie par thème dans
// styles.css), pour que chaque thème garde une identité de trait différente
// (ex: traits plus fins et élégants pour Wes Anderson, plus épais et
// tranchants pour Scuderia) sans dupliquer les SVG eux-mêmes.
//
// Usage : ICONS.trash, ICONS.heart, etc. — chaîne de balisage SVG prête à
// insérer dans un template literal (voir 06-history.js, 08-watchlist.js...).
// Pour le HTML statique (index.html), les mêmes icônes sont recopiées
// directement dans le balisage (pas de dépendance à l'exécution du JS).

const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--icon-stroke, 2)" stroke-linecap="round" stroke-linejoin="round" class="icon"';

const ICONS = {
  settings: `<svg ${ICON_ATTRS}><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2" fill="currentColor" stroke="none"/></svg>`,

  exportIcon: `<svg ${ICON_ATTRS}><path d="M12 3v11"/><path d="M7 8l5-5 5 5"/><path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>`,

  importIcon: `<svg ${ICON_ATTRS}><path d="M12 14V3"/><path d="M7 9l5 5 5-5"/><path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>`,

  plus: `<svg ${ICON_ATTRS}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,

  heart: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,

  search: `<svg ${ICON_ATTRS}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,

  barChart: `<svg ${ICON_ATTRS}><line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="19" y1="20" x2="19" y2="15"/></svg>`,

  target: `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>`,

  flame: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.5-2-1-3 2 1 4 4 4 7a7 7 0 0 1-14 0c0-4 3-6 4-8 .5-1 .5-2 0-3 1 0 2.5 0 3 0z"/></svg>`,

  clapper: `<svg ${ICON_ATTRS}><path d="M3 8l1.5-3h4L7 8"/><path d="M8.5 8l1.5-3h4l-1.5 3"/><path d="M14 8l1.5-3h4l-1.5 3"/><rect x="3" y="8" width="18" height="12" rx="1"/></svg>`,

  copy: `<svg ${ICON_ATTRS}><rect x="9" y="9" width="11" height="11" rx="1"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>`,

  refresh: `<svg ${ICON_ATTRS}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>`,

  trash: `<svg ${ICON_ATTRS}><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/><line x1="10" y1="11" x2="10" y2="16"/><line x1="14" y1="11" x2="14" y2="16"/></svg>`,

  palette: `<svg ${ICON_ATTRS}><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.3c1.8 0 3.2-1.4 3.2-3.2C21 6.6 17 2 12 2z"/><circle cx="7" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>`,

  cloud: `<svg ${ICON_ATTRS}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,

  moon: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>`,

  edit: `<svg ${ICON_ATTRS}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,

  check: `<svg ${ICON_ATTRS}><polyline points="20 6 9 17 4 12"/></svg>`,

  close: `<svg ${ICON_ATTRS}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

  star: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6z"/></svg>`,

  popcorn: `<svg ${ICON_ATTRS}><path d="M6 8h12l-1.4 12.1a1 1 0 0 1-1 .9H8.4a1 1 0 0 1-1-.9L6 8z"/><path d="M9 8v13M12 8v13M15 8v13"/><path d="M5 8a2 2 0 0 1 2-3h10a2 2 0 0 1 2 3"/></svg>`,

  sofa: `<svg ${ICON_ATTRS}><path d="M5 12a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3H5v-3z"/><path d="M4 15v4M20 15v4"/><path d="M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>`,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ICONS };
}

// ═══════════════════════════════════════════
//  EXTRACTION DE COULEUR DOMINANTE (thème "Moderne")
// ═══════════════════════════════════════════
// Implémentation "maison" légère (pas de librairie externe type Color Thief) :
// charge l'affiche dans une image SÉPARÉE et invisible (jamais la balise <img>
// réellement affichée à l'écran — celle-ci n'est jamais touchée, aucun risque
// pour son affichage normal), l'échantillonne sur un petit canvas hors-écran
// et moyenne les couleurs (en ignorant les pixels quasi blancs/noirs, souvent
// des bordures ou du texte, pour ne pas biaiser la moyenne). Donne à chaque
// carte un accent visuel tiré de sa propre affiche — signature du thème
// "L'Affiche d'Art Moderne". Se dégrade silencieusement (aucune erreur
// visible) en cas de restriction CORS ou toute autre erreur : la carte garde
// alors simplement la couleur d'accent par défaut du thème.
// Cache en mémoire (URL -> couleur, ou null si l'extraction a échoué) : sans
// lui, la MÊME affiche serait ré-analysée (chargement d'image + dessin canvas
// + boucle sur les pixels) à chaque nouveau rendu de la liste — y compris pour
// des films dont l'affiche n'a pas changé, juste parce qu'un AUTRE film de la
// liste a été modifié/supprimé (ce qui redessine tout). Un vrai coût de
// performance répété inutilement, maintenant évité.
const posterAccentCache = new Map();

function extractPosterAccentColorFromUrl(url) {
  if (posterAccentCache.has(url)) return Promise.resolve(posterAccentCache.get(url));
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const size = 24;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, size, size);
          const { data } = ctx.getImageData(0, 0, size, size);

          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (lum < 15 || lum > 245) continue;
            r += data[i]; g += data[i + 1]; b += data[i + 2];
            count++;
          }
          const color = count === 0 ? null : `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
          posterAccentCache.set(url, color);
          resolve(color);
        } catch (e) {
          posterAccentCache.set(url, null); // canvas "tainted" (CORS) : dégradation silencieuse
          resolve(null);
        }
      };
      img.onerror = () => { posterAccentCache.set(url, null); resolve(null); };
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
}

// N'agit que pour le thème "moderne" — ailleurs, l'extraction ne servirait à
// rien et coûterait du temps de traitement pour rien à chaque affiche chargée.
function applyPosterAccent(posterUrl, cardEl) {
  if (!posterUrl || !cardEl || document.documentElement.dataset.theme !== 'moderne') return;
  extractPosterAccentColorFromUrl(posterUrl).then(color => {
    if (color) cardEl.style.setProperty('--poster-accent', color);
  });
}

// ═══════════════════════════════════════════
//  GESTION DES ONGLETS (Desktop & Mobile)
// ═══════════════════════════════════════════
const tabHistBtn = document.getElementById('tab-right-history');
const tabWlBtn = document.getElementById('tab-right-watchlist');
const tabDiscoverBtn = document.getElementById('tab-right-discover');
const tabProfileBtn = document.getElementById('tab-right-profile');
const viewHist = document.getElementById('view-history');
const viewWl = document.getElementById('view-watchlist');
const viewDiscover = document.getElementById('view-discover');
const viewProfile = document.getElementById('view-profile');

function switchRightTab(tabName) {
  const tabs = {
    history:   { btn: tabHistBtn,     view: viewHist },
    watchlist: { btn: tabWlBtn,       view: viewWl },
    discover:  { btn: tabDiscoverBtn, view: viewDiscover },
    profile:   { btn: tabProfileBtn,  view: viewProfile },
  };
  for (const [name, { btn, view }] of Object.entries(tabs)) {
    const isActive = name === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    view.classList.toggle('active', isActive);
  }
  // Charge les suggestions "Découvrir" au premier affichage seulement (pas de
  // re-fetch à chaque fois qu'on revient sur l'onglet).
  if (tabName === 'discover' && !discoverLoaded) {
    loadDiscoverQueue();
  }
}

tabHistBtn.addEventListener('click', () => switchRightTab('history'));
tabWlBtn.addEventListener('click', () => switchRightTab('watchlist'));
tabDiscoverBtn.addEventListener('click', () => switchRightTab('discover'));
tabProfileBtn.addEventListener('click', () => switchRightTab('profile'));

const navRating = document.getElementById('nav-rating');
const navHistory = document.getElementById('nav-history');
const navWatchlist = document.getElementById('nav-watchlist');
const navDiscover = document.getElementById('nav-discover');
const navProfile = document.getElementById('nav-profile');
const colRating = document.getElementById('col-rating');
const colRightViews = document.getElementById('col-right-views');

// Redémarre l'animation d'entrée (mobileViewIn) sur un élément : on retire la
// classe, on force un reflow (lecture d'une propriété layout), puis on la
// rajoute — sinon le navigateur ne rejoue pas l'animation si la classe était
// déjà présente.
function playMobileViewAnim(el) {
  el.classList.remove('mobile-view-anim');
  requestAnimationFrame(() => el.classList.add('mobile-view-anim'));
}

function switchMobileNav(view) {
  navRating.classList.remove('active');
  navHistory.classList.remove('active');
  navWatchlist.classList.remove('active');
  navDiscover.classList.remove('active');
  navProfile.classList.remove('active');
  navRating.removeAttribute('aria-current');
  navHistory.removeAttribute('aria-current');
  navWatchlist.removeAttribute('aria-current');
  navDiscover.removeAttribute('aria-current');
  navProfile.removeAttribute('aria-current');

  colRating.style.display = 'none';
  colRightViews.style.display = 'none';

  if (view === 'rating') {
    navRating.classList.add('active');
    navRating.setAttribute('aria-current', 'page');
    colRating.style.display = 'block'; 
    playMobileViewAnim(colRating);
  } else if (view === 'history') {
    navHistory.classList.add('active');
    navHistory.setAttribute('aria-current', 'page');
    colRightViews.style.display = 'flex';
    switchRightTab('history');
    playMobileViewAnim(colRightViews);
  } else if (view === 'watchlist') {
    navWatchlist.classList.add('active');
    navWatchlist.setAttribute('aria-current', 'page');
    colRightViews.style.display = 'flex';
    switchRightTab('watchlist');
    playMobileViewAnim(colRightViews);
  } else if (view === 'discover') {
    navDiscover.classList.add('active');
    navDiscover.setAttribute('aria-current', 'page');
    colRightViews.style.display = 'flex';
    switchRightTab('discover');
    playMobileViewAnim(colRightViews);
  } else if (view === 'profile') {
    navProfile.classList.add('active');
    navProfile.setAttribute('aria-current', 'page');
    colRightViews.style.display = 'flex';
    switchRightTab('profile');
    playMobileViewAnim(colRightViews);
  }
}

navRating.addEventListener('click', () => switchMobileNav('rating'));
navHistory.addEventListener('click', () => switchMobileNav('history'));
navWatchlist.addEventListener('click', () => switchMobileNav('watchlist'));
navDiscover.addEventListener('click', () => switchMobileNav('discover'));
navProfile.addEventListener('click', () => switchMobileNav('profile'));

window.addEventListener('resize', () => {
  if (window.innerWidth > 860) {
    colRating.style.display = '';
    colRightViews.style.display = '';
  } else {
    const activeNavId = document.querySelector('.nav-btn.active')?.id;
    if (activeNavId === 'nav-history') switchMobileNav('history');
    else if (activeNavId === 'nav-watchlist') switchMobileNav('watchlist');
    else if (activeNavId === 'nav-discover') switchMobileNav('discover');
    else if (activeNavId === 'nav-profile') switchMobileNav('profile');
    else switchMobileNav('rating');
  }
});

if (window.innerWidth <= 860) {
  switchMobileNav('rating');
}

// ─── Swipe pour naviguer entre les onglets mobiles ───────────────────────────
// Glisser vers la gauche = onglet suivant, vers la droite = onglet précédent,
// dans l'ordre affiché en bas de l'écran : Noter → Historique → À voir → Découvrir.
// Complète les boutons de la barre de navigation, ne les remplace pas.
(function initMobileSwipeNav() {
  const TAB_ORDER = ['rating', 'history', 'watchlist', 'discover', 'profile'];
  const SWIPE_MIN_DISTANCE = 60; // px : en dessous, on considère que ce n'est pas volontaire
  const SWIPE_ANGLE_RATIO = 1.5; // le geste doit être nettement plus horizontal que vertical

  let startX = 0;
  let startY = 0;
  let tracking = false;

  function currentView() {
    if (navHistory.classList.contains('active')) return 'history';
    if (navWatchlist.classList.contains('active')) return 'watchlist';
    if (navDiscover.classList.contains('active')) return 'discover';
    return 'rating';
  }

  // Zones où un glissement horizontal a déjà un sens propre (scroller le
  // carrousel, déplacer un curseur, sélectionner du texte, swiper une carte
  // "Découvrir"...) : on n'y déclenche pas de changement d'onglet.
  function isExcludedTarget(target) {
    return !!target.closest(
      '#carousel-container, .discover-card, .wl-card, .hist-item, input[type="range"], input[type="text"], textarea, .modal-overlay.open'
    );
  }

  document.addEventListener('touchstart', e => {
    if (window.innerWidth > 860) { tracking = false; return; }
    if (e.touches.length !== 1 || isExcludedTarget(e.target)) { tracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_ANGLE_RATIO) return; // trop vertical, probablement un scroll

    const idx = TAB_ORDER.indexOf(currentView());
    if (dx < 0 && idx < TAB_ORDER.length - 1) {
      switchMobileNav(TAB_ORDER[idx + 1]); // glissement vers la gauche -> onglet suivant
      if (navigator.vibrate) navigator.vibrate(15);
      hapticPulse(document.getElementById('mobile-nav'), 'light');
    } else if (dx > 0 && idx > 0) {
      switchMobileNav(TAB_ORDER[idx - 1]); // glissement vers la droite -> onglet précédent
      if (navigator.vibrate) navigator.vibrate(15);
      hapticPulse(document.getElementById('mobile-nav'), 'light');
    }
  }, { passive: true });
})();

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

document.getElementById('settings-save').addEventListener('click', () => {
  let rawName = document.getElementById('setting-app-name').value.trim();
  if(!rawName) rawName = "Ludex Rating Companion";
  const firstWord = rawName.split(' ')[0];
  const formattedName = rawName.replace(firstWord, `<em>${firstWord}</em>`);
  
  const newSettings = {
    appName: formattedName,
    theme: (document.querySelector('.theme-card.selected')||{dataset:{theme:'default'}}).dataset.theme
  };
  
  localStorage.setItem('lbx_settings', JSON.stringify(newSettings));
  applySettings(newSettings);
  renderAll();
  document.getElementById('settings-modal').classList.remove('open');
  document.getElementById('settings-btn').focus();
});

loadSettings();

// ═══════════════════════════════════════════
//  GESTION DE LA DATE LOCALE
// ═══════════════════════════════════════════
function setTodayDate() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(today - offset)).toISOString().slice(0, -1);
  document.getElementById('view-date').value = localISOTime.split('T')[0];
}

// ═══════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════
const STORE_KEY = "lbx_v2";
const CRITERIA = ['scenario','realisation','photo','acteurs','ambiance','rythme','affect'];


// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function buildStripMeta({ genre = '', runtime = '', year = '', director = '', actors = '' } = {}) {
  let meta = [genre, runtime, year].filter(Boolean).join(' · ');
  if (director) meta += `<br><span style="color:var(--text-mid);font-size:0.75rem;font-family:var(--font-body)">Réalisé par <b>${director}</b></span>`;
  if (actors)   meta += `<br><span style="color:var(--text-mid);font-size:0.75rem;font-family:var(--font-body)">Avec <b>${actors}</b></span>`;
  return meta;
}

// Échappe une chaîne pour une insertion sûre dans un attribut HTML (alt, aria-label, title...)
// Utilisé pour les titres de films (qui peuvent contenir des guillemets ou des chevrons).
function escAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let isLiked     = false;
let currentMode = 'detail'; 
let quickRating = 2.5;      
let sortOrder   = 'date';
let activeGenre = null; 
let weightsOpen = false;
let pendingAction = null; 
let activeContextTags = new Set(); 
let historySearchQuery = ''; 
let isFetchingMovie = false; 
let activeScoreFilter = null; 

// ═══════════════════════════════════════════
//  STORAGE & DRAFT
// ═══════════════════════════════════════════
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}
function saveHistory(history) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(history));
    if (window.storage) window.storage.set(STORE_KEY, JSON.stringify(history));
  } catch(e) { console.warn('Storage full', e); }
}

function saveDraft() {
  if (isFetchingMovie) return;
  const draft = {
    title: document.getElementById('movie-title').value,
    year: document.getElementById('movie-year').value,
    poster: document.getElementById('movie-poster').value,
    genre: document.getElementById('movie-genre').value,
    runtime: document.getElementById('movie-runtime').value,
    director: document.getElementById('movie-director').value,
    actors: document.getElementById('movie-actors').value,
    tmdbScore: document.getElementById('movie-tmdb-score').value,
    tmdbId: document.getElementById('movie-tmdb-id').value,
    searchValue: document.getElementById('movie-search').value,
    date: document.getElementById('view-date').value,
    liked: isLiked,
    mode: currentMode,
    quickRating: quickRating,
    values: CRITERIA.reduce((acc, c) => { acc[c] = document.getElementById(c).value; return acc; }, {}),
    review: document.getElementById('review-text').value,
    tags: Array.from(activeContextTags)
  };
  localStorage.setItem('lbx_draft', JSON.stringify(draft));
}

function loadDraft() {
  try {
    const draftStr = localStorage.getItem('lbx_draft');
    if (!draftStr) {
      setTodayDate();
      return;
    }
    const draft = JSON.parse(draftStr);
    
    if (draft.title) {
      document.getElementById('movie-title').value = draft.title;
      document.getElementById('movie-year').value = draft.year || '';
      document.getElementById('movie-poster').value = draft.poster || '';
      document.getElementById('movie-genre').value = draft.genre || '';
      document.getElementById('movie-runtime').value = draft.runtime || '';
      document.getElementById('movie-director').value = draft.director || '';
      document.getElementById('movie-actors').value = draft.actors || '';
      document.getElementById('movie-tmdb-score').value = draft.tmdbScore || '';
      document.getElementById('movie-tmdb-id').value = draft.tmdbId || '';
      document.getElementById('movie-search').value = draft.searchValue || '';
      
      const strip = document.getElementById('film-strip');
      strip.classList.add('visible');
      document.getElementById('strip-title').textContent = draft.title;
      document.getElementById('strip-genre').innerHTML = buildStripMeta({
        genre: draft.genre, runtime: draft.runtime, year: draft.year,
        director: draft.director, actors: draft.actors
      });
      if (draft.poster) {
        document.getElementById('strip-poster').src = draft.poster;
        document.getElementById('strip-poster').alt = draft.title ? `Affiche de ${draft.title}` : '';
        document.getElementById('strip-poster').style.display = 'block';
      }
      if (draft.tmdbScore) {
        document.getElementById('strip-tmdb-score').textContent = draft.tmdbScore + '/10';
        document.getElementById('strip-ratings').style.display = 'flex';
      }
    }

    if (draft.date) {
      document.getElementById('view-date').value = draft.date;
    } else {
      setTodayDate();
    }

    if (draft.review) document.getElementById('review-text').value = draft.review;
    
    isLiked = draft.liked || false;
    document.getElementById('heart-btn').classList.toggle('active', isLiked);
  document.getElementById('heart-btn').setAttribute('aria-pressed', String(isLiked));

    activeContextTags = new Set(draft.tags || []);
    document.querySelectorAll('.ctx-tag').forEach(b => {
      if (activeContextTags.has(b.dataset.tag)) b.classList.add('active');
      else b.classList.remove('active');
    });

    if (draft.mode) setMode(draft.mode);
    if (draft.quickRating) {
      quickRating = parseFloat(draft.quickRating);
      const radioId = 's' + (quickRating * 2);
      const radioEl = document.getElementById(radioId);
      if(radioEl) radioEl.checked = true;
    }
    if (draft.values) {
      CRITERIA.forEach(c => {
        if (draft.values[c]) document.getElementById(c).value = draft.values[c];
      });
    }
    calculateScore();
    updateAllSliders();
    renderCriteriaAverageMarkers();

  } catch(e) { console.error("Erreur de chargement du brouillon", e); }
}

// ═══════════════════════════════════════════
//  RETOUR VISUEL "PSEUDO-HAPTIQUE"
// ═══════════════════════════════════════════
// Safari iOS n'implémente l'API Vibration sur AUCUNE version (choix
// délibéré d'Apple, pas un bug) — `navigator.vibrate` y est simplement
// absent, donc tous les `if (navigator.vibrate) navigator.vibrate(...)` de
// l'app s'y taisent silencieusement, sans erreur mais aussi sans aucun
// retour. Cette fonction ajoute un petit à-coup visuel (léger/moyen/fort)
// sur l'élément concerné, en complément de chaque appel à vibrate() — pour
// que la sensation de "clic" reste présente même sans vraie vibration.
function hapticPulse(el, intensity = 'light') {
  if (!el) return;
  const cls = `haptic-pulse-${intensity}`;
  el.classList.remove('haptic-pulse-light', 'haptic-pulse-medium', 'haptic-pulse-strong');
  // requestAnimationFrame (plutôt qu'une lecture forcée de offsetWidth) pour
  // rejouer l'animation : évite un reflow SYNCHRONE à chaque appel. Sur cette
  // fonction en particulier, c'est important — elle est appelée à CHAQUE
  // glissement de slider (potentiellement des dizaines de fois par seconde
  // pendant un geste), et un reflow forcé à cette fréquence-là créait du
  // saccadé pendant l'interaction la plus courante de l'app.
  requestAnimationFrame(() => {
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  });
}

renderAll();
loadDraft();

// ═══════════════════════════════════════════
//  LOGIQUE PURE (testable) : calcul du score & fusion cloud
// ═══════════════════════════════════════════
//
// Ce fichier ne touche JAMAIS au DOM ni à localStorage : chaque fonction ici
// prend des données en entrée et renvoie un résultat, sans effet de bord.
// C'est délibéré : c'est ce qui permet de les tester automatiquement avec
// Node (voir tests/) sans avoir besoin d'un navigateur.
//
// Les fichiers qui ont besoin d'effets de bord (lire un slider, écrire dans le
// DOM, lire/écrire localStorage...) restent des fines couches au-dessus de ces
// fonctions — voir calculateScore() dans 05-rating-form.js et mergeWithRemote()
// dans 10-cloud-sync.js.
//
// Le bloc tout en bas (`if (typeof module !== 'undefined')...`) permet à ce
// même fichier de fonctionner à la fois :
//  - dans le navigateur : concaténé tel quel dans app.js, les fonctions
//    deviennent de simples fonctions globales (comme avant l'extraction) ;
//  - dans Node (tests) : `require()` direct, sans DOM.

const TOMBSTONE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours

// ─── Score ────────────────────────────────────────────────────────────────

// Mode rapide : note en étoiles (0.5 à 5, pas de 0.5) -> score sur 10.
function computeQuickScore(quickRatingStars) {
  return quickRatingStars * 2;
}

// Mode détaillé : moyenne pondérée des 6 critères (scenario, realisation,
// photo, acteurs, ambiance, affect), chacun noté de 0 à 10.
// `criteriaValues` : { scenario: 7.5, realisation: 8, ... }
// `weights`        : { scenario: 1, realisation: 1.5, ... }
function computeWeightedScore(criteriaValues, weights) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const key of Object.keys(criteriaValues)) {
    const val = criteriaValues[key];
    const wt = weights[key] ?? 1;
    weightedSum += val * wt;
    totalWeight += wt;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 5;
}

// Convertit un score sur 10 en équivalent "étoiles" (pas de 0.5), pour l'affichage.
function scoreToStars(score) {
  return Math.round((score / 2) * 2) / 2;
}

// Formatte un nombre d'étoiles en chaîne ★★★½
function getStarStr(stars) {
  let s = '';
  const full = Math.floor(stars);
  const half = (stars % 1) !== 0;
  for (let i = 0; i < full; i++) s += '★';
  if (half) s += '½';
  return s || '½';
}

// ─── Fusion cloud : clés d'identité ─────────────────────────────────────────

function historyItemKey(item) {
  return (item.title || '').toLowerCase();
}

function watchlistItemKey(item) {
  return item.tmdbId ? `id:${item.tmdbId}` : `title:${(item.title || '').toLowerCase()}`;
}

// ─── Fusion cloud : tombstones (traces de suppression) ──────────────────────

// Fusionne deux listes de tombstones : garde la date de suppression la plus
// récente par clé, et purge celles plus vieilles que TOMBSTONE_MAX_AGE_MS
// (pas la peine de trainer une trace de suppression indéfiniment).
function mergeTombstoneLists(a, b) {
  const map = new Map();
  for (const t of [...a, ...b]) {
    const existing = map.get(t.key);
    if (!existing || new Date(t.deletedAt) > new Date(existing.deletedAt)) map.set(t.key, t);
  }
  const cutoff = Date.now() - TOMBSTONE_MAX_AGE_MS;
  return [...map.values()].filter(t => new Date(t.deletedAt).getTime() > cutoff);
}

// ─── Fusion cloud : historique ───────────────────────────────────────────────

function mergeHistory(local, remote, tombstones) {
  const merged = new Map(); // key -> entry
  for (const entry of [...local, ...remote]) {
    const key = historyItemKey(entry);
    if (!key) continue;
    const existing = merged.get(key);
    const entryTime = new Date(entry.updatedAt || entry.savedAt || 0).getTime();
    if (!existing) {
      merged.set(key, entry);
    } else {
      const existingTime = new Date(existing.updatedAt || existing.savedAt || 0).getTime();
      if (entryTime >= existingTime) merged.set(key, entry);
    }
  }

  const result = [];
  for (const [key, entry] of merged) {
    const tomb = tombstones.find(t => t.key === key);
    if (tomb) {
      const entryTime = new Date(entry.updatedAt || entry.savedAt || 0).getTime();
      if (new Date(tomb.deletedAt).getTime() >= entryTime) continue; // supprimé plus récemment que la dernière modif
    }
    result.push(entry);
  }
  result.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  return result;
}

// ─── Fusion cloud : watchlist ────────────────────────────────────────────────

function mergeWatchlist(local, remote, tombstones) {
  const merged = new Map();
  for (const item of [...local, ...remote]) {
    const key = watchlistItemKey(item);
    if (!merged.has(key)) merged.set(key, item);
  }

  const result = [];
  for (const [key, item] of merged) {
    const tomb = tombstones.find(t => t.key === key);
    if (tomb) {
      const itemTime = new Date(item.addedAt || 0).getTime();
      if (new Date(tomb.deletedAt).getTime() >= itemTime) continue;
    }
    result.push(item);
  }
  result.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
  return result;
}

// ─── Descriptions qualitatives par critère (paliers + qualificatif fin) ────

const DESCS = {
  scenario: [
    [9.5,"Un chef-d'œuvre narratif absolu. Écriture brillante, dialogues ciselés, structure parfaite et thèmes d'une profondeur rare qui hantent longtemps après le visionnage."],
    [8.5,"Scénario magistral. Une construction d'une intelligence rare, des personnages d'une richesse peu commune, presque aucune fausse note."],
    [7.5,"Excellent scénario. Récit captivant, personnages bien écrits et rebondissements intelligents qui maintiennent un fort engagement."],
    [6.5,"Bonne écriture, quelques idées qui sortent du lot, mais sans jamais atteindre une vraie fulgurance."],
    [5.5,"Une histoire classique et fonctionnelle. Fait le travail correctement, mais suit des sentiers battus ou manque d'une vraie prise de risque."],
    [4.5,"Des maladresses évidentes. Rythme narratif inconstant, facilités scénaristiques ou dialogues un peu artificiels qui sortent du récit."],
    [3.5,"Scénario poussif. Les ficelles se voient, certains personnages sonnent creux, l'ensemble peine à convaincre."],
    [2.5,"Récit laborieux. De graves incohérences, des intrigues secondaires inutiles ou des personnages aux réactions incompréhensibles."],
    [1.5,"Écriture quasi inexistante. Le fil narratif se perd, les enjeux ne tiennent debout à aucun moment."],
    [0,  "Un naufrage scénaristique total. Dénué de sens, ennuyeux à mourir ou insultant pour l'intelligence du spectateur."]
  ],
  realisation: [
    [9.5,"Une masterclass de mise en scène. Une vision d'auteur absolue où chaque plan respire l'intelligence, la maîtrise et l'audace visuelle."],
    [8.5,"Réalisation éblouissante. Un vrai geste de cinéma, ambitieux et maîtrisé de bout en bout."],
    [7.5,"Réalisation forte et inspirée. Le réalisateur a un vrai point de vue, avec une caméra dynamique qui sublime le propos du film."],
    [6.5,"Mise en scène assurée, quelques idées visuelles marquantes, sans toutefois transcender le sujet."],
    [5.5,"Mise en scène artisanale et propre. Efficace, lisible, mais qui s'efface souvent derrière son sujet sans fulgurance visuelle."],
    [4.5,"Une réalisation impersonnelle. Ressemble plus à un produit de commande ou à un téléfilm manquant cruellement de caractère."],
    [3.5,"Mise en scène poussive, découpage parfois maladroit, peu d'idées de mise en image."],
    [2.5,"Mise en scène paresseuse ou confuse. Découpage hasardeux, absence de rythme visuel ou tics qui fatiguent l'œil."],
    [1.5,"Réalisation à peine fonctionnelle. Cadres bancals, mise en scène qui dessert constamment le récit."],
    [0,  "Catastrophique. Incompétence technique crasse, montage épileptique ou plans littéralement illisibles."]
  ],
  photo: [
    [9.5,"Une claque visuelle absolue. Chaque plan est un tableau. Gestion de la lumière, colorimétrie et cadrages atteignent le sublime."],
    [8.5,"Photographie somptueuse, une signature visuelle forte et cohérente du début à la fin."],
    [7.5,"Superbe photographie. Une identité visuelle très marquée qui participe activement à l'ambiance et flatte constamment la rétine."],
    [6.5,"Belle image, quelques plans qui sortent du lot, sans être une œuvre visuellement unique."],
    [5.5,"Esthétique soignée mais standardisée. L'image est belle et propre, mais reste académique ou familière."],
    [4.5,"Visuellement terne ou inégal. Éclairages plats, étalonnage douteux (trop gris/sombre) ou effets spéciaux qui jurent."],
    [3.5,"Image assez pauvre, cadrages sans inspiration, colorimétrie qui manque de cohérence."],
    [2.5,"Laideur visuelle manifeste. Cadrages ratés, image numérique sans texture, ou filtres appliqués sans aucune cohérence artistique."],
    [1.5,"Image quasiment illisible ou dénuée de tout soin, très en dessous des standards attendus."],
    [0,  "Une agression oculaire. Illisible, bouillie de pixels ou éclairage d'une pauvreté affligeante."]
  ],
  acteurs: [
    [9.5,"Des performances magistrales et habitées. Des acteurs en état de grâce qui transcendent leurs personnages et crèvent l'écran."],
    [8.5,"Casting exceptionnel, des interprétations d'une justesse rare qui portent le film à elles seules."],
    [7.5,"Un casting redoutable. Des interprétations justes, intenses et nuancées qui portent le film avec un grand charisme."],
    [6.5,"Bonnes performances dans l'ensemble, une ou deux têtes d'affiche particulièrement convaincantes."],
    [5.5,"Jeu solide et convaincant. Les acteurs font le job honnêtement, sans pour autant livrer la performance de leur carrière."],
    [4.5,"Interprétations inégales. Certains tirent leur épingle du jeu, mais d'autres surjouent ou manquent cruellement d'alchimie."],
    [3.5,"Jeu d'acteur assez faible dans l'ensemble, direction d'acteurs peu convaincante."],
    [2.5,"Casting en roue libre. Mauvaise direction d'acteurs, expressions forcées, ou têtes d'affiche visiblement venues pour le chèque."],
    [1.5,"Interprétations quasi risibles, aucune alchimie ni conviction à l'écran."],
    [0,  "Un festival de jeu monolithique ou d'hystérie ridicule. Impossible de croire une seule seconde aux personnages."]
  ],
  ambiance: [
    [9.5,"Une immersion sensorielle totale. Bande originale mythique et sound design viscéral qui prennent littéralement aux tripes."],
    [8.5,"Atmosphère sonore exceptionnelle, musique et sound design qui deviennent indissociables du film."],
    [7.5,"Excellente atmosphère. La musique et les effets sonores enveloppent le spectateur et renforcent magistralement l'impact émotionnel."],
    [6.5,"Bon accompagnement sonore, quelques thèmes marquants, sans devenir mémorable dans son ensemble."],
    [5.5,"Ambiance réussie. Accompagnement sonore fonctionnel et agréable, qui soutient l'action sans pour autant marquer les esprits."],
    [4.5,"Sonorité générique. Musique d'ascenseur, thèmes oubliables ou mixage sonore parfois douteux en retrait."],
    [3.5,"Ambiance sonore faible, musique qui peine à installer une atmosphère cohérente."],
    [2.5,"Bande-son envahissante ou hors sujet. Musique omniprésente qui dicte les émotions, ou sound design artificiel qui brise l'immersion."],
    [1.5,"Son quasiment raté, mixage désagréable, aucune identité sonore."],
    [0,  "Supplice auditif. Bruitages ratés, doublages asynchrones, ou bande originale qui ruine littéralement les scènes clés."]
  ],
  rythme: [
    [9.5,"Un rythme d'une précision chirurgicale. Chaque scène a exactement la durée qu'il faut, montage d'orfèvre, pas une seconde de trop ni de manque."],
    [8.5,"Montage excellent, un tempo qui épouse parfaitement les intentions du film du début à la fin."],
    [7.5,"Très bon rythme. Le film se regarde sans effort, les transitions sont fluides et le montage sert bien le récit."],
    [6.5,"Rythme globalement maîtrisé, quelques longueurs ponctuelles qui n'entament pas trop l'ensemble."],
    [5.5,"Rythme correct mais irrégulier. Certains passages traînent un peu, d'autres filent trop vite, sans que ça gâche l'expérience."],
    [4.5,"Rythme mal calibré. Des longueurs qui se sentent, un montage qui casse parfois l'élan du film."],
    [3.5,"Film qui traîne clairement en longueur ou au contraire semble haché, avec des ruptures de rythme gênantes."],
    [2.5,"Rythme poussif ou décousu sur une bonne partie du film, l'attention décroche régulièrement."],
    [1.5,"Montage confus, tempo constamment à côté de la plaque, on regarde sa montre."],
    [0,  "Rythme complètement raté. Interminable, ou monté de façon si chaotique que le film en devient illisible."]
  ],
  affect: [
    [9.5,"Coup de foudre absolu. Un film qui bouleverse, obsède, et trouve une place immédiate dans mon panthéon personnel."],
    [8.5,"Immense claque émotionnelle. Un film qui restera gravé longtemps, que je recommande sans réserve."],
    [7.5,"Énorme coup de cœur. Une œuvre marquante qui m'a fait vibrer, rire ou pleurer, et que je reverrai avec grand plaisir."],
    [6.5,"Beau moment, quelques scènes qui marquent vraiment, une expérience que j'ai appréciée sincèrement."],
    [5.5,"Un très bon moment de cinéma. J'ai pris du plaisir devant ce film, même s'il ne me laissera pas un souvenir impérissable."],
    [4.5,"Sentiment mitigé. Pas désagréable, mais je reste totalement sur ma faim. Vite vu, assez vite oublié."],
    [3.5,"Peu d'accroche émotionnelle, le film m'a globalement laissé de marbre."],
    [2.5,"Ennui ou agacement profond. Une expérience pénible, où le temps a semblé particulièrement long. Très peu d'accroche."],
    [1.5,"Rejet quasi total, très peu de moments qui ont suscité un intérêt réel."],
    [0,  "Rejet viscéral. Une perte de temps absolue, un film que j'ai détesté de bout en bout et que je veux effacer de ma mémoire."]
  ]
};

const _descCache = {};
function getDesc(criterion, val) {
  const key = criterion + val;
  if (_descCache[key]) return _descCache[key];
  const tiers = DESCS[criterion];

  for (let i = 0; i < tiers.length; i++) {
    const [thresh, text] = tiers[i];
    if (val < thresh) continue;

    // Chaque palier couvre en général 2 valeurs voisines (ex: 8.5 et 9.0 pour
    // le seuil 8.5), sauf le dernier qui en couvre 3 (0, 0.5, 1.0). On ajoute
    // un court qualificatif selon la position exacte dans cette fourchette,
    // pour un retour plus fin que le seul texte du palier (qui, lui, ne
    // change qu'environ tous les 1 point) — sans avoir à réécrire 147 textes
    // différents pour un gain de nuance souvent minime entre deux valeurs
    // voisines.
    const nextThresh = i > 0 ? tiers[i - 1][0] : thresh + 1; // borne haute (exclue) du palier actuel
    const rangeSpan = nextThresh - thresh;
    const posInRange = val - thresh;

    let qualifier = '';
    if (rangeSpan > 0.5) {
      if (Math.abs(posInRange) < 0.01) {
        qualifier = ' (plutôt bas dans cette tranche)';
      } else if (Math.abs(posInRange - (rangeSpan - 0.5)) < 0.01) {
        qualifier = ' (plutôt haut dans cette tranche)';
      }
      // Valeur médiane (uniquement pour le dernier palier, qui couvre 3
      // valeurs) : pas de qualificatif, elle est déjà bien au centre.
    }

    const result = text + qualifier;
    _descCache[key] = result;
    return result;
  }

  const fallback = tiers[tiers.length - 1][1];
  _descCache[key] = fallback;
  return fallback;
}

// ─── Moyennes personnelles par critère (repère sur les sliders + radar) ─────
// Retourne { scenario: 7.2, realisation: null, ... } — null si aucune entrée
// de l'historique n'a de valeur pour ce critère (ex: 'rythme' avant son ajout).
function computeCriteriaAverages(history, criteria) {
  const sums = {};
  const counts = {};
  criteria.forEach(c => { sums[c] = 0; counts[c] = 0; });

  history.forEach(h => {
    if (h.mode === 'detail' && h.values) {
      criteria.forEach(c => {
        const val = parseFloat(h.values[c]);
        if (!isNaN(val)) { sums[c] += val; counts[c]++; }
      });
    }
  });

  const avgs = {};
  criteria.forEach(c => { avgs[c] = counts[c] > 0 ? sums[c] / counts[c] : null; });
  return avgs;
}

// ─── Onglet Profil : temps visionné, série en cours, badges ────────────────
function formatWatchTime(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '—';
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days} j`);
  if (hours > 0 || days === 0) parts.push(`${hours} h`);
  return parts.join(' ');
}

// Clé "année-semaine ISO" pour une date donnée — deux dates de la même semaine
// ISO (lundi à dimanche) produisent la même clé, peu importe le jour exact.
function getISOWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

// Nombre de semaines ISO consécutives (en remontant depuis AUJOURD'HUI) avec
// au moins un film noté — 0 si la semaine en cours n'a rien.
function computeWeekStreak(history, referenceDate = new Date()) {
  const weeksWithActivity = new Set();
  history.forEach(h => {
    const raw = h.savedAt || h.date;
    if (!raw) return;
    const d = new Date(raw);
    if (isNaN(d)) return;
    weeksWithActivity.add(getISOWeekKey(d));
  });

  let streak = 0;
  const cursor = new Date(referenceDate);
  while (weeksWithActivity.has(getISOWeekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

// Badges débloqués selon l'historique — chaque entrée est indépendante,
// aucune ne dépend d'un ordre de déblocage particulier.
function computeBadges(history, extras = {}) {
  // Déclaré ICI (local, pas en haut du fichier) : même bug que
  // CRITERIA_SHORT_LABELS et CONTEXT_TAG_ICONS rencontré précédemment — un
  // `const` top-level serait dans sa "zone morte temporelle" tant que
  // l'exécution n'a pas atteint cette ligne, or `renderAll()` est appelée de
  // façon précoce (03-foundation.js) avant même que 03b-pure-logic.js n'ait
  // fini de s'exécuter.
  const GENRE_BADGE_THRESHOLD = 5;
  const totalMinutes = extras.totalMinutes || 0;
  const streak = extras.streak || 0;
  const genreSet = new Set();
  const genreCounts = {};
  history.forEach(h => {
    if (h.genre) h.genre.split(',').forEach(g => {
      const t = g.trim(); if (!t) return;
      genreSet.add(t);
      genreCounts[t] = (genreCounts[t] || 0) + 1;
    });
  });
  const reviewCount = history.filter(h => h.review && h.review.trim().length > 0).length;

  const defs = [
    { id: 'films_10',  label: '10 films notés',        unlocked: history.length >= 10 },
    { id: 'films_50',  label: '50 films notés',         unlocked: history.length >= 50 },
    { id: 'films_100', label: '100 films notés',        unlocked: history.length >= 100 },
    { id: 'genres_5',  label: '5 genres différents',    unlocked: genreSet.size >= 5 },
    { id: 'genres_10', label: '10 genres différents',   unlocked: genreSet.size >= 10 },
    { id: 'reviews_10',label: '10 critiques écrites',   unlocked: reviewCount >= 10 },
    { id: 'streak_4',  label: '4 semaines de suite',    unlocked: streak >= 4 },
    { id: 'marathon',  label: 'Marathon (24h de films)',unlocked: totalMinutes >= 24 * 60 },
    { id: 'cinephile', label: 'Cinéphile (7j de films)',unlocked: totalMinutes >= 7 * 24 * 60 },
  ];

  // Un badge par genre RÉELLEMENT exploré (au moins un film), pas une liste
  // figée de tous les genres TMDb possibles — évite d'afficher des dizaines
  // de badges verrouillés pour des genres jamais regardés. Triés du plus au
  // moins regardé, pour mettre en avant ce qui définit vraiment les goûts de
  // l'utilisateur.
  const genreBadges = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // les 8 genres les plus regardés seulement, pour ne pas surcharger la grille
    .map(([genre, count]) => ({
      id: 'genre_' + genre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_'),
      label: `Fan de ${genre} (${Math.min(count, GENRE_BADGE_THRESHOLD)}/${GENRE_BADGE_THRESHOLD})`,
      unlocked: count >= GENRE_BADGE_THRESHOLD,
    }));

  return defs.concat(genreBadges);
}

// ─── Compatibilité Node (tests) sans rien changer au comportement navigateur ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeQuickScore,
    computeWeightedScore,
    scoreToStars,
    getStarStr,
    historyItemKey,
    watchlistItemKey,
    mergeTombstoneLists,
    mergeHistory,
    mergeWatchlist,
    TOMBSTONE_MAX_AGE_MS,
    getDesc,
    DESCS,
    computeCriteriaAverages,
    formatWatchTime,
    getISOWeekKey,
    computeWeekStreak,
    computeBadges,
  };
}

// ═══════════════════════════════════════════
//  CONTEXT TAGS
// ═══════════════════════════════════════════
document.querySelectorAll('.ctx-tag').forEach(btn => {
  btn.addEventListener('click', () => {
    const tag = btn.dataset.tag;
    if (activeContextTags.has(tag)) {
      activeContextTags.delete(tag);
      btn.classList.remove('active');
    } else {
      activeContextTags.add(tag);
      btn.classList.add('active');
    }
    saveDraft();
  });
});

// ═══════════════════════════════════════════
//  TMDb SEARCH & VISUAL FEEDBACK
// ═══════════════════════════════════════════
const searchEl  = document.getElementById('movie-search');
const suggestEl = document.getElementById('suggestions');
const searchStatus = document.getElementById('search-status');
let searchTimer;

searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchEl.value.trim();
  saveDraft();
  if (q.length < 2) { 
    suggestEl.style.display = 'none'; 
    searchStatus.style.display = 'none';
    return; 
  }
  
  searchStatus.style.display = 'none';
  suggestEl.style.display = 'block';
  suggestEl.innerHTML = `
    <div class="skeleton-item"><div class="skeleton-poster skeleton-bg"></div><div style="flex:1"><div class="skeleton-text long skeleton-bg"></div><div class="skeleton-text short skeleton-bg"></div></div></div>
    <div class="skeleton-item"><div class="skeleton-poster skeleton-bg"></div><div style="flex:1"><div class="skeleton-text long skeleton-bg"></div><div class="skeleton-text short skeleton-bg"></div></div></div>
    <div class="skeleton-item"><div class="skeleton-poster skeleton-bg"></div><div style="flex:1"><div class="skeleton-text long skeleton-bg"></div><div class="skeleton-text short skeleton-bg"></div></div></div>
  `;
  
  searchTimer = setTimeout(() => fetchSuggestions(q), 280);
});

searchEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const q = searchEl.value.trim();
    if (!q) return;
    suggestEl.style.display = 'none';
    searchStatus.style.display = 'none';
    clearTimeout(searchTimer);
    selectManual(q);
  }
});

function selectManual(title) {
  document.getElementById('movie-title').value  = title;
  document.getElementById('movie-year').value   = '';
  document.getElementById('movie-poster').value = '';
  document.getElementById('movie-genre').value  = '';
  document.getElementById('movie-runtime').value = '';
  document.getElementById('movie-director').value = '';
  document.getElementById('movie-actors').value  = '';
  document.getElementById('movie-tmdb-score').value = '';
  document.getElementById('movie-tmdb-id').value = '';
  document.getElementById('strip-ratings').style.display = 'none';

  const strip = document.getElementById('film-strip');
  strip.classList.add('visible');
  document.getElementById('strip-title').textContent = title;
  document.getElementById('strip-genre').innerHTML = '<span style="color:var(--text);font-size:0.75rem;">Film ajouté manuellement</span>';
  document.getElementById('strip-poster').style.display = 'none';
  saveDraft();
}

async function fetchSuggestions(q) {
  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(q)}`);
    const data = await res.json();
    searchStatus.style.display = 'none';
    if (!data.results?.length) { suggestEl.style.display = 'none'; return; }
    suggestEl.innerHTML = '';
    suggestEl.style.display = 'block';
    data.results.slice(0, 6).forEach(m => {
      const year = m.release_date?.slice(0, 4) || '????';
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      const imgHtml = m.poster_path
        ? `<img class="suggestion-poster" src="https://image.tmdb.org/t/p/w92${m.poster_path}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">`
        : `<div class="suggestion-poster-placeholder">${ICONS.clapper}</div>`;
      item.innerHTML = `${imgHtml}<div class="suggestion-info"><div class="suggestion-title">${m.title}</div><div class="suggestion-year">${year}</div></div>`;
      item.addEventListener('click', () => selectMovie(m, year));
      suggestEl.appendChild(item);
    });
    const manualItem = document.createElement('div');
    manualItem.className = 'suggestion-item suggestion-manual';
    manualItem.innerHTML = `<div class="suggestion-poster-placeholder" style="font-size:1rem;">${ICONS.edit}</div><div class="suggestion-info"><div class="suggestion-title" style="color:var(--text-mid);">Utiliser "${q}" sans TMDb</div><div class="suggestion-year">Saisie manuelle</div></div>`;
    manualItem.addEventListener('click', () => { suggestEl.style.display = 'none'; selectManual(q); });
    suggestEl.appendChild(manualItem);
  } catch { 
    searchStatus.style.display = 'none'; 
    suggestEl.style.display = 'none'; 
    showToast('Recherche indisponible, vérifie ta connexion.');
  }
}

async function selectMovie(m, year) {
  document.getElementById('movie-title').value  = m.title;
  document.getElementById('movie-year').value   = year;
  document.getElementById('movie-poster').value = m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : '';
  document.getElementById('movie-tmdb-id').value = m.id;
  searchEl.value = `${m.title} (${year})`;
  suggestEl.style.display = 'none';
  document.getElementById('strip-ratings').style.display = 'none';

  searchStatus.style.display = 'block';
  searchStatus.textContent = '⏳ Récupération des détails...';
  isFetchingMovie = true;

  try {
    const res = await fetch(`/api/search?id=${m.id}`);
    const data = await res.json();

    const genreNames = data.genres?.map(g => g.name) || [];
    const genres = genreNames.join(', ');
    const runtime = data.runtime ? `${data.runtime} min` : '';
    
    let director = '';
    let actors = ''; 
    
    if (data.credits && data.credits.crew) {
      const dirObj = data.credits.crew.find(c => c.job === 'Director');
      if (dirObj) director = dirObj.name;
      if (data.credits.cast && data.credits.cast.length > 0) {
        actors = data.credits.cast.slice(0, 3).map(a => a.name).join(', ');
      }
    } else if (data.director) {
      director = data.director;
    }

    document.getElementById('movie-genre').value = genres;
    document.getElementById('movie-runtime').value = runtime;
    document.getElementById('movie-director').value = director;
    document.getElementById('movie-actors').value = actors; 

    suggestGenreWeights(genreNames);

    document.getElementById('strip-genre').innerHTML = buildStripMeta({
      genre: genres, runtime, year, director, actors
    });

    const score = data.vote_average;
    const count = data.vote_count;
    if (score && score > 0) {
      document.getElementById('movie-tmdb-score').value = score.toFixed(1);
      document.getElementById('strip-tmdb-score').textContent = score.toFixed(1) + '/10';
      document.getElementById('strip-votes').textContent = count ? `${count.toLocaleString('fr-FR')} votes` : '';
      document.getElementById('strip-ratings').style.display = 'flex';
    }
  } catch (err) {
    document.getElementById('strip-genre').textContent = year || '';
    showToast('Détails du film indisponibles, réessaie plus tard.');
  } finally {
    searchStatus.style.display = 'none';
    isFetchingMovie = false;
  }

  const strip = document.getElementById('film-strip');
  strip.classList.add('visible');
  document.getElementById('strip-title').textContent = m.title;
  if (m.poster_path) {
    document.getElementById('strip-poster').src = `https://image.tmdb.org/t/p/w92${m.poster_path}`;
    document.getElementById('strip-poster').alt = `Affiche de ${m.title}`;
    document.getElementById('strip-poster').style.display = 'block';
  }
  
  saveDraft();
}

document.addEventListener('click', e => {
  if (e.target !== searchEl) suggestEl.style.display = 'none';
});

// ═══════════════════════════════════════════
//  HEART & DATES & REVIEW TEXT
// ═══════════════════════════════════════════
document.getElementById('heart-btn').addEventListener('click', () => {
  if (navigator.vibrate) navigator.vibrate(50);
  hapticPulse(document.getElementById('heart-btn'), 'medium');
  isLiked = !isLiked;
  document.getElementById('heart-btn').classList.toggle('active', isLiked);
  document.getElementById('heart-btn').setAttribute('aria-pressed', String(isLiked));
  saveDraft();
});

document.getElementById('view-date').addEventListener('change', saveDraft);
document.getElementById('review-text').addEventListener('input', saveDraft);

// ═══════════════════════════════════════════
//  MODE (Détaillé / Rapide)
// ═══════════════════════════════════════════
function setMode(mode) {
  currentMode = mode;
  document.body.classList.toggle('quick-mode', mode === 'quick');
  
  document.getElementById('tab-detail').classList.toggle('active', mode === 'detail');
  document.getElementById('tab-quick').classList.toggle('active', mode === 'quick');
  document.getElementById('mode-badge').textContent = mode === 'detail' ? 'Mode détaillé' : 'Mode rapide';
  
  calculateScore();
  saveDraft();
}

// ═══════════════════════════════════════════
//  QUICK STARS RATING
// ═══════════════════════════════════════════
document.getElementById('quick-stars-container').addEventListener('change', (e) => {
    quickRating = parseFloat(e.target.value);
    calculateScore();
    updateQuickLabel();
    saveDraft();
});

function updateQuickLabel() {
  const label = document.getElementById('quick-rating-label');
  if (!label) return;
  const score = quickRating * 2;
  const stars = getStarStr(Math.round((score / 2) * 2) / 2);
  label.innerHTML = `<span>${stars}</span> — ${score.toFixed(1)}/10`;
}

// ═══════════════════════════════════════════
//  WEIGHTS
// ═══════════════════════════════════════════
function toggleWeights() {
  weightsOpen = !weightsOpen;
  document.getElementById('weights-panel').classList.toggle('open', weightsOpen);
  document.getElementById('weights-toggle').style.color = weightsOpen ? 'var(--orange)' : '';
}

function getWeights() {
  const w = {};
  CRITERIA.forEach(c => {
    const v = parseFloat(document.getElementById(`w-${c}`).value);
    w[c] = isNaN(v) || v < 0 ? 0 : v;
  });
  return w;
}

function resetWeights() {
  CRITERIA.forEach(c => { document.getElementById(`w-${c}`).value = 1; });
  updateWeightBadges();
  calculateScore();
  document.getElementById('genre-weight-suggest').style.display = 'none';
}

function updateWeightBadges() {
  const w = getWeights();
  CRITERIA.forEach(c => {
    document.getElementById(`wb-${c}`).textContent = `×${w[c]}`;
  });
}

CRITERIA.forEach(c => {
  const el = document.getElementById(`w-${c}`);
  if (el) el.addEventListener('input', () => {
    updateWeightBadges();
    calculateScore();
    document.getElementById('genre-weight-suggest').style.display = 'none'; // l'utilisateur personnalise -> on n'insiste plus
  });
});

// ─── Pondérations suggérées selon le genre du film ──────────────────────────
// Certains critères comptent naturellement plus selon le genre (l'ambiance
// sonore pour un film d'horreur, le jeu d'acteur pour un drame...). On propose
// un préréglage adapté, sans jamais écraser silencieusement une personnalisation :
// - si les poids sont encore à leur valeur par défaut (×1 partout), on l'applique direct ;
// - sinon, on affiche juste un bouton pour l'appliquer à la demande.
const GENRE_WEIGHT_PRESETS = {
  'Horreur':         { scenario: 1,    realisation: 1,    photo: 1,    acteurs: 1,    ambiance: 2,    rythme: 1.5,  affect: 1 },
  'Musique':         { scenario: 1,    realisation: 1,    photo: 1,    acteurs: 1.25, ambiance: 2,    rythme: 1,    affect: 1 },
  'Romance':         { scenario: 1,    realisation: 1,    photo: 1,    acteurs: 1.5,  ambiance: 1,    rythme: 0.75, affect: 2 },
  'Documentaire':    { scenario: 1.5,  realisation: 1,    photo: 1,    acteurs: 0.5,  ambiance: 0.75, rythme: 1,    affect: 0.75 },
  'Animation':       { scenario: 1.25, realisation: 1.25, photo: 1.5,  acteurs: 0.75, ambiance: 1,    rythme: 1,    affect: 1 },
  'Science-Fiction': { scenario: 1.5,  realisation: 1.25, photo: 1.5,  acteurs: 1,    ambiance: 1,    rythme: 1,    affect: 1 },
  'Fantastique':     { scenario: 1.25, realisation: 1.25, photo: 1.5,  acteurs: 1,    ambiance: 1.25, rythme: 1,    affect: 1 },
  'Guerre':          { scenario: 1.25, realisation: 1.25, photo: 1,    acteurs: 1.25, ambiance: 1,    rythme: 1,    affect: 1.5 },
  'Thriller':        { scenario: 1.25, realisation: 1.25, photo: 1,    acteurs: 1,    ambiance: 1.25, rythme: 1.5,  affect: 1 },
  'Drame':           { scenario: 1.5,  realisation: 1,    photo: 1,    acteurs: 1.5,  ambiance: 1,    rythme: 1,    affect: 1.5 },
  'Comédie':         { scenario: 1.25, realisation: 1,    photo: 0.75, acteurs: 1.5,  ambiance: 1,    rythme: 1,    affect: 1.5 },
  'Action':          { scenario: 0.75, realisation: 1.25, photo: 1.5,  acteurs: 1,    ambiance: 1,    rythme: 1.5,  affect: 1 },
};
// Ordre de priorité si un film a plusieurs genres correspondants : les genres
// les plus "définissants" d'abord (un film peut être à la fois Action et
// Comédie, mais un genre comme Horreur ou Musique oriente plus fortement
// l'appréciation qu'Action, souvent secondaire).
const GENRE_PRIORITY = ['Horreur','Musique','Romance','Documentaire','Animation','Science-Fiction','Fantastique','Guerre','Thriller','Drame','Comédie','Action'];

let pendingGenrePreset = null; // { name, weights } en attente si l'utilisateur a déjà personnalisé

function weightsAreDefault() {
  return CRITERIA.every(c => parseFloat(document.getElementById(`w-${c}`).value) === 1);
}

function applyWeightPreset(weights) {
  CRITERIA.forEach(c => {
    const el = document.getElementById(`w-${c}`);
    if (el && weights[c] !== undefined) el.value = weights[c];
  });
  updateWeightBadges();
  calculateScore();
}

function pickGenrePreset(genreNames) {
  if (!genreNames || !genreNames.length) return null;
  for (const g of GENRE_PRIORITY) {
    if (genreNames.includes(g) && GENRE_WEIGHT_PRESETS[g]) {
      return { name: g, weights: GENRE_WEIGHT_PRESETS[g] };
    }
  }
  return null;
}

// Appelée après la sélection d'un film (une fois son genre connu depuis TMDb).
function suggestGenreWeights(genreNames) {
  const suggestBtn = document.getElementById('genre-weight-suggest');
  const match = pickGenrePreset(genreNames);
  if (!match) { suggestBtn.style.display = 'none'; pendingGenrePreset = null; return; }

  if (weightsAreDefault()) {
    applyWeightPreset(match.weights);
    showToast(`Pondérations ajustées pour le genre "${match.name}" 🎯`);
    suggestBtn.style.display = 'none';
    pendingGenrePreset = null;
  } else {
    // L'utilisateur a déjà personnalisé : on ne touche à rien, mais on propose.
    pendingGenrePreset = match;
    suggestBtn.textContent = `🎯 Suggestion "${match.name}"`;
    suggestBtn.style.display = 'inline-flex';
  }
}

document.getElementById('genre-weight-suggest').addEventListener('click', () => {
  if (!pendingGenrePreset) return;
  applyWeightPreset(pendingGenrePreset.weights);
  showToast(`Pondérations ajustées pour le genre "${pendingGenrePreset.name}" 🎯`);
  document.getElementById('genre-weight-suggest').style.display = 'none';
  pendingGenrePreset = null;
});

// ═══════════════════════════════════════════
//  SCORE CALCULATION
// ═══════════════════════════════════════════
// Le calcul du score lui-même (computeQuickScore / computeWeightedScore /
// scoreToStars / getStarStr) vit dans 03b-pure-logic.js, pour pouvoir être
// testé automatiquement sans DOM. Cette fonction-ci reste la fine couche qui
// lit les sliders et écrit le résultat à l'écran.
// Anime le score vers sa nouvelle valeur à chaque ajustement, plutôt qu'un
// changement de chiffre instantané. Contrairement à animateCountUp() (utilisée
// une fois par affichage pour les KPI du dashboard), celle-ci part de la
// valeur ACTUELLEMENT affichée (pas de 0) et s'annule/relance proprement si
// une nouvelle valeur arrive avant la fin — indispensable ici car un
// glissement de slider déclenche beaucoup de mises à jour rapprochées.
function animateValueTowards(el, endValue, decimals = 1, duration = 200) {
  const startValue = parseFloat(el.textContent) || 0;
  if (Math.abs(endValue - startValue) < 0.01) {
    el.textContent = endValue.toFixed(decimals);
    return;
  }
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    el.textContent = endValue.toFixed(decimals);
    return;
  }
  if (el._scoreAnimId) cancelAnimationFrame(el._scoreAnimId);
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 2); // ease-out quad : plus vif que l'ease-out cubic des KPI
    el.textContent = (startValue + (endValue - startValue) * eased).toFixed(decimals);
    if (progress < 1) {
      el._scoreAnimId = requestAnimationFrame(step);
    } else {
      el.textContent = endValue.toFixed(decimals);
      el._scoreAnimId = null;
    }
  }
  el._scoreAnimId = requestAnimationFrame(step);
}

function calculateScore() {
  let score;

  if (currentMode === 'quick') {
    score = computeQuickScore(quickRating);
  } else {
    const w = getWeights();
    const criteriaValues = {};
    CRITERIA.forEach(c => {
      const val = parseFloat(document.getElementById(c).value);
      criteriaValues[c] = val;
      document.getElementById(`val-${c}`).textContent = val.toFixed(1);
      const descEl = document.getElementById(`desc-${c}`);
      descEl.textContent = getDesc(c, val);
      // Repli progressif : le texte descriptif ne s'affiche qu'une fois qu'on
      // s'est écarté de la valeur neutre par défaut (5), pour ne pas noyer le
      // formulaire sous 7 blocs de texte dès l'ouverture d'une fiche vierge.
      descEl.classList.toggle('revealed', val !== 5);
    });
    score = computeWeightedScore(criteriaValues, w);
  }

  const scoreEl = document.getElementById('score-big');
  const denomEl = document.querySelector('.score-denom');

  animateValueTowards(scoreEl, score, 1, 200);
  denomEl.textContent = '/10';
  scoreEl.className = 'score-big ' + (score >= 7.5 ? 'good' : score >= 5.0 ? 'mid' : 'bad');

  const stars = scoreToStars(score);
  document.getElementById('stars-display').textContent = getStarStr(stars);

  return score;
}

function updateSliderPct(el) {
  const val = parseFloat(el.value);
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max) || 10;
  el.style.setProperty('--slider-pct', ((val - min) / (max - min)) * 100 + '%');
}

function updateAllSliders() {
  CRITERIA.forEach(c => {
    const el = document.getElementById(c);
    if (el) updateSliderPct(el);
  });
}

// Positionne le repère de moyenne perso sur chaque slider (voir CSS
// .criterion-avg-marker). Calculé une fois depuis l'historique existant : la
// moyenne "passée" ne change pas pendant qu'on note le film en cours, pas
// besoin de la recalculer à chaque glissement de curseur.
function renderCriteriaAverageMarkers() {
  const avgs = computeCriteriaAverages(loadHistory(), CRITERIA);
  CRITERIA.forEach(c => {
    const marker = document.getElementById(`avg-marker-${c}`);
    if (!marker) return;
    const avg = avgs[c];
    if (avg === null) {
      marker.style.display = 'none';
      return;
    }
    marker.style.left = `${(avg / 10) * 100}%`;
    marker.title = `Ta moyenne habituelle sur ce critère : ${avg.toFixed(1)}`;
    marker.style.display = 'block';
  });
}

CRITERIA.forEach(c => {
  document.getElementById(c).addEventListener('input', () => {
    updateSliderPct(document.getElementById(c));
    calculateScore();
    saveDraft();
    // Un input[type=range] avec un `step` ne déclenche 'input' qu'une fois la
    // valeur quantifiée (donc déjà une fois par graduation de 0.5) : une petite
    // vibration ici suffit à donner un vrai "cranté" tactile au glissement,
    // sans logique supplémentaire de détection de palier.
    if (navigator.vibrate) navigator.vibrate(8);
    // Pulse sur le chiffre affiché (pas le curseur lui-même, pour ne pas
    // interférer avec sa propre transform native pendant le glissement).
    hapticPulse(document.getElementById(`val-${c}`), 'light');
  });
});

// Boutons ± à côté de chaque slider : plus précis qu'un glissé du doigt pour
// viser une valeur exacte sur mobile. Un seul gestionnaire délégué pour les
// 14 boutons (7 critères × 2), via les attributs data-target/data-step.
document.querySelectorAll('.criterion-step-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const slider = document.getElementById(btn.dataset.target);
    const step = parseFloat(btn.dataset.step);
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const next = Math.min(max, Math.max(min, parseFloat(slider.value) + step));
    slider.value = next;
    // Un événement 'input' synthétique réutilise exactement la même logique
    // que le glissement manuel (recalcul du score, sauvegarde du brouillon,
    // vibration), sans dupliquer ce code ici.
    slider.dispatchEvent(new Event('input'));
  });
});

// ═══════════════════════════════════════════
//  NOUVELLE CRITIQUE (RESET)
// ═══════════════════════════════════════════
document.getElementById('new-btn').addEventListener('click', () => {
  openModal('Nouvelle critique', 'Voulez-vous effacer le formulaire actuel pour commencer une nouvelle critique ?', () => {
    localStorage.removeItem('lbx_draft');
    resetForm();
    showToast('Formulaire réinitialisé');
  });
});

// ═══════════════════════════════════════════
//  COPY TEXT
// ═══════════════════════════════════════════
document.getElementById('copy-btn').addEventListener('click', () => {
  const title    = document.getElementById('movie-title').value.trim() || searchEl.value.trim() || 'Film sans titre';
  const year     = document.getElementById('movie-year').value;
  const director = document.getElementById('movie-director').value;
  const actors   = document.getElementById('movie-actors').value;
  const dateVal  = document.getElementById('view-date').value;
  const dateStr  = dateVal ? new Date(dateVal + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : '';
  const review   = document.getElementById('review-text').value.trim();
  const score    = calculateScore(); 
  const stars    = document.getElementById('stars-display').textContent;
  const heartStr = isLiked ? ' ❤️' : '';

  let text = `📽 ${title} ${year ? '('+year+') ' : ''}${heartStr}\n`;
  if (director) text += `🎬 Un film de ${director}\n`;
  if (actors) text += `🎭 Avec ${actors}\n`;
  if (dateStr) text += `🗓 Vu le ${dateStr}\n`;
  if (activeContextTags.size > 0) text += `🏷 ${Array.from(activeContextTags).join(' · ')}\n`;
  
  text += `⭐ ${stars} (${score.toFixed(1)}/10)\n`;

  if (currentMode === 'detail') {
    const vals = CRITERIA.reduce((acc, c) => {
      acc[c] = parseFloat(document.getElementById(c).value).toFixed(1);
      return acc;
    }, {});
    text += `\nScénario ${vals.scenario} · Réal ${vals.realisation} · Photo ${vals.photo} · Acteurs ${vals.acteurs} · Son ${vals.ambiance} · Affect ${vals.affect}\n`;
  }

  if (review) text += `\n${review}`;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.innerHTML = `${ICONS.check} Copié !`;
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = `${ICONS.copy} Texte`; btn.classList.remove('copied'); }, 2000);
    showToast('Critique copiée dans le presse-papier');
  });
});

// ═══════════════════════════════════════════
//  SAVE
// ═══════════════════════════════════════════
// Animation de validation façon "clap de cinéma" à chaque critique
// enregistrée : renforce le sentiment d'accomplissement (micro-interaction),
// sans bloquer l'interface (pointer-events: none, se retire toute seule).
function playSaveConfirmation() {
  const overlay = document.createElement('div');
  overlay.className = 'save-confirm-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="save-confirm-board">
      <div class="save-confirm-board-top"></div>
      <div class="save-confirm-board-bottom"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (navigator.vibrate) navigator.vibrate([12, 25, 12]);
  setTimeout(() => overlay.remove(), 700);
}

document.getElementById('save-btn').addEventListener('click', () => {
  if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  hapticPulse(document.getElementById('save-btn'), 'strong');
  
  const title = document.getElementById('movie-title').value.trim() || searchEl.value.trim();
  if (!title) { showToast('Entrez un titre de film avant de sauvegarder.'); return; }

  const history  = loadHistory();
  const existing = history.find(h => h.title.toLowerCase() === title.toLowerCase());
  const score    = calculateScore();

  const movie = {
    title,
    year:       document.getElementById('movie-year').value,
    poster:     document.getElementById('movie-poster').value,
    genre:      document.getElementById('movie-genre').value,
    runtime:    document.getElementById('movie-runtime').value,
    director:   document.getElementById('movie-director').value,
    actors:     document.getElementById('movie-actors').value, 
    tmdbScore:  document.getElementById('movie-tmdb-score').value || null,
    tmdbId:     document.getElementById('movie-tmdb-id').value || null,
    date:       document.getElementById('view-date').value,
    liked:      isLiked,
    contextTags: Array.from(activeContextTags),
    score:      score.toFixed(1),
    stars:      document.getElementById('stars-display').textContent,
    mode:       currentMode,
    review:     document.getElementById('review-text').value.trim(),
    values: currentMode === 'detail'
      ? CRITERIA.reduce((acc, c) => { acc[c] = document.getElementById(c).value; return acc; }, {})
      : { quick: quickRating },
    savedAt: existing && existing.savedAt ? existing.savedAt : new Date().toISOString(),
    updatedAt: new Date().toISOString() // sert à la fusion lors de la synchro cloud
  };

  if (existing) {
    openModal(
      'Film déjà noté',
      `"${title}" est déjà dans votre historique avec ${existing.score}/10.\nVoulez-vous écraser cette note ?`,
      () => {
        const idx = history.findIndex(h => h.title.toLowerCase() === title.toLowerCase());
        history.splice(idx, 1);
        history.unshift(movie);
        saveHistory(history);
        localStorage.removeItem('lbx_draft');
        resetForm();
        window._justSavedHistoryTitle = title.toLowerCase();
        renderAll();
        showToast(`"${title}" mis à jour`);
        playSaveConfirmation();
      }
    );
  } else {
    history.unshift(movie);
    saveHistory(history);
    localStorage.removeItem('lbx_draft'); 
    resetForm();
    window._justSavedHistoryTitle = title.toLowerCase();
    renderAll();
    showToast(`"${title}" enregistré`);
    playSaveConfirmation();
    const saveBtn = document.getElementById('save-btn');
    const origSave = saveBtn.innerHTML;
    saveBtn.innerHTML = `${ICONS.check} Sauvé !`;
    saveBtn.style.background = 'var(--green)';
    saveBtn.style.color = '#0d1117';
    setTimeout(() => { saveBtn.innerHTML = origSave; saveBtn.style.background = ''; saveBtn.style.color = ''; }, 1800);
  }
});

function resetForm() {
  searchEl.value = '';
  document.getElementById('movie-title').value     = '';
  document.getElementById('movie-year').value      = '';
  document.getElementById('movie-poster').value    = '';
  document.getElementById('movie-genre').value     = '';
  document.getElementById('movie-runtime').value   = '';
  document.getElementById('movie-director').value  = '';
  document.getElementById('movie-actors').value    = '';
  document.getElementById('movie-tmdb-score').value = '';
  document.getElementById('movie-tmdb-id').value = '';
  document.getElementById('review-text').value     = '';
  document.getElementById('strip-ratings').style.display = 'none';
  document.getElementById('film-strip').classList.remove('visible');
  
  isLiked = false;
  document.getElementById('heart-btn').classList.remove('active');
  document.getElementById('heart-btn').setAttribute('aria-pressed', 'false');
  setTodayDate();
  
  activeContextTags.clear();
  document.querySelectorAll('.ctx-tag').forEach(b => b.classList.remove('active'));

  CRITERIA.forEach(c => { document.getElementById(c).value = 5; });
  quickRating = 2.5;
  const defaultRadio = document.getElementById('s5'); 
  if(defaultRadio) defaultRadio.checked = true;
  
  setMode('detail'); 
  updateAllSliders();
  renderCriteriaAverageMarkers();
  updateQuickLabel();
}

// ═══════════════════════════════════════════
//  LOAD MOVIE
// ═══════════════════════════════════════════
window.loadItem = function(idx) {
  const history = loadHistory(); const item = history[idx]; if (!item) return;
  document.getElementById('movie-title').value  = item.title;
  document.getElementById('movie-year').value   = item.year || '';
  document.getElementById('movie-poster').value = item.poster || '';
  document.getElementById('movie-genre').value  = item.genre  || '';
  document.getElementById('movie-runtime').value = item.runtime || '';
  document.getElementById('movie-director').value = item.director || '';
  document.getElementById('movie-actors').value   = item.actors || ''; 
  document.getElementById('movie-tmdb-id').value  = item.tmdbId || '';
  document.getElementById('movie-tmdb-score').value = item.tmdbScore || '';
  
  searchEl.value = item.title;
  document.getElementById('view-date').value     = item.date  || '';
  document.getElementById('review-text').value   = item.review || '';
  isLiked = item.liked || false;
  document.getElementById('heart-btn').classList.toggle('active', isLiked);
  document.getElementById('heart-btn').setAttribute('aria-pressed', String(isLiked));

  activeContextTags = new Set(item.contextTags || []);
  document.querySelectorAll('.ctx-tag').forEach(b => {
    if (activeContextTags.has(b.dataset.tag)) b.classList.add('active');
    else b.classList.remove('active');
  });

  const strip = document.getElementById('film-strip');
  strip.classList.add('visible');
  document.getElementById('strip-title').textContent = item.title;
  
  document.getElementById('strip-genre').innerHTML = buildStripMeta({
    genre: item.genre, runtime: item.runtime, year: item.year,
    director: item.director, actors: item.actors
  });

  if (item.tmdbScore) {
    document.getElementById('strip-tmdb-score').textContent = item.tmdbScore + '/10';
  } else {
    document.getElementById('strip-tmdb-score').textContent = '—';
  }

  if (item.poster) {
    document.getElementById('strip-poster').src = item.poster;
    document.getElementById('strip-poster').alt = item.title ? `Affiche de ${item.title}` : '';
    document.getElementById('strip-poster').style.display = 'block';
  }

  if (item.mode === 'quick' && item.values?.quick !== undefined) {
    setMode('quick');
    quickRating = parseFloat(item.values.quick);
    const radioId = 's' + (quickRating * 2); 
    const radioEl = document.getElementById(radioId);
    if(radioEl) radioEl.checked = true; 
  } else {
    setMode('detail');
    CRITERIA.forEach(c => {
      document.getElementById(c).value = item.values && item.values[c] !== undefined ? item.values[c] : 5;
    });
  }

  calculateScore();
  renderCriteriaAverageMarkers();
  saveDraft(); 
  
  if (window.innerWidth <= 860) switchMobileNav('rating');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ═══════════════════════════════════════════
//  MODE FOCUS (un critère à la fois)
// ═══════════════════════════════════════════
// Alternative à la liste empilée : n'affiche qu'un critère à la fois, avec
// navigation dédiée (boutons ‹ › ou swipe). Le score, les descriptions, le
// repère de moyenne perso et la piste colorée continuent de fonctionner
// normalement — seule la mise en page (quel bloc est visible) change.
const FOCUS_MODE_KEY = 'lbx_focus_mode';
let focusModeOn = localStorage.getItem(FOCUS_MODE_KEY) === 'true';
let focusIndex = 0;

const criteriaListEl = document.getElementById('criteria-list');
const focusModeToggle = document.getElementById('focus-mode-toggle');
const focusNavEl = document.getElementById('focus-nav');
const focusPrevBtn = document.getElementById('focus-prev-btn');
const focusNextBtn = document.getElementById('focus-next-btn');
const focusProgressEl = document.getElementById('focus-progress');

function renderFocusStep() {
  CRITERIA.forEach((c, i) => {
    const block = document.getElementById(c).closest('.criterion-block');
    if (block) block.classList.toggle('focus-active', i === focusIndex);
  });
  focusProgressEl.textContent = `${focusIndex + 1} / ${CRITERIA.length}`;
  focusPrevBtn.disabled = focusIndex === 0;
  focusNextBtn.disabled = focusIndex === CRITERIA.length - 1;
}

function applyFocusMode() {
  criteriaListEl.classList.toggle('focus-mode', focusModeOn);
  focusNavEl.style.display = focusModeOn ? 'flex' : 'none';
  focusModeToggle.classList.toggle('active', focusModeOn);
  focusModeToggle.setAttribute('aria-pressed', String(focusModeOn));
  if (focusModeOn) renderFocusStep();
}

function goToFocusStep(newIndex) {
  if (newIndex < 0 || newIndex >= CRITERIA.length || newIndex === focusIndex) return;
  focusIndex = newIndex;
  renderFocusStep();
  if (navigator.vibrate) navigator.vibrate(10);
  hapticPulse(document.getElementById('focus-progress'), 'light');
}

focusModeToggle.addEventListener('click', () => {
  focusModeOn = !focusModeOn;
  localStorage.setItem(FOCUS_MODE_KEY, String(focusModeOn));
  focusIndex = 0;
  applyFocusMode();
});

focusPrevBtn.addEventListener('click', () => goToFocusStep(focusIndex - 1));
focusNextBtn.addEventListener('click', () => goToFocusStep(focusIndex + 1));

// Swipe gauche/droite pour naviguer entre critères, actif seulement en mode
// focus. stopPropagation() empêche ce geste de déclencher AUSSI le swipe
// global de changement d'onglet mobile (voir 01-navigation.js).
(function initFocusSwipe() {
  const SWIPE_MIN_DISTANCE = 40;
  const SWIPE_ANGLE_RATIO = 1.3;
  let startX = 0, startY = 0, tracking = false;

  criteriaListEl.addEventListener('touchstart', e => {
    if (!focusModeOn) { tracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  criteriaListEl.addEventListener('touchend', e => {
    if (!tracking || !focusModeOn) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_ANGLE_RATIO) return;
    e.stopPropagation();
    if (dx < 0) goToFocusStep(focusIndex + 1); // gauche -> critère suivant
    else goToFocusStep(focusIndex - 1);         // droite -> critère précédent
  });
})();

applyFocusMode(); // état initial au chargement, selon la préférence sauvegardée

// ═══════════════════════════════════════════
//  TOAST & DELETE WITH UNDO
// ═══════════════════════════════════════════

// Associe chaque tag de contexte stocké (avec son emoji d'origine, jamais
// changé pour ne pas casser les films déjà notés) à son icône SVG équivalente,
// utilisée uniquement à l'affichage — voir tagsHTML plus bas.
// Déclaré ICI (local à la fonction), pas en haut du fichier : un `const`
// top-level serait dans sa "zone morte temporelle" tant que l'exécution du
// script n'a pas atteint cette ligne — or `renderAll()` est appelée une
// première fois de façon précoce (voir 03-foundation.js), avant que
// 06-history.js n'ait fini de s'exécuter (même bug que rencontré et corrigé
// pour CRITERIA_SHORT_LABELS dans createRadarSVG).
function renderTagLabel(tagText) {
  const CONTEXT_TAG_ICONS = {
    '🍿': ICONS.popcorn,
    '🔄': ICONS.refresh,
    '📝': ICONS.edit,
    '🛋️': ICONS.sofa,
    '🛋': ICONS.sofa,
  };
  const [emoji, ...rest] = tagText.split(' ');
  const icon = CONTEXT_TAG_ICONS[emoji];
  return icon ? `${icon} ${rest.join(' ')}` : tagText;
}

let toastTimer;
let deletedItemCache = null; 
let deletedItemIndex = null;

function showToast(msg, withUndo = false) {
  const t = document.getElementById('toast');
  
  let html = `<span>${msg}</span>`;
  if (withUndo) {
    html += `<button class="toast-undo-btn" onclick="undoDelete()">Annuler</button>`;
  }
  t.innerHTML = html;
  
  t.classList.add('show');
  clearTimeout(toastTimer);
  
  toastTimer = setTimeout(() => { 
      t.classList.remove('show');
      deletedItemCache = null; 
  }, withUndo ? 4500 : 2800);
}

window.deleteItem = function(idx, btnEl) {
  const history = loadHistory();
  deletedItemCache = history[idx]; 
  deletedItemIndex = idx;
  
  if (btnEl) {
    const cardToAnimate = btnEl.closest('.hist-item');
    cardToAnimate.classList.add('deleting');
  }

  setTimeout(() => {
    history.splice(idx, 1);
    saveHistory(history);
    if (deletedItemCache?.title) {
      recordTombstone(HISTORY_TOMBSTONES_KEY, deletedItemCache.title.toLowerCase());
    }
    renderAll();
    showToast(`Film supprimé.`, true);
  }, 300);
};

window.undoDelete = function() {
  if (!deletedItemCache) return;
  const history = loadHistory();
  history.splice(deletedItemIndex, 0, deletedItemCache); 
  saveHistory(history);
  if (deletedItemCache?.title) {
    removeTombstone(HISTORY_TOMBSTONES_KEY, deletedItemCache.title.toLowerCase());
  }
  renderAll();
  showToast(`Suppression annulée.`);
  deletedItemCache = null;
};

// ═══════════════════════════════════════════
//  RECHERCHE HISTORIQUE
// ═══════════════════════════════════════════
let histSearchTimer;
document.getElementById('history-search').addEventListener('input', (e) => {
  historySearchQuery = e.target.value.toLowerCase();
  clearTimeout(histSearchTimer);
  histSearchTimer = setTimeout(renderHistory, 150);
});

// ═══════════════════════════════════════════
//  RENDER HISTORY / DASHBOARD / STATS
// ═══════════════════════════════════════════
function getGenres(history) {
  const set = new Set();
  history.forEach(item => {
    if (item.genre) {
      item.genre.split(',').forEach(g => { const t = g.trim(); if (t) set.add(t); });
    }
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

function renderGenreChips(history) {
  const genres = getGenres(history);
  const row    = document.getElementById('genre-filter-row');
  const chips  = document.getElementById('genre-chips');

  if (genres.length === 0) { row.style.display = 'none'; return; }
  row.style.display = 'flex';
  chips.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'genre-chip all-chip' + (activeGenre === null ? ' active' : '');
  allChip.textContent = 'Tous';
  allChip.addEventListener('click', () => { activeGenre = null; activeScoreFilter = null; renderGenreChips(history); renderHistory(); });
  chips.appendChild(allChip);

  genres.forEach(g => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip' + (activeGenre === g ? ' active' : '');
    chip.textContent = g;
    chip.addEventListener('click', () => {
      activeGenre = (activeGenre === g) ? null : g;
      renderGenreChips(history);
      renderHistory();
    });
    chips.appendChild(chip);
  });
}

function getSorted(history) {
  let h = history;

  if (activeGenre) {
    h = h.filter(item => item.genre && item.genre.split(',').map(g => g.trim()).includes(activeGenre));
  }

  if (activeScoreFilter !== null) {
    const scoreRanges = {
      '50': [9,10], '45': [8.5,9], '40': [7.5,8.5], '35': [6.5,7.5], '30': [5.5,6.5],
      '25': [4.5,5.5], '20': [3.5,4.5], '15': [2.5,3.5], '10': [1.5,2.5], '05': [0,1.5]
    };
    const [lo, hi] = scoreRanges[activeScoreFilter] || [0,10];
    h = h.filter(item => {
      const s = parseFloat(item.score);
      return s >= lo && (activeScoreFilter === '50' ? s <= hi : s < hi);
    });
  }

  if (historySearchQuery) {
    h = h.filter(item => {
      const titleMatch = item.title && item.title.toLowerCase().includes(historySearchQuery);
      const dirMatch = item.director && item.director.toLowerCase().includes(historySearchQuery);
      const actMatch = item.actors && item.actors.toLowerCase().includes(historySearchQuery);
      return titleMatch || dirMatch || actMatch;
    });
  }

  if (sortOrder === 'date') {
    return h.sort((a, b) => {
      const dateA = a.date || a.savedAt || "";
      const dateB = b.date || b.savedAt || "";
      return dateB.localeCompare(dateA); 
    });
  }

  if (sortOrder === 'score-desc') return h.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  if (sortOrder === 'score-asc')  return h.sort((a, b) => parseFloat(a.score) - parseFloat(b.score));
  if (sortOrder === 'title')      return h.sort((a, b) => a.title.localeCompare(b.title));
  
  return h; 
}

function renderHistory() {
  const history   = loadHistory();
  const sorted    = getSorted(history);
  const container = document.getElementById('history-list');

  const badge = document.getElementById('hist-count-badge');
  if (activeGenre || historySearchQuery || activeScoreFilter) {
    badge.textContent = `${sorted.length} / ${history.length} film${history.length > 1 ? 's' : ''}`;
    badge.style.color = 'var(--orange)';
  } else {
    badge.textContent = history.length + ' film' + (history.length > 1 ? 's' : '');
    badge.style.color = '';
  }

  renderGenreChips(history);

  if (history.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.clapper}</div>Aucun film noté. Évaluez votre premier film !<button type="button" class="empty-state-cta" id="empty-state-history-cta">Rechercher mon premier film</button></div>`;
    window._justSavedHistoryTitle = null;
    return;
  }

  if (sorted.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.search}</div>Aucun résultat pour cette recherche.</div>`;
    window._justSavedHistoryTitle = null;
    return;
  }

  container.innerHTML = '';
  sorted.forEach((item, i) => {
    const realIdx = history.findIndex(h => h.savedAt === item.savedAt && h.title === item.title);
    const div = document.createElement('div');
    div.className = 'hist-item';
    div.dataset.idx = realIdx;
    // Anime l'entrée du film qu'on vient tout juste de sauvegarder (voir
    // 05-rating-form.js), pas les autres — sinon toute la liste rejouerait
    // l'animation à chaque re-rendu (changement de filtre, etc.).
    if (window._justSavedHistoryTitle && item.title.toLowerCase() === window._justSavedHistoryTitle) {
      div.classList.add('hist-item-entering');
    }

    const scoreNum = parseFloat(item.score);
    let scoreColor = 'var(--red)';
    if(scoreNum >= 7.5) scoreColor = 'var(--green)';
    else if(scoreNum >= 5.0) scoreColor = 'var(--gold)';

    const imgHtml = item.poster
      ? `<img class="hist-poster" src="${item.poster}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=\\'hist-poster-ph\\'>🎬</div>'">`
      : `<div class="hist-poster-ph">${ICONS.clapper}</div>`;

    const tmdbHtml = item.tmdbScore
      ? `<span class="hist-tmdb">★ ${item.tmdbScore} TMDb</span>`
      : '';

    let metaHTML = '';
    if (item.year) metaHTML += item.year + ' · ';
    if (item.runtime) metaHTML += item.runtime + ' · ';
    metaHTML += item.genre || '';
    if (item.director) metaHTML += `<br><span style="color:var(--text-mid)">Réalisé par <b>${item.director}</b></span>`;
    if (item.actors) metaHTML += `<br><span style="color:var(--text-mid)">Avec <b>${item.actors}</b></span>`;

    let tagsHTML = '';
    if (item.contextTags && item.contextTags.length > 0) {
      tagsHTML = `<div class="hist-tags-disp">${item.contextTags.map(t => `<span class="h-tag">${renderTagLabel(t)}</span>`).join('')}</div>`;
    }

    let reviewHTML = '';
    if (item.review) {
      reviewHTML = `
        <div class="hist-review" onclick="this.classList.toggle('expanded')">
          <div class="hist-review-content">"${item.review}"</div>
          <span class="hist-review-toggle"></span>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="hist-swipe-hint hist-swipe-hint-left" aria-hidden="true">${ICONS.trash} Supprimer</div>
      <div class="hist-swipe-hint hist-swipe-hint-right" aria-hidden="true">${ICONS.edit} Modifier</div>
      <div class="hist-item-content">
        ${imgHtml}
        <div class="hist-body">
          <div class="hist-title">${item.title}${item.liked ? ` <span class="liked-badge">${ICONS.heart}</span>` : ''}</div>
          <div class="hist-meta">${metaHTML}</div>
          ${tagsHTML}
          <div style="margin-bottom:4px;"><span style="color:${scoreColor};font-weight:700;">${item.score}/10</span>${tmdbHtml}</div>
          <div class="hist-stars">${item.stars}<span class="hist-score"></span></div>
          ${reviewHTML}
        </div>
        <div class="hist-actions">
          <button class="hist-action-btn" onclick="loadItem(${realIdx})" title="Modifier">${ICONS.edit}</button>
          <button class="hist-action-btn del" onclick="deleteItem(${realIdx}, this)" title="Supprimer" aria-label="Supprimer ${item.title.replace(/"/g, '&quot;')} de l'historique">${ICONS.trash}</button>
        </div>
      </div>`;
    container.appendChild(div);
    applyPosterAccent(item.poster, div);
  });
  window._justSavedHistoryTitle = null;
}

// ═══════════════════════════════════════════
//  ACTIONS RAPIDES (appui long sur un film de l'historique)
// ═══════════════════════════════════════════

// Reconstruit le même texte partageable que le bouton "Copier" du formulaire,
// mais à partir des données SAUVEGARDÉES d'un film (pas besoin de le charger
// dans le formulaire d'abord). Garde les deux textes strictement identiques.
function buildCopyTextForItem(item) {
  const heartStr = item.liked ? ' ❤️' : '';
  const dateStr = item.date
    ? new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const score = parseFloat(item.score) || 0;
  const stars = getStarStr(scoreToStars(score));

  let text = `📽 ${item.title} ${item.year ? '(' + item.year + ') ' : ''}${heartStr}\n`;
  if (item.director) text += `🎬 Un film de ${item.director}\n`;
  if (item.actors) text += `🎭 Avec ${item.actors}\n`;
  if (dateStr) text += `🗓 Vu le ${dateStr}\n`;
  if (item.contextTags && item.contextTags.length > 0) text += `🏷 ${item.contextTags.join(' · ')}\n`;

  text += `⭐ ${stars} (${score.toFixed(1)}/10)\n`;

  if (item.mode === 'detail' && item.values) {
    const v = item.values;
    const f = (x) => (parseFloat(x) || 0).toFixed(1);
    text += `\nScénario ${f(v.scenario)} · Réal ${f(v.realisation)} · Photo ${f(v.photo)} · Acteurs ${f(v.acteurs)} · Son ${f(v.ambiance)} · Affect ${f(v.affect)}\n`;
  }

  if (item.review) text += `\n${item.review}`;
  return text;
}

window.toggleLikedForItem = function(idx) {
  const history = loadHistory();
  const item = history[idx];
  if (!item) return;
  item.liked = !item.liked;
  item.updatedAt = new Date().toISOString();
  saveHistory(history);
  renderAll();
  showToast(item.liked ? `"${item.title}" ajouté à tes coups de cœur ❤️` : `"${item.title}" retiré de tes coups de cœur`);
};

const actionSheetEl = document.getElementById('action-sheet');
const actionSheetTitleEl = document.getElementById('action-sheet-title');
const actionSheetListEl = document.getElementById('action-sheet-list');
const actionSheetCancelBtn = document.getElementById('action-sheet-cancel');

function openActionSheetForItem(idx) {
  const history = loadHistory();
  const item = history[idx];
  if (!item) return;

  actionSheetTitleEl.textContent = item.title;

  const actions = [
    { label: 'Modifier', icon: ICONS.edit, onClick: () => loadItem(idx) },
    {
      label: item.liked ? 'Retirer des coups de cœur' : 'Ajouter aux coups de cœur',
      icon: ICONS.heart,
      onClick: () => toggleLikedForItem(idx),
    },
    {
      label: 'Copier le texte',
      icon: ICONS.copy,
      onClick: () => {
        navigator.clipboard.writeText(buildCopyTextForItem(item)).then(() => {
          showToast('Critique copiée dans le presse-papier');
        });
      },
    },
    {
      label: 'Supprimer',
      icon: ICONS.trash,
      danger: true,
      onClick: () => {
        const cardEl = document.querySelector(`.hist-item[data-idx="${idx}"]`);
        deleteItem(idx, cardEl ? cardEl.querySelector('.hist-action-btn.del') : null);
      },
    },
  ];

  actionSheetListEl.innerHTML = '';
  actions.forEach(({ label, icon, onClick, danger }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'action-sheet-item' + (danger ? ' danger' : '');
    btn.innerHTML = `${icon} <span>${label}</span>`;
    btn.addEventListener('click', () => {
      closeActionSheet();
      onClick();
    });
    actionSheetListEl.appendChild(btn);
  });

  lastFocusedBeforeModal = document.activeElement;
  actionSheetEl.classList.add('open');
  actionSheetListEl.querySelector('.action-sheet-item')?.focus();
}

function closeActionSheet() {
  closeModal(actionSheetEl);
}

actionSheetCancelBtn.addEventListener('click', closeActionSheet);
actionSheetEl.addEventListener('click', (e) => { if (e.target === actionSheetEl) closeActionSheet(); });

// Détection de l'appui long (mobile) sur un film de l'historique. Délégué sur
// le conteneur (pas un listener par carte) : fonctionne aussi pour les films
// ajoutés après coup, sans re-câblage. Annulé si le doigt bouge trop (= scroll)
// ou si l'appui vise déjà un bouton (édition/suppression directe).
(function initHistoryGestures() {
  const LONG_PRESS_MS = 500;
  const MOVE_CANCEL_PX = 10;
  const SWIPE_THRESHOLD = 80;
  const MAX_DRAG = 130;

  let pressTimer = null;
  let startX = 0, startY = 0;
  let pressedItem = null;
  let pressedContent = null;
  let longPressJustFired = false; // évite qu'un tap (click) ne se déclenche juste après un appui long déjà traité
  let wasSwipe = false; // idem, juste après un swipe
  let swipeMode = null; // null = pas encore décidé, 'swipe' = glissement horizontal engagé, 'scroll' = mouvement vertical (on laisse faire nativement)
  let dx = 0;
  // Un swipe qui atteint le seuil n'exécute plus l'action tout de suite : il
  // "arme" l'item (piste révélée, en attente d'un tap de confirmation sur
  // l'indice) plutôt que de supprimer/modifier immédiatement — évite les
  // suppressions accidentelles lors d'un simple scroll un peu appuyé.
  let armedItem = null;
  let armedDirection = null; // 'left' (supprimer) ou 'right' (modifier)

  const container = document.getElementById('history-list');
  if (!container) return;

  function cancelArmed() {
    if (!armedItem) return;
    const content = armedItem.querySelector('.hist-item-content');
    if (content) { content.style.transition = 'transform .25s ease'; content.style.transform = ''; }
    armedItem.classList.remove('hist-swipe-armed-left', 'hist-swipe-armed-right', 'hist-swipe-left', 'hist-swipe-right');
    armedItem = null;
    armedDirection = null;
  }

  function confirmArmed() {
    if (!armedItem) return;
    const item = armedItem;
    const dir = armedDirection;
    const content = item.querySelector('.hist-item-content');
    const idx = parseInt(item.dataset.idx, 10);
    armedItem = null;
    armedDirection = null;
    if (dir === 'left') {
      item.classList.add('hist-swipe-out-left');
      content.style.transform = 'translateX(-110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(item, 'strong');
      setTimeout(() => deleteItem(idx), 200); // pas de btnEl : évite de cumuler avec l'animation .deleting existante
    } else {
      item.classList.add('hist-swipe-out-right');
      content.style.transform = 'translateX(110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(item, 'strong');
      setTimeout(() => loadItem(idx), 200);
    }
  }

  function resetGesture(e) {
    if (e && pressedItem) e.stopPropagation();
    clearTimeout(pressTimer);
    pressTimer = null;
    pressedItem = null;
    pressedContent = null;
    swipeMode = null;
    dx = 0;
  }

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.hist-item');
    if (!item || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) { resetGesture(); return; }
    e.stopPropagation(); // évite que ce geste ne remonte jusqu'au swipe de changement d'onglet (01-navigation.js)
    pressedItem = item;
    pressedContent = item.querySelector('.hist-item-content');
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swipeMode = null;
    dx = 0;
    pressTimer = setTimeout(() => {
      if (!pressedItem || swipeMode === 'swipe') return; // déjà en train de glisser : pas d'appui long
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(pressedItem, 'medium');
      openActionSheetForItem(parseInt(pressedItem.dataset.idx, 10));
      longPressJustFired = true;
      setTimeout(() => { longPressJustFired = false; }, 300);
      resetGesture();
    }, LONG_PRESS_MS);
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!pressedItem) return;
    e.stopPropagation();
    const curX = e.touches[0].clientX;
    const curY = e.touches[0].clientY;
    const rawDx = curX - startX;
    const rawDy = curY - startY;

    // Décide UNE FOIS, dès qu'il y a assez de mouvement, si c'est un swipe
    // horizontal (glissement de la carte) ou un scroll vertical (on laisse
    // faire nativement, on ne touche à rien).
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        clearTimeout(pressTimer); // tout mouvement franc annule l'appui long
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 1.2 ? 'swipe' : 'scroll';
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;

    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
    pressedItem.classList.toggle('hist-swipe-right', dx > 10);
  }, { passive: true });

  function resolveGesture(e) {
    if (!pressedItem) return;
    if (e) e.stopPropagation();
    clearTimeout(pressTimer);

    if (swipeMode === 'swipe') {
      if (dx <= -SWIPE_THRESHOLD) {
        cancelArmed(); // un seul item armé à la fois
        pressedContent.style.transition = 'transform .2s ease';
        pressedContent.style.transform = 'translateX(-120px)';
        pressedItem.classList.add('hist-swipe-armed-left');
        armedItem = pressedItem;
        armedDirection = 'left';
        hapticPulse(pressedItem, 'medium');
      } else if (dx >= SWIPE_THRESHOLD) {
        cancelArmed();
        pressedContent.style.transition = 'transform .2s ease';
        pressedContent.style.transform = 'translateX(120px)';
        pressedItem.classList.add('hist-swipe-armed-right');
        armedItem = pressedItem;
        armedDirection = 'right';
        hapticPulse(pressedItem, 'medium');
      } else {
        pressedContent.style.transform = '';
        pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
      }
      wasSwipe = true;
      setTimeout(() => { wasSwipe = false; }, 300);
    }
    resetGesture();
  }

  container.addEventListener('touchend', resolveGesture);

  container.addEventListener('touchcancel', resetGesture);

  // Souris (pratique pour tester sur desktop / vercel dev) : même logique que
  // le tactile, juste déclenchée par mousedown/mousemove/mouseup.
  let mouseActive = false;
  container.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.hist-item');
    if (!item || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) return;
    mouseActive = true;
    pressedItem = item;
    pressedContent = item.querySelector('.hist-item-content');
    startX = e.clientX;
    startY = e.clientY;
    swipeMode = null;
    dx = 0;
  });
  document.addEventListener('mousemove', (e) => {
    if (!mouseActive || !pressedItem) return;
    const rawDx = e.clientX - startX;
    const rawDy = e.clientY - startY;
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 1.2 ? 'swipe' : 'scroll';
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;
    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
    pressedItem.classList.toggle('hist-swipe-right', dx > 10);
  });
  document.addEventListener('mouseup', () => {
    if (!mouseActive) return;
    mouseActive = false;
    resolveGesture();
  });

  // Tap (court) sur un film : ouvre sa fiche détaillée. L'appui long (menu
  // d'actions) et le swipe (supprimer/modifier) ont priorité — s'ils viennent
  // de se déclencher, on ignore ce tap.
  container.addEventListener('click', (e) => {
    // Confirmation/annulation d'un item armé (swipe qui a atteint son seuil) :
    // prioritaire sur tout le reste, y compris le garde-fou "wasSwipe" — sinon
    // on ne pourrait jamais confirmer juste après avoir swipé.
    if (armedItem) {
      const hint = e.target.closest('.hist-swipe-hint');
      const clickedItem = e.target.closest('.hist-item');
      if (hint && clickedItem === armedItem) {
        confirmArmed();
        return;
      }
      const wasArmedItself = clickedItem === armedItem;
      cancelArmed();
      if (wasArmedItself) return; // juste annulé : ne rien faire de plus avec ce tap
      // sinon : le tap visait autre chose (un autre film, le CTA...), on continue normalement
    }

    if (e.target.closest('#empty-state-history-cta')) {
      if (window.innerWidth <= 860) switchMobileNav('rating');
      const searchInput = document.getElementById('movie-search');
      if (searchInput) searchInput.focus();
      return;
    }
    if (longPressJustFired || wasSwipe) return;
    const item = e.target.closest('.hist-item');
    if (!item || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) return;
    const idx = parseInt(item.dataset.idx, 10);
    const history = loadHistory();
    const movieItem = history[idx];
    if (movieItem) openMovieDetailSheet(movieItem.tmdbId);
  });

  // Filet de sécurité : un tap n'importe où EN DEHORS de la liste (changer
  // d'onglet, ouvrir les réglages...) annule aussi un item resté armé.
  document.addEventListener('click', (e) => {
    if (armedItem && !container.contains(e.target)) cancelArmed();
  }, true);
})();

function createRadarSVG(averages) {
  if (averages.every(a => a === 0)) return null;

  // Libellés courts pour l'affichage du radar (doit couvrir toutes les clés de
  // CRITERIA). Déclaré ICI (local à la fonction) et non en haut du fichier :
  // un `const` top-level serait dans sa "zone morte temporelle" tant que
  // l'exécution du script n'a pas atteint cette ligne — or `renderAll()` est
  // appelée une première fois de façon précoce (voir 03-foundation.js), avant
  // que 06-history.js n'ait fini de s'exécuter, ce qui provoquait un plantage
  // total de l'app au chargement pour tout utilisateur ayant déjà un historique.
  const CRITERIA_SHORT_LABELS = {
    scenario: 'Scén.',
    realisation: 'Réal.',
    photo: 'Photo',
    acteurs: 'Casting',
    ambiance: 'Ambiance',
    rythme: 'Rythme',
    affect: 'Affect',
  };

  const s = 180, c = s/2, r = s*0.42;
  // Nombre d'axes = nombre de critères actuels (CRITERIA) : ne plus jamais figer
  // ce nombre en dur, sinon l'ajout d'un critère (ex: "Rythme") désaligne le
  // graphique ou perd un axe silencieusement.
  const angleStep = 360 / CRITERIA.length;
  const angles = CRITERIA.map((_, i) => (i * angleStep - 90) * Math.PI / 180);
  const labels = CRITERIA.map(critKey => CRITERIA_SHORT_LABELS[critKey] || critKey);

  let svg = `<svg viewBox="0 0 ${s} ${s}" width="100%" height="100%" style="max-width:250px; overflow:visible;">`;
  
  [10, 6.66, 3.33].forEach(lvl => {
    const pts = angles.map(a => `${c + (lvl/10)*r*Math.cos(a)},${c + (lvl/10)*r*Math.sin(a)}`).join(' ');
    svg += `<polygon points="${pts}" fill="none" class="svg-grid" />`;
  });

  angles.forEach((a, i) => {
    svg += `<line x1="${c}" y1="${c}" x2="${c + r*Math.cos(a)}" y2="${c + r*Math.sin(a)}" class="svg-axis" />`;
    const lx = c + (r + 14) * Math.cos(a), ly = c + (r + 8) * Math.sin(a);
    const anch = lx < c - 10 ? 'end' : (lx > c + 10 ? 'start' : 'middle');
    svg += `<text x="${lx}" y="${ly}" class="svg-text" text-anchor="${anch}" dominant-baseline="middle">${labels[i]}</text>`;
  });

  const dataPts = angles.map((a, i) => `${c + (averages[i]/10)*r*Math.cos(a)},${c + (averages[i]/10)*r*Math.sin(a)}`).join(' ');
  // Anime la forme depuis le centre (effet "scan") plutôt que de l'afficher
  // d'un coup — transform-origin fixé sur le centre exact du cercle (c,c).
  svg += `<polygon points="${dataPts}" fill="var(--orange)" fill-opacity="0.3" stroke="var(--orange)" stroke-width="2" class="radar-fill-anim" style="transform-origin:${c}px ${c}px;" />`;
  
  angles.forEach((a, i) => {
    svg += `<circle cx="${c + (averages[i]/10)*r*Math.cos(a)}" cy="${c + (averages[i]/10)*r*Math.sin(a)}" r="3" fill="var(--blue)" class="radar-dot-anim" style="animation-delay:${0.5 + i*0.05}s" />`;
  });

  svg += `</svg>`;
  return svg;
}

function createTimelineSVG(history) {
  const months = {};
  const now = new Date();
  for(let i=5; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = { c: 0 };
  }
  history.forEach(h => {
    if(h.date) { const k = h.date.substring(0,7); if(months[k]) months[k].c++; }
  });

  const keys = Object.keys(months).sort();
  const maxC = Math.max(...keys.map(k => months[k].c), 1);
  const w = 300, h = 100, pad = 20, barW = (w - pad*2)/6 - 10;

  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="overflow:visible;">`;
  keys.forEach((k, i) => {
    const count = months[k].c;
    const barH = (count / maxC) * (h - pad - 10);
    const x = pad + i*(barW + 10), y = h - pad - barH;
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="var(--border-hi)" rx="2" style="transition:height 0.5s ease, y 0.5s ease" />`;
    if(count > 0) svg += `<text x="${x + barW/2}" y="${y - 4}" class="svg-text-mono" text-anchor="middle">${count}</text>`;
    const mLab = new Date(k+'-01').toLocaleDateString('fr-FR', {month:'short'}).substring(0,3);
    svg += `<text x="${x + barW/2}" y="${h - 5}" class="svg-text" fill="var(--text-mid)" text-anchor="middle">${mLab}</text>`;
  });
  svg += `</svg>`;
  return svg;
}

// Anime un chiffre de 0 (ou de sa valeur affichée actuelle) jusqu'à sa valeur
// finale, avec un ralentissement en fin de course (ease-out) pour un rendu
// plus "premium" qu'un simple changement instantané. Respecte la préférence
// système "réduire les animations" : dans ce cas, affiche direct la valeur finale.
function animateCountUp(el, endValue, { duration = 700, decimals = 0 } = {}) {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const format = (v) => decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString();

  if (reduceMotion) {
    el.textContent = format(endValue);
    return;
  }

  const startValue = 0;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = format(startValue + (endValue - startValue) * eased);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = format(endValue);
  }
  requestAnimationFrame(step);
}

// Le radar ne se dessine (animation) que lorsqu'il entre réellement dans le
// viewport — divulgation progressive : pas d'effet gâché hors écran, et un
// petit "moment" à découvrir en scrollant jusqu'à lui plutôt qu'un dessin
// déjà terminé avant même de le voir. Un seul observer, mis en place une fois
// (le conteneur lui-même persiste ; seul son contenu est remplacé à chaque
// rendu — la classe .in-view s'applique alors dynamiquement au nouveau SVG).
(function initRadarScrollReveal() {
  const container = document.getElementById('radar-chart-container');
  if (!container || !window.IntersectionObserver) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) container.classList.add('in-view');
    });
  }, { threshold: 0.3 });
  observer.observe(container);
})();

function renderStats() {
  const history = loadHistory();
  animateCountUp(document.getElementById('kpi-total'), history.length);
  
  if (history.length === 0) {
    document.getElementById('kpi-avg').textContent = '-'; 
    document.getElementById('kpi-year').textContent = '0';
    document.getElementById('radar-chart-container').innerHTML = ''; 
    document.getElementById('radar-empty').style.display = 'block';
    document.getElementById('timeline-chart-container').innerHTML = '';
    document.getElementById('top-directors-list').innerHTML = '<div style="font-size:0.8rem;color:var(--text-mid);text-align:center">Enregistrez plus de films avec un réalisateur pour générer ce top.</div>';
    buildHistogram({});
    resetProfileExtras();
    return;
  }

  const avg = history.reduce((sum, h) => sum + parseFloat(h.score), 0) / history.length;
  animateCountUp(document.getElementById('kpi-avg'), avg, { decimals: 1 });

  const currentYear = new Date().getFullYear().toString();
  const yearCount = history.filter(h => h.date && h.date.startsWith(currentYear)).length;
  animateCountUp(document.getElementById('kpi-year'), yearCount);

  // Réutilise la même fonction que le repère de moyenne perso sur les sliders
  // (voir 03b-pure-logic.js), pour ne pas dupliquer ce calcul à deux endroits.
  // Gère nativement le cas d'un ancien film sans valeur pour un critère ajouté
  // après coup (ex: "Rythme") : ne compte ni dans la somme ni dans le diviseur
  // de CE critère précis pour cette entrée, plutôt que de fausser la moyenne.
  const avgsByCriterion = computeCriteriaAverages(history, CRITERIA);
  const avgs = CRITERIA.map(c => avgsByCriterion[c] || 0);
  const radarSvg = createRadarSVG(avgs);
  if (radarSvg) { 
    document.getElementById('radar-chart-container').innerHTML = radarSvg; 
    document.getElementById('radar-empty').style.display = 'none'; 
  } else { 
    document.getElementById('radar-chart-container').innerHTML = ''; 
    document.getElementById('radar-empty').style.display = 'block'; 
  }

  document.getElementById('timeline-chart-container').innerHTML = createTimelineSVG(history);

  const dirs = {};
  history.forEach(h => {
    if(h.director) { 
      h.director.split(',').forEach(d => {
        const t = d.trim(); if(!t) return;
        if(!dirs[t]) dirs[t] = { count:0, sum:0 }; 
        dirs[t].count++; dirs[t].sum+=parseFloat(h.score);
      });
    }
  });
  const topD = Object.entries(dirs).map(([name,d]) => ({name, count:d.count, avg:d.sum/d.count})).filter(d=>d.count>1).sort((a,b)=>b.count-a.count || b.avg-a.avg).slice(0,4);
  const dirCont = document.getElementById('top-directors-list');
  if(topD.length > 0) {
    dirCont.innerHTML = topD.map(d => `<div class="top-item" onclick="document.getElementById('history-search').value='${d.name}';document.getElementById('history-search').dispatchEvent(new Event('input'))"><span class="top-item-name">${d.name}</span><div class="top-item-meta"><span>${d.count} films</span><span class="top-item-score">★ ${d.avg.toFixed(1)}</span></div></div>`).join('');
  } else { 
    dirCont.innerHTML = `<div style="font-size:0.8rem;color:var(--text-mid);text-align:center">Enregistrez plus de films avec un réalisateur pour générer ce top.</div>`; 
  }

  const dist = { '50':0, '45':0, '40':0, '35':0, '30':0, '25':0, '20':0, '15':0, '10':0, '05':0 };
  history.forEach(item => {
    const stars = Math.round((parseFloat(item.score) / 2) * 2) / 2;
    const key   = Math.round(stars * 10).toString().padStart(2,'0');
    if (dist[key] !== undefined) dist[key]++;
  });
  buildHistogram(dist);
  renderProfileExtras(history);
}

// ─── Onglet Profil : temps visionné, acteur favori, membre depuis, série, badges ──
function resetProfileExtras() {
  document.getElementById('profile-member-since').textContent = '—';
  document.getElementById('profile-watch-time').textContent = '—';
  document.getElementById('profile-fav-actor').textContent = '—';
  document.getElementById('profile-streak').textContent = 'Pas de série en cours';
  renderBadges(computeBadges([], {}));
  drawProfileShareCard(null);
}

function renderProfileExtras(history) {
  // Membre depuis : date la plus ancienne connue (savedAt, ou date à défaut).
  const dates = history
    .map(h => h.savedAt || h.date)
    .filter(Boolean)
    .map(d => new Date(d))
    .filter(d => !isNaN(d));
  let memberSinceStr = '—';
  if (dates.length > 0) {
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    memberSinceStr = earliest.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  document.getElementById('profile-member-since').textContent = memberSinceStr;

  // Temps total visionné : somme des durées (le champ runtime est stocké en
  // texte libre, ex: "142 min" — parseInt s'arrête au premier caractère non
  // numérique, donc ça fonctionne aussi bien avec juste "142").
  const totalMinutes = history.reduce((sum, h) => {
    const mins = parseInt(h.runtime, 10);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0);
  document.getElementById('profile-watch-time').textContent = formatWatchTime(totalMinutes);

  // Acteur favori : même principe que le top réalisateurs (compte + note
  // moyenne), mais un seul nom affiché ici.
  const actorStats = {};
  history.forEach(h => {
    if (h.actors) {
      h.actors.split(',').forEach(a => {
        const t = a.trim(); if (!t) return;
        if (!actorStats[t]) actorStats[t] = { count: 0, sum: 0 };
        actorStats[t].count++; actorStats[t].sum += parseFloat(h.score) || 0;
      });
    }
  });
  const topActors = Object.entries(actorStats)
    .map(([name, d]) => ({ name, count: d.count, avg: d.sum / d.count }))
    .sort((a, b) => b.count - a.count || b.avg - a.avg);
  document.getElementById('profile-fav-actor').textContent =
    topActors.length > 0 ? `${topActors[0].name} (${topActors[0].count} film${topActors[0].count > 1 ? 's' : ''})` : '—';

  // Série en cours (streak) : semaines ISO consécutives avec au moins un film.
  const streak = computeWeekStreak(history);
  document.getElementById('profile-streak').textContent =
    streak > 0 ? `${streak} semaine${streak > 1 ? 's' : ''} de suite` : 'Pas de série en cours';

  renderBadges(computeBadges(history, { totalMinutes, streak }));
  drawProfileShareCard({ history, totalMinutes, memberSinceStr, topActor: topActors[0]?.name });
}

function renderBadges(badges) {
  const grid = document.getElementById('badges-grid');
  if (!grid) return;
  grid.innerHTML = badges.map(b => `
    <div class="badge-item ${b.unlocked ? 'unlocked' : 'locked'}" title="${b.unlocked ? 'Débloqué' : 'Pas encore débloqué'}">
      <div class="badge-icon">${ICONS.star}</div>
      <div class="badge-label">${b.label}</div>
    </div>
  `).join('');
}

// Carte de profil partageable : dessinée sur un <canvas>, avec les couleurs
// et la police du thème actif (lues via getComputedStyle), pour que l'image
// exportée corresponde à l'identité visuelle choisie plutôt qu'un rendu
// générique. Pas de librairie externe — dessin manuel, comme pour
// l'extraction de couleur dominante (00c-poster-color.js).
function drawProfileShareCard(data) {
  const canvas = document.getElementById('profile-share-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // certains environnements restrictifs renvoient null plutôt que de lever une erreur
  const w = canvas.width, h = canvas.height;

  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue('--surface').trim() || '#1f2935';
  const textHi = styles.getPropertyValue('--text-hi').trim() || '#fff';
  const textMid = styles.getPropertyValue('--text-mid').trim() || '#9ab';
  const accent = styles.getPropertyValue('--orange').trim() || '#ff8000';
  const fontHeading = (styles.getPropertyValue('--font-heading').trim() || 'sans-serif').split(',')[0].replace(/['"]/g, '');

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `900 30px "${fontHeading}", sans-serif`;
  ctx.fillText('LUDEX', w / 2, 60);

  ctx.fillStyle = textMid;
  ctx.font = `13px "${fontHeading}", sans-serif`;
  ctx.fillText('MON PROFIL CINÉPHILE', w / 2, 84);

  if (!data || !data.history || data.history.length === 0) {
    ctx.fillStyle = textMid;
    ctx.font = '15px sans-serif';
    ctx.fillText('Note quelques films pour', w / 2, h / 2 - 8);
    ctx.fillText('débloquer ta carte de profil', w / 2, h / 2 + 16);
    return;
  }

  const { history, totalMinutes, memberSinceStr, topActor } = data;
  const avg = history.reduce((sum, item) => sum + (parseFloat(item.score) || 0), 0) / history.length;

  const rows = [
    ['Films notés', String(history.length)],
    ['Note moyenne', avg.toFixed(1) + '/10'],
    ['Temps visionné', formatWatchTime(totalMinutes)],
    ['Membre depuis', memberSinceStr || '—'],
    ['Acteur favori', topActor || '—'],
  ];

  let y = 150;
  rows.forEach(([label, val]) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = textMid;
    ctx.font = '12px sans-serif';
    ctx.fillText(label.toUpperCase(), 30, y);
    ctx.fillStyle = textHi;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(val, 30, y + 26);
    y += 62;
  });
}

document.getElementById('profile-share-btn').addEventListener('click', () => {
  const canvas = document.getElementById('profile-share-canvas');
  if (!canvas || !canvas.getContext || !canvas.getContext('2d')) {
    showToast("Ton navigateur ne permet pas de générer cette image.");
    return;
  }
  const link = document.createElement('a');
  link.download = 'ludex-profil.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Image téléchargée.');
});

function buildHistogram(dist) {
  const container = document.getElementById('histogram');
  container.innerHTML = '';
  const order = [50, 45, 40, 35, 30, 25, 20, 15, 10, '05'];
  const labels = {
    50: '★★★★★', 45: '★★★★½', 40: '★★★★', 35: '★★★½', 30: '★★★',
    25: '★★½',   20: '★★',    15: '★½',    10: '★',    '05': '½'
  };
  const maxVal = Math.max(...Object.values(dist), 1);
  order.forEach(key => {
    const count   = dist[key] || 0;
    const pct     = (count / maxVal) * 100;
    const row     = document.createElement('div');
    const isActive = activeScoreFilter === String(key);
    row.className = 'histo-row' + (isActive ? ' active' : '');
    row.title = count > 0 ? `Filtrer par ${labels[key]}` : '';
    row.innerHTML = `
      <span class="histo-label">${labels[key]}</span>
      <div class="histo-track"><div class="histo-bar" style="width:${pct}%"></div></div>
      <span class="histo-count">${count}</span>`;
    if (count > 0) {
      row.addEventListener('click', () => {
        if (activeScoreFilter === String(key)) {
          activeScoreFilter = null;
        } else {
          activeScoreFilter = String(key);
          activeGenre = null; 
        }
        renderAll();
        document.querySelector('.history-scroller')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    container.appendChild(row);
  });
}

function renderAll() {
  renderStats();
  renderHistory();
}

// ═══════════════════════════════════════════
//  SORT FILTERS
// ═══════════════════════════════════════════
document.getElementById('filter-row').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  sortOrder = btn.dataset.sort;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistory();
});

// ═══════════════════════════════════════════
//  EXPORT / IMPORT
// ═══════════════════════════════════════════
document.getElementById('export-btn').addEventListener('click', () => {
  const history = loadHistory();
  if (!history.length) { showToast('Aucun film à exporter.'); return; }
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ludex-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast(`${history.length} film${history.length > 1 ? 's' : ''} exporté${history.length > 1 ? 's' : ''}`);
});

document.getElementById('import-trigger').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error('Format invalide');
      openModal(
        "Importer l'historique",
        `Importer ${data.length} film${data.length > 1 ? 's' : ''} ? Cela fusionnera avec votre historique actuel (les doublons seront ignorés).`,
        () => {
          const existing = loadHistory();
          const existingKeys = new Set(existing.map(h => (h.title + '|' + (h.year||'')).toLowerCase()));
          const toAdd = data.filter(d => !existingKeys.has((d.title + '|' + (d.year||'')).toLowerCase()));
          const merged = [...toAdd, ...existing];
          saveHistory(merged);
          renderAll();
          showToast(`${toAdd.length} film${toAdd.length > 1 ? 's' : ''} importé${toAdd.length > 1 ? 's' : ''}`);
        }
      );
    } catch {
      showToast('Fichier JSON invalide.');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ═══════════════════════════════════════════
//  WATCHLIST & DYNAMIC RECOMMENDATIONS
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
//  WATCHLISTS MULTIPLES
// ═══════════════════════════════════════════
// Plusieurs listes nommées ("À voir", "Halloween", "Suggestions de Marie"...)
// plutôt qu'une seule. loadWatchlist()/saveWatchlist() ciblent toujours
// implicitement la liste ACTIVE — tout le code existant (rendu, swipe,
// synchro cloud, Découvrir) continue de fonctionner sans modification, sans
// savoir qu'il y a désormais plusieurs listes possibles.
const WATCHLISTS_META_KEY = 'lbx_watchlists_meta';
const ACTIVE_WATCHLIST_KEY = 'lbx_active_watchlist_id';
const LEGACY_WATCHLIST_KEY = 'lbx_watchlist'; // ancienne clé (liste unique), migrée au premier chargement

function loadWatchlistsMeta() {
  try { return JSON.parse(localStorage.getItem(WATCHLISTS_META_KEY)) || []; } catch { return []; }
}
function saveWatchlistsMeta(meta) {
  localStorage.setItem(WATCHLISTS_META_KEY, JSON.stringify(meta));
}
function watchlistStorageKey(id) { return `lbx_watchlist_${id}`; }
function watchlistTombstonesKey(id) { return `lbx_watchlist_tombstones_${id}`; }
const WATCHLIST_LIST_TOMBSTONES_KEY = 'lbx_watchlist_list_tombstones'; // listes ENTIÈRES supprimées (pas juste des items)
const LEGACY_WATCHLIST_TOMBSTONES_KEY = 'lbx_watchlist_tombstones'; // ancienne clé (liste unique), migrée avec le reste

// Migration ponctuelle : si l'ancienne clé unique existe et qu'aucune liste
// nommée n'a encore été créée, on la transforme en une première liste "À voir"
// — aucune perte de données pour les utilisateurs déjà en place.
(function migrateLegacyWatchlist() {
  if (loadWatchlistsMeta().length > 0) return; // déjà migré
  let legacyItems = [];
  try { legacyItems = JSON.parse(localStorage.getItem(LEGACY_WATCHLIST_KEY)) || []; } catch {}
  let legacyTombstones = [];
  try { legacyTombstones = JSON.parse(localStorage.getItem(LEGACY_WATCHLIST_TOMBSTONES_KEY)) || []; } catch {}
  const defaultId = 'default';
  saveWatchlistsMeta([{ id: defaultId, name: 'À voir' }]);
  localStorage.setItem(watchlistStorageKey(defaultId), JSON.stringify(legacyItems));
  localStorage.setItem(watchlistTombstonesKey(defaultId), JSON.stringify(legacyTombstones));
  localStorage.setItem(ACTIVE_WATCHLIST_KEY, defaultId);
})();

function getActiveWatchlistId() {
  let id = localStorage.getItem(ACTIVE_WATCHLIST_KEY);
  const meta = loadWatchlistsMeta();
  if (!id || !meta.find(l => l.id === id)) {
    id = meta[0]?.id || 'default';
    localStorage.setItem(ACTIVE_WATCHLIST_KEY, id);
  }
  return id;
}
function setActiveWatchlistId(id) {
  localStorage.setItem(ACTIVE_WATCHLIST_KEY, id);
}

function createWatchlistList(name) {
  const meta = loadWatchlistsMeta();
  const id = 'wl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  meta.push({ id, name: name.trim() || 'Nouvelle liste' });
  saveWatchlistsMeta(meta);
  localStorage.setItem(watchlistStorageKey(id), JSON.stringify([]));
  return id;
}
function renameWatchlistList(id, newName) {
  const meta = loadWatchlistsMeta();
  const entry = meta.find(l => l.id === id);
  if (entry) { entry.name = newName.trim() || entry.name; saveWatchlistsMeta(meta); }
}
function deleteWatchlistList(id) {
  let meta = loadWatchlistsMeta();
  if (meta.length <= 1) return false; // toujours garder au moins une liste
  meta = meta.filter(l => l.id !== id);
  saveWatchlistsMeta(meta);
  localStorage.removeItem(watchlistStorageKey(id));
  localStorage.removeItem(watchlistTombstonesKey(id));
  recordTombstone(WATCHLIST_LIST_TOMBSTONES_KEY, id); // pour que la suppression de la LISTE elle-même se propage via la synchro
  if (getActiveWatchlistId() === id) setActiveWatchlistId(meta[0].id);
  return true;
}

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(watchlistStorageKey(getActiveWatchlistId()))) || []; } catch { return []; }
}
function saveWatchlist(list) {
  localStorage.setItem(watchlistStorageKey(getActiveWatchlistId()), JSON.stringify(list));
}


// Swipe sur un film de la watchlist : glisser à gauche = retirer, à droite =
// "vu, noter" (réutilise removeWatchlist/watchlistToForm, les mêmes fonctions
// que les boutons ✕/⭐ — juste un chemin de déclenchement en plus, pas de
// nouvelle logique). stopPropagation() évite que ce geste horizontal ne
// déclenche AUSSI le swipe global de changement d'onglet.
function attachWatchlistSwipeHandlers(cardEl, idx) {
  const SWIPE_THRESHOLD = 80;
  const MAX_DRAG = 130;
  const contentEl = cardEl.querySelector('.wl-card-content');
  let startX = 0, startY = 0, dx = 0, dragging = false, wasSwipe = false;

  function onStart(x, y) {
    startX = x; startY = y; dx = 0; dragging = true; wasSwipe = false;
    cardEl.classList.add('wl-dragging');
  }
  function onMove(x, y) {
    if (!dragging) return;
    const rawDx = x - startX;
    const dy = y - startY;
    if (Math.abs(dy) > Math.abs(rawDx) * 1.2) return; // trop vertical : probablement un scroll, pas un swipe
    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    if (Math.abs(dx) > 8) wasSwipe = true;
    contentEl.style.transform = `translateX(${dx}px)`;
    cardEl.classList.toggle('wl-swipe-left', dx < -10);
    cardEl.classList.toggle('wl-swipe-right', dx > 10);
  }
  function onEnd() {
    if (!dragging) return;
    dragging = false;
    cardEl.classList.remove('wl-dragging');

    if (dx <= -SWIPE_THRESHOLD) {
      cardEl.classList.add('wl-swipe-out-left');
      contentEl.style.transform = 'translateX(-110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(cardEl, 'strong');
      setTimeout(() => removeWatchlist(idx), 200);
    } else if (dx >= SWIPE_THRESHOLD) {
      cardEl.classList.add('wl-swipe-out-right');
      contentEl.style.transform = 'translateX(110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(cardEl, 'strong');
      setTimeout(() => watchlistToForm(idx), 200);
    } else {
      contentEl.style.transform = '';
      cardEl.classList.remove('wl-swipe-left', 'wl-swipe-right');
    }
    // Empêche le tap-pour-ouvrir-la-fiche de se déclencher juste après un
    // swipe avorté (retour à zéro) — seul un vrai tap sans mouvement l'ouvre.
    if (wasSwipe) {
      setTimeout(() => { wasSwipe = false; }, 50);
    }
  }

  cardEl.addEventListener('touchstart', e => {
    e.stopPropagation();
    onStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  cardEl.addEventListener('touchmove', e => {
    e.stopPropagation();
    onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  cardEl.addEventListener('touchend', e => {
    e.stopPropagation();
    onEnd();
  });
  cardEl.addEventListener('touchcancel', onEnd);

  // Souris (pratique pour tester sur desktop / vercel dev)
  cardEl.addEventListener('mousedown', e => {
    onStart(e.clientX, e.clientY);
    const moveHandler = ev => onMove(ev.clientX, ev.clientY);
    const upHandler = () => {
      onEnd();
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  });

  // Empêche le tap-pour-détail de s'ouvrir juste après un swipe (voir le
  // listener délégué de watchlist-list plus bas).
  cardEl.addEventListener('click', e => {
    if (wasSwipe) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}

function renderWatchlist() {
  const list = loadWatchlist();
  const container = document.getElementById('watchlist-list');
  const badge = document.getElementById('watchlist-count-badge');
  badge.textContent = list.length + ' film' + (list.length > 1 ? 's' : '');

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.target}</div>Aucun film dans la liste.<button type="button" class="empty-state-cta" id="empty-state-watchlist-cta">Découvrir des films à ajouter</button></div>`;
    window._justSavedWatchlistTitle = null;
    return;
  }

  container.innerHTML = '';
  list.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'wl-card';
    div.id = `wl-item-${i}`;
    if (window._justSavedWatchlistTitle && item.title.toLowerCase() === window._justSavedWatchlistTitle) {
      div.classList.add('wl-card-entering');
    }

    const posterHtml = item.poster
      ? `<div class="wl-poster"><img src="${item.poster}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" onerror="this.parentElement.textContent='🎬'"></div>`
      : `<div class="wl-poster">${ICONS.clapper}</div>`;

    div.innerHTML = `
      <div class="wl-swipe-hint wl-swipe-hint-left" aria-hidden="true">${ICONS.close} Retirer</div>
      <div class="wl-swipe-hint wl-swipe-hint-right" aria-hidden="true">${ICONS.star} Vu, noter</div>
      <div class="wl-card-content">
        ${posterHtml}
        <div class="wl-body">
          <div class="wl-title">${item.title}</div>
          <div class="wl-meta">${[item.year, item.genre].filter(Boolean).join(' · ')}</div>
          <div class="wl-providers" id="wl-providers-${i}">
            <span class="wl-provider-loading">⏳ Chargement streaming...</span>
          </div>
        </div>
        <div class="wl-actions">
          <button class="wl-btn rate" onclick="watchlistToForm(${i})" title="Je l'ai vu, noter">${ICONS.star}</button>
          <button class="wl-btn del" onclick="removeWatchlist(${i})" title="Retirer">${ICONS.close}</button>
        </div>
      </div>`;

    container.appendChild(div);
    applyPosterAccent(item.poster, div);
    attachWatchlistSwipeHandlers(div, i);

    if (item.tmdbId) {
      fetchProviders(item.tmdbId, i);
    } else {
      const pd = document.getElementById(`wl-providers-${i}`);
      if (pd) pd.innerHTML = '';
    }
  });
  window._justSavedWatchlistTitle = null;
}

async function fetchProviders(tmdbId, idx) {
  const el = document.getElementById(`wl-providers-${idx}`);
  if (!el) return;
  try {
    const res = await fetch(`/api/search?id=${tmdbId}&providers=BE`);
    const data = await res.json();

    const providerRoot = data['watch/providers']?.results?.BE
                      || data.providers?.results?.BE
                      || data.watchProviders?.BE
                      || null;

    if (!providerRoot) {
      el.innerHTML = '<span class="wl-no-streaming">Non disponible en streaming 🇧🇪</span>';
      return;
    }

    let html = '';

    const flat = providerRoot.flatrate || [];
    if (flat.length > 0) {
      html += `<span class="wl-provider-tag flatrate">Inclus</span>`;
      flat.slice(0, 5).forEach(p => {
        html += `<img class="wl-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }

    const rent = providerRoot.rent || [];
    const rentOnly = rent.filter(r => !flat.find(f => f.provider_id === r.provider_id));
    if (rentOnly.length > 0) {
      html += `<span class="wl-provider-tag rent">Location</span>`;
      rentOnly.slice(0, 4).forEach(p => {
        html += `<img class="wl-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }

    if (!html) {
      el.innerHTML = '<span class="wl-no-streaming">Non disponible en streaming 🇧🇪</span>';
    } else {
      el.innerHTML = html;
    }
  } catch {
    if (el) el.innerHTML = '<span class="wl-no-streaming">Providers indisponibles</span>';
  }
}

async function addToWatchlistFromTMDb(movie, year) {
  const list = loadWatchlist();
  const key = (movie.title + '|' + year).toLowerCase();
  if (list.find(i => (i.title + '|' + (i.year||'')).toLowerCase() === key)) {
    showToast('Déjà dans la liste.');
    return;
  }

  let genre = '';
  try {
    const res = await fetch(`/api/search?id=${movie.id}`);
    const data = await res.json();
    genre = data.genres?.map(g => g.name).join(', ') || '';
  } catch {}

  list.unshift({
    title: movie.title,
    year,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : '',
    genre,
    tmdbId: movie.id,
    addedAt: new Date().toISOString()
  });
  saveWatchlist(list);
  window._justSavedWatchlistTitle = movie.title.toLowerCase();
  renderWatchlist();
  showToast(`"${movie.title}" ajouté à la liste 🎯`);
}

window.removeWatchlist = function(idx) {
  const list = loadWatchlist();
  const item = list[idx];
  const title = item?.title;
  list.splice(idx, 1);
  saveWatchlist(list);
  if (item) recordTombstone(watchlistTombstonesKey(getActiveWatchlistId()), watchlistItemKey(item));
  renderWatchlist();
  if (title) showToast(`"${title}" retiré`);
};

window.watchlistToForm = function(idx) {
  const list = loadWatchlist();
  const item = list[idx];
  if (!item) return;
  searchEl.value = item.title;
  searchEl.dispatchEvent(new Event('input'));
  list.splice(idx, 1);
  saveWatchlist(list);
  recordTombstone(watchlistTombstonesKey(getActiveWatchlistId()), watchlistItemKey(item));
  renderWatchlist();
  
  if (window.innerWidth <= 860) switchMobileNav('rating');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Recherche lancée pour "${item.title}"`);
};

const wlInput = document.getElementById('watchlist-input');
const wlSuggestEl = document.getElementById('wl-suggestions');
let wlSearchTimer;

wlInput.addEventListener('input', () => {
  clearTimeout(wlSearchTimer);
  const q = wlInput.value.trim();
  if (q.length < 2) { wlSuggestEl.style.display = 'none'; return; }
  
  wlSearchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.results?.length) { wlSuggestEl.style.display = 'none'; return; }
      wlSuggestEl.innerHTML = '';
      wlSuggestEl.style.display = 'block';
      data.results.slice(0, 5).forEach(m => {
        const year = m.release_date?.slice(0, 4) || '';
        const el = document.createElement('div');
        el.className = 'wl-suggest-item';
        el.innerHTML = `
          ${m.poster_path
            ? `<img class="wl-suggest-poster" src="https://image.tmdb.org/t/p/w92${m.poster_path}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">`
            : `<div class="wl-suggest-poster" style="display:flex;align-items:center;justify-content:center;">${ICONS.clapper}</div>`}
          <div>
            <div class="wl-suggest-title">${m.title}</div>
            <div class="wl-suggest-year">${year}</div>
          </div>`;
        el.addEventListener('click', () => {
          wlSuggestEl.style.display = 'none';
          wlInput.value = '';
          addToWatchlistFromTMDb(m, year);
        });
        wlSuggestEl.appendChild(el);
      });
    } catch {
      wlSuggestEl.style.display = 'none';
      showToast('Recherche indisponible, vérifie ta connexion.');
    }
  }, 280);
});

document.addEventListener('click', e => {
  if (!wlInput.contains(e.target) && !wlSuggestEl.contains(e.target)) {
    wlSuggestEl.style.display = 'none';
  }
});

document.getElementById('watchlist-add-btn').addEventListener('click', () => {
  const val = wlInput.value.trim();
  if (!val) return;
  wlSuggestEl.style.display = 'none';
  const list = loadWatchlist();
  const key = val.toLowerCase();
  if (list.find(i => i.title.toLowerCase() === key)) { showToast('Déjà dans la liste.'); wlInput.value = ''; return; }
  list.unshift({ title: val, year: '', poster: '', genre: '', tmdbId: null, addedAt: new Date().toISOString() });
  saveWatchlist(list);
  window._justSavedWatchlistTitle = val.toLowerCase();
  renderWatchlist();
  showToast(`"${val}" ajouté à la liste 🎯`);
  wlInput.value = '';
});

wlInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') { wlSuggestEl.style.display = 'none'; }
});

// Tap sur un film de la watchlist (hors boutons noter/retirer) : ouvre sa fiche détaillée.
document.getElementById('watchlist-list').addEventListener('click', e => {
  if (e.target.closest('#empty-state-watchlist-cta')) {
    if (window.innerWidth <= 860) switchMobileNav('discover');
    else switchRightTab('discover');
    return;
  }
  const card = e.target.closest('.wl-card');
  if (!card || e.target.closest('.wl-btn')) return;
  const idx = parseInt(card.id.replace('wl-item-', ''), 10);
  const list = loadWatchlist();
  const item = list[idx];
  if (item) openMovieDetailSheet(item.tmdbId);
});

// ─── Sélecteur de listes (onglets) ───────────────────────────────────────────
function renderWatchlistTabs() {
  const meta = loadWatchlistsMeta();
  const activeId = getActiveWatchlistId();
  const activeMeta = meta.find(l => l.id === activeId) || meta[0];
  const nameEl = document.getElementById('watchlist-active-name');
  if (nameEl) nameEl.textContent = activeMeta ? activeMeta.name : 'À voir';

  const row = document.getElementById('wl-lists-row');
  if (!row) return;
  row.innerHTML = meta.map(l =>
    `<button type="button" class="wl-list-pill${l.id === activeId ? ' active' : ''}" data-id="${l.id}">${l.name.replace(/</g, '&lt;')}</button>`
  ).join('') + `<button type="button" class="wl-list-pill wl-list-add" id="wl-list-add-btn">${ICONS.plus} Nouvelle liste</button>`;
}

function openWlListManageMenu(id) {
  const meta = loadWatchlistsMeta();
  const entry = meta.find(l => l.id === id);
  if (!entry) return;

  actionSheetTitleEl.textContent = entry.name;
  const actions = [
    { label: 'Renommer', icon: ICONS.edit, onClick: () => openWlListModal('rename', id) },
    {
      label: 'Supprimer cette liste', icon: ICONS.trash, danger: true,
      onClick: () => {
        if (loadWatchlistsMeta().length <= 1) { showToast('Impossible de supprimer la dernière liste.'); return; }
        openModal('Supprimer la liste', `Supprimer "${entry.name}" et tous ses films ? Cette action est définitive.`, () => {
          deleteWatchlistList(id);
          renderWatchlistTabs();
          renderWatchlist();
          showToast('Liste supprimée.');
        }, true);
      },
    },
  ];

  actionSheetListEl.innerHTML = '';
  actions.forEach(({ label, icon, onClick, danger }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'action-sheet-item' + (danger ? ' danger' : '');
    btn.innerHTML = `${icon} <span>${label}</span>`;
    btn.addEventListener('click', () => { closeActionSheet(); onClick(); });
    actionSheetListEl.appendChild(btn);
  });

  lastFocusedBeforeModal = document.activeElement;
  actionSheetEl.classList.add('open');
}

let wlModalMode = 'create';
let wlModalTargetId = null;

function openWlListModal(mode, targetId = null) {
  wlModalMode = mode;
  wlModalTargetId = targetId;
  document.getElementById('wl-list-modal-title').textContent = mode === 'create' ? 'Nouvelle liste' : 'Renommer la liste';
  document.getElementById('wl-list-modal-confirm').textContent = mode === 'create' ? 'Créer' : 'Renommer';
  const input = document.getElementById('wl-list-name-input');
  input.value = mode === 'rename' ? (loadWatchlistsMeta().find(l => l.id === targetId)?.name || '') : '';
  lastFocusedBeforeModal = document.activeElement;
  document.getElementById('wl-list-modal').classList.add('open');
  setTimeout(() => input.focus(), 50);
}

document.getElementById('wl-lists-row').addEventListener('click', (e) => {
  if (e.target.closest('#wl-list-add-btn')) { openWlListModal('create'); return; }
  const pill = e.target.closest('.wl-list-pill');
  if (!pill) return;
  const id = pill.dataset.id;
  if (id === getActiveWatchlistId()) {
    openWlListManageMenu(id); // déjà active : un tap dessus propose de la gérer
  } else {
    setActiveWatchlistId(id);
    renderWatchlistTabs();
    renderWatchlist();
  }
});

document.getElementById('wl-list-modal-confirm').addEventListener('click', () => {
  const name = document.getElementById('wl-list-name-input').value.trim();
  if (!name) { showToast('Donne un nom à la liste.'); return; }
  if (wlModalMode === 'create') {
    const id = createWatchlistList(name);
    setActiveWatchlistId(id);
    showToast(`Liste "${name}" créée.`);
  } else {
    renameWatchlistList(wlModalTargetId, name);
    showToast('Liste renommée.');
  }
  closeModal(document.getElementById('wl-list-modal'));
  renderWatchlistTabs();
  renderWatchlist();
});
document.getElementById('wl-list-modal-cancel').addEventListener('click', () => {
  closeModal(document.getElementById('wl-list-modal'));
});

renderWatchlistTabs();
renderWatchlist();

// ═══════════════════════════════════════════
//  MODAL DE CONFIRMATION
// ═══════════════════════════════════════════

// Mémorise l'élément qui avait le focus avant l'ouverture d'une modale, pour lui
// rendre le focus à la fermeture (bonne pratique d'accessibilité au clavier).
let lastFocusedBeforeModal = null;

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter(el => !el.disabled && el.offsetParent !== null);
}

// Piège le focus (Tab / Shift+Tab) à l'intérieur d'une modale ouverte, pour ne
// pas laisser un utilisateur au clavier "sortir" vers le contenu masqué derrière.
function trapFocus(e) {
  const openModalEl = document.querySelector('.modal-overlay.open');
  if (!openModalEl || e.key !== 'Tab') return;
  const focusable = getFocusableElements(openModalEl);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function closeModal(modalEl) {
  modalEl.classList.remove('open');
  if (modalEl.id === 'modal') pendingAction = null;
  if (lastFocusedBeforeModal) {
    lastFocusedBeforeModal.focus();
    lastFocusedBeforeModal = null;
  }
}

function openModal(title, body, onConfirm, danger = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = body;
  const confirmBtn = document.getElementById('modal-confirm');
  confirmBtn.className = 'modal-btn ' + (danger ? 'danger' : 'primary');
  confirmBtn.textContent = danger ? 'Supprimer' : 'Confirmer';
  pendingAction = onConfirm;
  lastFocusedBeforeModal = document.activeElement;
  document.getElementById('modal').classList.add('open');
  // Focus sur "Annuler" par défaut : plus sûr pour une action destructive
  // (Entrée pressée par réflexe n'active pas la suppression).
  document.getElementById('modal-cancel').focus();
}

document.getElementById('modal-confirm').addEventListener('click', () => {
  if (pendingAction) { pendingAction(); pendingAction = null; }
  closeModal(document.getElementById('modal'));
});
document.getElementById('modal-cancel').addEventListener('click', () => {
  closeModal(document.getElementById('modal'));
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal);
  });
});

// Échap ferme la modale actuellement ouverte, où que soit le focus.
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const openModalEl = document.querySelector('.modal-overlay.open');
    if (openModalEl) closeModal(openModalEl);
  } else if (e.key === 'Tab') {
    trapFocus(e);
  }
});

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
updateWeightBadges();
calculateScore();
updateAllSliders();
renderCriteriaAverageMarkers();

// ─── Écran de démarrage (splash) ─────────────────────────────────────────────
// Masqué une fois l'app initialisée, avec une durée minimale d'affichage pour
// que ce soit perçu comme un vrai temps de chargement plutôt qu'un flash
// imperceptible (notamment quand tout est déjà en cache et charge quasi
// instantanément).
(function hideSplash() {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  const MIN_DISPLAY_MS = 1200;
  const elapsed = performance.now();
  const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500); // laisse le temps au fondu de finir avant de retirer le nœud
  }, remaining);
})();

// ═══════════════════════════════════════════
//  SYNCHRONISATION CLOUD (Supabase, via /api/sync)
// ═══════════════════════════════════════════
//
// Principe : un "code de synchronisation" choisi par l'utilisateur (pas de vrai
// compte) identifie ses données côté serveur. Le même code utilisé sur un autre
// appareil permet de récupérer historique + TOUTES les watchlists + réglages.
//
// FUSION (et non écrasement) : à chaque synchronisation (push ou pull), les
// données locales et celles du cloud sont FUSIONNÉES plutôt que remplacées :
// - Historique : par titre. Si un film a été noté sur les deux appareils, on
//   garde la version la plus récente (`updatedAt`). Si un film n'existe que
//   d'un côté, il est conservé (union).
// - Watchlists : chaque LISTE (id + nom) est fusionnée par id (union), puis le
//   CONTENU de chaque liste est fusionné par tmdbId (ou titre), comme avant.
// - Suppressions : chaque suppression (film d'historique, film d'une
//   watchlist, OU une watchlist entière) laisse une "tombstone" (trace
//   horodatée) synchronisée elle aussi, pour qu'une suppression sur un
//   appareil ne soit pas annulée par une synchro depuis un autre appareil qui
//   avait encore l'ancienne version.
//
// - Sauvegarde (push) : fusionne avec le cloud puis pousse le résultat, en
//   automatique en arrière-plan toutes les 45s si un changement local est
//   détecté, + un bouton manuel pour forcer.
// - Restauration (pull) : fusionne le cloud dans les données locales. N'écrase
//   plus rien de destructeur (grâce à la fusion), donc pas besoin de modale de
//   confirmation bloquante.

const SYNC_CODE_KEY = 'lbx_sync_code';
const SYNC_LAST_HASH_KEY = 'lbx_sync_last_hash';
const SYNC_LAST_TIME_KEY = 'lbx_sync_last_time';
const HISTORY_TOMBSTONES_KEY = 'lbx_history_tombstones';
// TOMBSTONE_MAX_AGE_MS est défini dans 03b-pure-logic.js (utilisé par mergeTombstoneLists)
// watchlistTombstonesKey(id) et WATCHLIST_LIST_TOMBSTONES_KEY sont définis dans 08-watchlist.js

const syncCodeInput = document.getElementById('setting-sync-code');
const syncSaveBtn = document.getElementById('sync-save-btn');
const syncRestoreBtn = document.getElementById('sync-restore-btn');
const syncStatusEl = document.getElementById('sync-status');

function getSyncCode() {
  return (localStorage.getItem(SYNC_CODE_KEY) || '').trim();
}

function setSyncCode(code) {
  localStorage.setItem(SYNC_CODE_KEY, code.trim());
}

function setSyncStatus(msg, isError = false) {
  syncStatusEl.textContent = msg;
  syncStatusEl.style.color = isError ? '#ff4040' : 'var(--text-mid)';
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── Tombstones (traces de suppression) ─────────────────────────────────────

function loadTombstones(storageKey) {
  try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch { return []; }
}

function saveTombstones(storageKey, list) {
  localStorage.setItem(storageKey, JSON.stringify(list));
}

function recordTombstone(storageKey, key) {
  const list = loadTombstones(storageKey);
  const now = new Date().toISOString();
  const idx = list.findIndex(t => t.key === key);
  if (idx >= 0) list[idx].deletedAt = now;
  else list.push({ key, deletedAt: now });
  saveTombstones(storageKey, list);
}

function removeTombstone(storageKey, key) {
  saveTombstones(storageKey, loadTombstones(storageKey).filter(t => t.key !== key));
}

// mergeTombstoneLists, historyItemKey, watchlistItemKey, mergeHistory et
// mergeWatchlist vivent maintenant dans 03b-pure-logic.js (logique pure,
// testable automatiquement sans DOM — voir tests/merge-logic.test.js).

// ─── Cœur de la synchro : fusionne l'état local avec un payload cloud ───────
// Sauvegarde le résultat en local (render inclus) et le retourne, prêt à être
// ré-uploadé si besoin (c'est ce que fait pushToCloud).
function mergeWithRemote(remotePayload) {
  const localHistory = loadHistory();
  const localHistTomb = loadTombstones(HISTORY_TOMBSTONES_KEY);
  const remoteHistory = Array.isArray(remotePayload?.history) ? remotePayload.history : [];
  const remoteHistTomb = Array.isArray(remotePayload?.historyTombstones) ? remotePayload.historyTombstones : [];
  const mergedHistTomb = mergeTombstoneLists(localHistTomb, remoteHistTomb);
  const mergedHistory = mergeHistory(localHistory, remoteHistory, mergedHistTomb);
  saveHistory(mergedHistory);
  saveTombstones(HISTORY_TOMBSTONES_KEY, mergedHistTomb);

  // ─── Watchlists : fusion des LISTES elles-mêmes, puis du contenu de chacune ──
  const localMeta = loadWatchlistsMeta();
  const remoteMeta = Array.isArray(remotePayload?.watchlistsMeta) ? remotePayload.watchlistsMeta : [];
  const localListTomb = loadTombstones(WATCHLIST_LIST_TOMBSTONES_KEY);
  const remoteListTomb = Array.isArray(remotePayload?.watchlistListTombstones) ? remotePayload.watchlistListTombstones : [];
  const mergedListTomb = mergeTombstoneLists(localListTomb, remoteListTomb);
  saveTombstones(WATCHLIST_LIST_TOMBSTONES_KEY, mergedListTomb);
  const deletedListIds = new Set(mergedListTomb.map(t => t.key));

  // Union par id (le nom local l'emporte en cas de conflit sur le même id),
  // en excluant les listes supprimées sur l'un ou l'autre appareil.
  const metaById = {};
  remoteMeta.forEach(l => { if (l && l.id) metaById[l.id] = { id: l.id, name: l.name }; });
  localMeta.forEach(l => { if (l && l.id) metaById[l.id] = { id: l.id, name: l.name }; });
  let mergedMeta = Object.values(metaById).filter(l => !deletedListIds.has(l.id));
  if (mergedMeta.length === 0) mergedMeta = [{ id: 'default', name: 'À voir' }]; // garde-fou : jamais 0 liste

  const activeId = getActiveWatchlistId(); // lu avant de sauvegarder la meta, au cas où la liste active aurait été supprimée ailleurs
  saveWatchlistsMeta(mergedMeta);
  if (!mergedMeta.find(l => l.id === activeId)) setActiveWatchlistId(mergedMeta[0].id);

  const remoteWatchlists = remotePayload?.watchlists && typeof remotePayload.watchlists === 'object' ? remotePayload.watchlists : {};
  const remoteWlTombs = remotePayload?.watchlistTombstones && typeof remotePayload.watchlistTombstones === 'object' ? remotePayload.watchlistTombstones : {};

  const mergedWatchlists = {};
  const mergedWlTombs = {};
  mergedMeta.forEach(({ id }) => {
    let localItems = [];
    try { localItems = JSON.parse(localStorage.getItem(watchlistStorageKey(id))) || []; } catch {}
    const remoteItems = Array.isArray(remoteWatchlists[id]) ? remoteWatchlists[id] : [];
    const localItemTomb = loadTombstones(watchlistTombstonesKey(id));
    const remoteItemTomb = Array.isArray(remoteWlTombs[id]) ? remoteWlTombs[id] : [];
    const mergedItemTomb = mergeTombstoneLists(localItemTomb, remoteItemTomb);
    const mergedItems = mergeWatchlist(localItems, remoteItems, mergedItemTomb);

    localStorage.setItem(watchlistStorageKey(id), JSON.stringify(mergedItems));
    saveTombstones(watchlistTombstonesKey(id), mergedItemTomb);
    mergedWatchlists[id] = mergedItems;
    mergedWlTombs[id] = mergedItemTomb;
  });

  // Réglages : pas vraiment "fusionnables" (un thème ou une préférence n'est pas
  // un tableau), on garde ceux du cloud seulement s'ils sont fournis et qu'on
  // n'en a pas localement, pour ne pas écraser un choix local sans raison.
  const localSettings = JSON.parse(localStorage.getItem('lbx_settings') || 'null');
  const settings = localSettings || remotePayload?.settings || null;
  if (remotePayload?.settings && !localSettings) {
    localStorage.setItem('lbx_settings', JSON.stringify(remotePayload.settings));
  }
  applySettings(settings || {});

  renderAll();
  if (typeof renderWatchlistTabs === 'function') renderWatchlistTabs();
  renderWatchlist();

  return {
    history: mergedHistory,
    historyTombstones: mergedHistTomb,
    watchlistsMeta: mergedMeta,
    watchlists: mergedWatchlists,
    watchlistTombstones: mergedWlTombs,
    watchlistListTombstones: mergedListTomb,
    settings,
  };
}

// Hash simple (non cryptographique), juste pour détecter un changement de contenu
// sans avoir à ré-uploader à chaque tick si rien n'a bougé localement.
function hashPayload(payload) {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function currentLocalSnapshot() {
  const meta = loadWatchlistsMeta();
  const watchlists = {};
  const watchlistTombstones = {};
  meta.forEach(({ id }) => {
    try { watchlists[id] = JSON.parse(localStorage.getItem(watchlistStorageKey(id))) || []; } catch { watchlists[id] = []; }
    watchlistTombstones[id] = loadTombstones(watchlistTombstonesKey(id));
  });
  return {
    history: loadHistory(),
    historyTombstones: loadTombstones(HISTORY_TOMBSTONES_KEY),
    watchlistsMeta: meta,
    watchlists,
    watchlistTombstones,
    watchlistListTombstones: loadTombstones(WATCHLIST_LIST_TOMBSTONES_KEY),
  };
}

async function fetchCloudPayload(code) {
  const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'bad status');
  return data.found ? data.payload : null;
}

// Sauvegarde : récupère le cloud, fusionne avec le local, sauvegarde le résultat
// localement, puis pousse la version fusionnée vers le cloud.
async function pushToCloud(silent = false) {
  const code = getSyncCode();
  if (!code) {
    if (!silent) setSyncStatus('Renseigne un code de synchronisation avant de sauvegarder.', true);
    return false;
  }
  if (!silent) setSyncStatus('Synchronisation en cours…');
  try {
    const remotePayload = await fetchCloudPayload(code);
    const merged = mergeWithRemote(remotePayload);

    const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    if (!res.ok) throw new Error('bad status');

    const now = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_HASH_KEY, hashPayload(currentLocalSnapshot()));
    localStorage.setItem(SYNC_LAST_TIME_KEY, now);
    if (!silent) setSyncStatus(`Synchronisé ✓ (${formatDateTime(now)})`);
    return true;
  } catch {
    if (!silent) setSyncStatus('Échec de la synchronisation. Vérifie ta connexion.', true);
    return false;
  }
}

// Restauration : fusionne le cloud dans le local, SANS repousser vers le cloud.
// Non destructeur grâce à la fusion (un film local non encore synchronisé n'est
// jamais perdu), donc pas besoin de modale de confirmation bloquante.
async function pullFromCloud() {
  const code = getSyncCode();
  if (!code) {
    setSyncStatus('Renseigne un code de synchronisation avant de restaurer.', true);
    return;
  }
  setSyncStatus('Récupération depuis le cloud…');
  try {
    const remotePayload = await fetchCloudPayload(code);
    if (!remotePayload) {
      setSyncStatus('Aucune sauvegarde trouvée pour ce code.', true);
      return;
    }
    mergeWithRemote(remotePayload);
    const now = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_HASH_KEY, hashPayload(currentLocalSnapshot()));
    localStorage.setItem(SYNC_LAST_TIME_KEY, now);
    setSyncStatus(`Synchronisé depuis le cloud ✓ (${formatDateTime(now)})`);
    showToast('Données synchronisées depuis le cloud.');
  } catch {
    setSyncStatus('Échec de la récupération cloud. Vérifie ta connexion.', true);
  }
}

// Pré-remplit le champ code + affiche le statut à chaque ouverture de la modale réglages
document.getElementById('settings-btn').addEventListener('click', () => {
  syncCodeInput.value = getSyncCode();
  const lastTime = localStorage.getItem(SYNC_LAST_TIME_KEY);
  setSyncStatus(lastTime ? `Dernière synchronisation : ${formatDateTime(lastTime)}` : '');
});

syncCodeInput.addEventListener('change', () => setSyncCode(syncCodeInput.value));

syncSaveBtn.addEventListener('click', () => {
  setSyncCode(syncCodeInput.value);
  pushToCloud(false);
});

syncRestoreBtn.addEventListener('click', () => {
  setSyncCode(syncCodeInput.value);
  pullFromCloud();
});

// Auto-synchronisation silencieuse : toutes les 45s, si un code est renseigné et
// que les données locales ont changé depuis la dernière synchro, on fusionne et
// on pousse vers le cloud. Pas besoin d'y penser après chaque note ou ajout à
// la watchlist — et comme c'est une fusion, ça ne perd jamais rien.
setInterval(() => {
  const code = getSyncCode();
  if (!code) return;
  const currentHash = hashPayload(currentLocalSnapshot());
  if (currentHash !== localStorage.getItem(SYNC_LAST_HASH_KEY)) {
    pushToCloud(true);
  }
}, 45000);

// ═══════════════════════════════════════════
//  DÉCOUVRIR : suggestions façon "swipe" (glisser à droite = watchlist, à gauche = passer)
// ═══════════════════════════════════════════
//
// Remplace l'ancien carrousel horizontal : au lieu de montrer 10 petites
// affiches à la fois, on présente une suggestion à la fois, en grand, avec
// un geste de swipe (comme Tinder) pour l'ajouter à la watchlist ou la passer.
//
// Les films "passés" sont mémorisés localement (lbx_discover_passed) pour ne
// plus les reproposer. Cette liste n'est pour l'instant PAS synchronisée dans
// le cloud (contrairement à l'historique/watchlist) : un film passé sur un
// appareil peut donc réapparaître sur un autre. C'est un choix délibéré pour
// garder cette fonctionnalité simple ; à revoir si besoin plus tard.

const DISCOVER_PASSED_KEY = 'lbx_discover_passed';
const DISCOVER_PASSED_MAX = 500; // évite que la liste grossisse indéfiniment
const DISCOVER_SWIPE_THRESHOLD = 100; // px

function loadDiscoverPassed() {
  try { return JSON.parse(localStorage.getItem(DISCOVER_PASSED_KEY)) || []; } catch { return []; }
}
function markDiscoverPassed(tmdbId) {
  const list = loadDiscoverPassed();
  const idStr = String(tmdbId);
  if (!list.includes(idStr)) list.push(idStr);
  localStorage.setItem(DISCOVER_PASSED_KEY, JSON.stringify(list.slice(-DISCOVER_PASSED_MAX)));
}

// Films déjà utilisés récemment comme BASE de recommandation (pas les
// suggestions elles-mêmes, les films de l'historique dont on est parti) —
// permet de tourner à travers l'historique plutôt que retomber sur les mêmes
// 2-3 films à chaque rechargement, pour des suggestions qui se diversifient
// au fur et à mesure que l'historique s'enrichit.
const DISCOVER_BASIS_USED_KEY = 'lbx_discover_basis_used';
function loadBasisUsed() {
  try { return JSON.parse(localStorage.getItem(DISCOVER_BASIS_USED_KEY)) || []; } catch { return []; }
}
function markBasisUsed(tmdbIds) {
  const used = loadBasisUsed();
  used.push(...tmdbIds.map(String));
  localStorage.setItem(DISCOVER_BASIS_USED_KEY, JSON.stringify(used.slice(-30)));
}

// Choisit `count` films de l'historique pour servir de base aux
// recommandations : privilégie les films PAS récemment utilisés (rotation),
// et répartit sur des genres différents quand c'est possible plutôt que de
// piocher au hasard dans tout le pool (qui sur-représenterait le genre le
// plus souvent noté). Basé sur TOUS les films vus, pas seulement les mieux
// notés — même un film moyen renseigne sur les goûts (genre, casting...).
function pickDiverseBasisFilms(pool, count) {
  const used = new Set(loadBasisUsed());
  const fresh = pool.filter(f => !used.has(String(f.tmdbId)));
  const candidates = fresh.length >= count ? fresh : pool; // pas assez de films "frais" : retombe sur tout le pool

  const byGenre = {};
  candidates.forEach(f => {
    const primaryGenre = (f.genre || '').split(',')[0].trim() || 'Autre';
    (byGenre[primaryGenre] = byGenre[primaryGenre] || []).push(f);
  });

  const genres = Object.keys(byGenre).sort(() => 0.5 - Math.random());
  const picked = [];
  for (const g of genres) {
    if (picked.length >= count) break;
    const arr = byGenre[g];
    picked.push(arr[Math.floor(Math.random() * arr.length)]);
  }
  // Moins de genres distincts que `count` : complète au hasard dans le reste.
  const remaining = candidates.filter(f => !picked.includes(f));
  while (picked.length < count && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    picked.push(remaining.splice(idx, 1)[0]);
  }
  return picked;
}

let discoverQueue = [];
let discoverLoaded = false; // évite de re-fetch à chaque fois qu'on rouvre l'onglet

const discoverStack = document.getElementById('discover-stack');
const discoverActionsEl = document.getElementById('discover-actions');
const discoverReloadBtn = document.getElementById('discover-reload-btn');
const discoverPassBtn = document.getElementById('discover-pass-btn');
const discoverLikeBtn = document.getElementById('discover-like-btn');

// Enveloppe fine autour de la vraie logique de chargement : démarre la
// rotation de l'icône ↻ avant, l'arrête après — via try/finally, pour être sûr
// qu'elle s'arrête quel que soit le chemin de sortie de la fonction (plusieurs
// "return" précoces existent selon les cas : aucun film 8+/10, aucun avec
// fiche TMDb, etc.).
async function loadDiscoverQueue() {
  discoverReloadBtn.classList.add('spinning');
  try {
    await loadDiscoverQueueInner();
  } finally {
    discoverReloadBtn.classList.remove('spinning');
  }
}

async function loadDiscoverQueueInner() {
  discoverActionsEl.style.display = 'none';
  discoverStack.innerHTML = '<div class="discover-loading">⏳ Recherche de suggestions basées sur tes goûts...</div>';

  const history = loadHistory();
  const watchlist = loadWatchlist();
  const watchedWithId = history.filter(h => h.tmdbId);

  if (watchedWithId.length === 0) {
    discoverStack.innerHTML = '<div class="discover-empty">Note au moins un film (n\'importe quelle note) pour débloquer des suggestions personnalisées ici.</div>';
    return;
  }

  const shuffledTop = pickDiverseBasisFilms(watchedWithId, 3);
  markBasisUsed(shuffledTop.map(f => f.tmdbId));
  const seenIds = new Set(history.map(h => String(h.tmdbId)).filter(Boolean));
  const watchlistIds = new Set(watchlist.map(w => String(w.tmdbId)).filter(Boolean));
  const passedIds = new Set(loadDiscoverPassed());

  let allRecs = [];
  // Les 3 requêtes sont indépendantes : en parallèle (Promise.all) plutôt que
  // l'une après l'autre, le temps d'attente total tombe à celui de la plus
  // lente des trois au lieu de la somme des trois — l'onglet Découvrir
  // s'affiche nettement plus vite.
  const results = await Promise.allSettled(
    shuffledTop.map(film => fetch(`/api/search?id=${film.tmdbId}&recommendations=true`).then(res => res.json()))
  );
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      const moviesArray = data.results || (Array.isArray(data) ? data : null);
      if (moviesArray) allRecs.push(...moviesArray);
    } else {
      console.warn("Impossible de charger les suggestions pour l'ID " + shuffledTop[i].tmdbId, result.reason);
    }
  });

  const uniqueRecs = [];
  const addedIds = new Set();
  allRecs.forEach(m => {
    if (!m || !m.id) return;
    const idStr = String(m.id);
    if (!addedIds.has(idStr) && !seenIds.has(idStr) && !watchlistIds.has(idStr) && !passedIds.has(idStr)) {
      addedIds.add(idStr);
      uniqueRecs.push(m);
    }
  });

  discoverQueue = uniqueRecs.slice(0, 15);
  discoverLoaded = true;
  renderDiscoverStack();
}

function renderDiscoverStack() {
  discoverStack.innerHTML = '';

  if (discoverQueue.length === 0) {
    discoverActionsEl.style.display = 'none';
    discoverStack.innerHTML = '<div class="discover-empty">Tu as tout vu ! 🎉<br>Reviens plus tard ou appuie sur ↻ pour de nouvelles suggestions.</div>';
    return;
  }

  discoverActionsEl.style.display = 'flex';

  // Aperçu de la carte suivante, en arrière-plan (purement visuel, non interactive)
  if (discoverQueue[1]) {
    discoverStack.appendChild(buildDiscoverCardEl(discoverQueue[1], false));
  }
  // Carte active, au premier plan
  const topCard = buildDiscoverCardEl(discoverQueue[0], true);
  discoverStack.appendChild(topCard);
  attachSwipeHandlers(topCard, discoverQueue[0]);
}

function buildDiscoverCardEl(m, isTop) {
  const year = m.release_date?.slice(0, 4) || '????';
  const rating = m.vote_average ? m.vote_average.toFixed(1) : null;
  const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '';
  let overview = m.overview ? m.overview : 'Pas de synopsis disponible.';
  if (overview.length > 160) overview = overview.slice(0, 160) + '…';

  const el = document.createElement('div');
  el.className = 'discover-card ' + (isTop ? 'top' : 'behind');
  el.innerHTML = `
    <div class="discover-card-poster-wrap">
      ${posterUrl
        ? `<img class="discover-card-poster" src="${posterUrl}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">`
        : `<div class="discover-card-poster-ph">${ICONS.clapper}</div>`}
      ${isTop ? `<div class="discover-stamp like">Watchlist</div><div class="discover-stamp pass">Passer</div>` : ''}
    </div>
    <div class="discover-card-info">
      <div class="discover-card-title">${escAttr(m.title)}</div>
      <div class="discover-card-meta">${year}${rating ? ' · ⭐ ' + rating + '/10' : ''}</div>
      <div class="discover-card-overview">${escAttr(overview)}</div>
    </div>
  `;
  if (isTop) {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', `Suggestion : ${m.title}. Flèche droite pour ajouter à la watchlist, flèche gauche pour passer.`);
  }
  applyPosterAccent(posterUrl, el);
  return el;
}

// Résout un swipe/clic/touche : retire le film de la file, exécute l'action,
// puis réaffiche la pile avec la carte suivante.
function resolveDiscoverSwipe(direction) {
  const movie = discoverQueue.shift();
  if (!movie) return;

  if (direction === 'like') {
    const year = movie.release_date?.slice(0, 4) || '????';
    addToWatchlistFromTMDb(movie, year);
    if (navigator.vibrate) navigator.vibrate(20);
  } else {
    markDiscoverPassed(movie.id);
    if (navigator.vibrate) navigator.vibrate(15);
  }
  hapticPulse(discoverStack, 'medium');
  renderDiscoverStack();
}

function attachSwipeHandlers(cardEl, movie) {
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
  const TAP_MAX_MOVE = 6; // en dessous de ce seuil de mouvement, on considère que c'est un tap, pas un swipe
  const stampLike = cardEl.querySelector('.discover-stamp.like');
  const stampPass = cardEl.querySelector('.discover-stamp.pass');

  function onStart(clientX, clientY) {
    startX = clientX; startY = clientY; dx = 0; dy = 0; dragging = true;
    cardEl.classList.add('dragging');
    cardEl.classList.remove('snap-back', 'flying');
  }
  function onMove(clientX, clientY) {
    if (!dragging) return;
    dx = clientX - startX;
    dy = clientY - startY;
    cardEl.style.transform = `translate(${dx}px, ${dy * 0.4}px) rotate(${dx / 18}deg)`;
    const progress = Math.min(1, Math.abs(dx) / DISCOVER_SWIPE_THRESHOLD);
    if (dx > 0) { stampLike.style.opacity = progress; stampPass.style.opacity = 0; }
    else if (dx < 0) { stampPass.style.opacity = progress; stampLike.style.opacity = 0; }
  }
  function onEnd() {
    if (!dragging) return;
    dragging = false;
    cardEl.classList.remove('dragging');

    if (Math.abs(dx) > DISCOVER_SWIPE_THRESHOLD) {
      const direction = dx > 0 ? 'like' : 'pass';
      cardEl.classList.add('flying');
      cardEl.style.transform = `translate(${dx > 0 ? 900 : -900}px, ${dy * 0.4}px) rotate(${dx / 10}deg)`;
      cardEl.style.opacity = '0';
      setTimeout(() => resolveDiscoverSwipe(direction), 280);
    } else if (Math.abs(dx) < TAP_MAX_MOVE && Math.abs(dy) < TAP_MAX_MOVE) {
      // Tap (quasi aucun mouvement) : ouvre la fiche détaillée du film plutôt
      // que de traiter ça comme un swipe avorté.
      cardEl.style.transform = '';
      stampLike.style.opacity = 0;
      stampPass.style.opacity = 0;
      if (movie) openMovieDetailSheet(movie.id);
    } else {
      cardEl.classList.add('snap-back');
      cardEl.style.transform = '';
      stampLike.style.opacity = 0;
      stampPass.style.opacity = 0;
    }
  }

  cardEl.addEventListener('touchstart', e => {
    e.stopPropagation(); // évite que le geste remonte jusqu'au swipe de changement d'onglet (01-navigation.js)
    e.preventDefault(); // renfort : touch-action:none (CSS) suffit en théorie, mais certaines versions de
                         // Safari/PWA en mode "installé" l'appliquent de façon incohérente — d'où le décalage
                         // d'affichage rapporté pendant le swipe. preventDefault() est la garantie la plus sûre.
    onStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  cardEl.addEventListener('touchmove', e => {
    e.stopPropagation();
    e.preventDefault();
    onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  cardEl.addEventListener('touchend', e => {
    e.stopPropagation();
    onEnd();
  });

  // Souris (pratique pour tester sur desktop / vercel dev)
  cardEl.addEventListener('mousedown', e => {
    e.preventDefault();
    onStart(e.clientX, e.clientY);
    const moveHandler = ev => onMove(ev.clientX, ev.clientY);
    const upHandler = () => {
      onEnd();
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  });

  // Clavier : accessibilité pour qui n'utilise pas le tactile/la souris
  cardEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); resolveDiscoverSwipe('like'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); resolveDiscoverSwipe('pass'); }
  });
}

discoverPassBtn.addEventListener('click', () => resolveDiscoverSwipe('pass'));
discoverLikeBtn.addEventListener('click', () => resolveDiscoverSwipe('like'));
discoverReloadBtn.addEventListener('click', () => loadDiscoverQueue());

// ═══════════════════════════════════════════
//  FICHE FILM DÉTAILLÉE
// ═══════════════════════════════════════════
// Ouverte au tap sur un film (historique, watchlist, découvrir). Récupère la
// fiche complète TMDb (synopsis, budget, box-office, équipe...) à la demande,
// via le même endpoint /api/search?id=X déjà utilisé ailleurs (mis en cache
// côté CDN, voir api/search.js). Si le film n'a pas de tmdbId (ajouté en
// saisie manuelle), affiche un message clair plutôt que d'échouer.

const mdsEl = document.getElementById('movie-detail-sheet');
const mdsContentEl = document.getElementById('mds-content');
const mdsCloseBtn = document.getElementById('mds-close-btn');

function formatMoney(amount) {
  if (!amount || amount <= 0) return 'Non communiqué';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function buildMdsSkeleton() {
  return `
    <div class="mds-skeleton">
      <div class="mds-skeleton-poster skeleton-bg"></div>
      <div class="mds-skeleton-lines">
        <div class="skeleton-text long skeleton-bg" style="height:18px;"></div>
        <div class="skeleton-text short skeleton-bg"></div>
      </div>
    </div>
    <div class="skeleton-text long skeleton-bg" style="margin-top:18px;"></div>
    <div class="skeleton-text long skeleton-bg"></div>
    <div class="skeleton-text short skeleton-bg"></div>
  `;
}

// Chaque section reçoit un léger délai croissant (voir CSS .mds-section) pour
// apparaître en cascade plutôt que d'un bloc — plus agréable à l'œil qu'un
// simple remplacement de contenu.
function buildMdsContent(data, localMatch) {
  const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : '';
  const year = data.release_date ? data.release_date.slice(0, 4) : '';
  const runtime = data.runtime ? `${data.runtime} min` : '';
  const genres = (data.genres || []).map(g => g.name).join(', ');
  const director = data.credits?.crew?.find(c => c.job === 'Director')?.name || '';
  const cast = (data.credits?.cast || []).slice(0, 5).map(c => c.name).join(', ');
  const releaseDateStr = data.release_date
    ? new Date(data.release_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Inconnue';

  let personalHtml = '';
  if (localMatch) {
    const critBreakdown = buildCriteriaBreakdown(localMatch);
    personalHtml = `
      <div class="mds-section mds-personal" style="animation-delay:.05s">
        <div class="mds-section-title">Ta note</div>
        <div class="mds-personal-score">${localMatch.score}/10 <span class="mds-personal-stars">${localMatch.stars || ''}</span>${localMatch.liked ? ` <span class="liked-badge">${ICONS.heart}</span>` : ''}</div>
        ${localMatch.review ? `<div class="mds-personal-review">« ${escAttr(localMatch.review)} »</div>` : ''}
      </div>
      ${critBreakdown}
    `;
  }

  return `
    <div class="mds-header" style="animation-delay:0s">
      ${posterUrl
        ? `<img class="mds-poster" src="${posterUrl}" alt="Affiche de ${escAttr(data.title)}" loading="lazy">`
        : `<div class="mds-poster mds-poster-ph">${ICONS.clapper}</div>`}
      <div class="mds-header-info">
        <div class="mds-title" id="mds-title">${data.title}</div>
        <div class="mds-meta">${[year, runtime, genres].filter(Boolean).join(' · ')}</div>
        ${data.vote_average ? `<div class="mds-tmdb-score">★ ${data.vote_average.toFixed(1)} TMDb</div>` : ''}
      </div>
    </div>

    ${personalHtml}

    ${data.overview ? `
      <div class="mds-section" style="animation-delay:.1s">
        <div class="mds-section-title">Synopsis</div>
        <div class="mds-overview">${escAttr(data.overview)}</div>
      </div>` : ''}

    <div class="mds-section" style="animation-delay:.15s">
      <div class="mds-section-title">Équipe</div>
      ${director ? `<div class="mds-row"><span class="mds-label">Réalisateur</span><span>${director}</span></div>` : ''}
      ${cast ? `<div class="mds-row"><span class="mds-label">Avec</span><span>${cast}</span></div>` : ''}
      ${!director && !cast ? `<div class="mds-row"><span class="mds-label">—</span><span>Non communiqué</span></div>` : ''}
    </div>

    <div class="mds-section" style="animation-delay:.2s">
      <div class="mds-section-title">Détails</div>
      <div class="mds-row"><span class="mds-label">Sortie</span><span>${releaseDateStr}</span></div>
      <div class="mds-row"><span class="mds-label">Budget</span><span>${formatMoney(data.budget)}</span></div>
      <div class="mds-row"><span class="mds-label">Box-office</span><span>${formatMoney(data.revenue)}</span></div>
    </div>
  `;
}

// Ventilation par critère (barres, pas un radar — déjà utilisé sur le
// dashboard, on veut ici quelque chose de plus direct à lire pour un seul
// film) : uniquement si le film a été noté en mode détaillé.
const MDS_CRITERIA_LABELS = {
  scenario: 'Scénario', realisation: 'Réalisation', photo: 'Photo',
  acteurs: 'Acteurs', ambiance: 'Ambiance', rythme: 'Rythme', affect: 'Affect',
};
function buildCriteriaBreakdown(localMatch) {
  if (localMatch.mode !== 'detail' || !localMatch.values) return '';

  const rows = CRITERIA.map((key, i) => {
    const val = parseFloat(localMatch.values[key]);
    if (isNaN(val)) return '';
    const pct = (val / 10) * 100;
    return `
      <div class="mds-crit-row" style="animation-delay:${0.05 * i}s">
        <span class="mds-crit-label">${MDS_CRITERIA_LABELS[key] || key}</span>
        <div class="mds-crit-track"><div class="mds-crit-fill" style="--mds-crit-pct:${pct}%"></div></div>
        <span class="mds-crit-value">${val.toFixed(1)}</span>
      </div>`;
  }).join('');

  return `
    <div class="mds-section mds-crit-breakdown" style="animation-delay:.08s">
      <div class="mds-section-title">Détail par critère</div>
      ${rows}
    </div>
  `;
}

async function openMovieDetailSheet(tmdbId) {
  if (!tmdbId) {
    showToast("Ce film n'a pas de fiche TMDb liée (ajouté en saisie manuelle).");
    return;
  }

  lastFocusedBeforeModal = document.activeElement;
  mdsContentEl.innerHTML = buildMdsSkeleton();
  mdsEl.classList.add('open');

  try {
    const res = await fetch(`/api/search?id=${tmdbId}`);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (!data || !data.title) throw new Error('no data');

    const history = loadHistory();
    const localMatch = history.find(h => String(h.tmdbId) === String(tmdbId));

    mdsContentEl.innerHTML = buildMdsContent(data, localMatch);
    const mdsPosterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : '';
    applyPosterAccent(mdsPosterUrl, mdsEl.querySelector('.mds-box'));
  } catch (e) {
    mdsContentEl.innerHTML = `<div class="mds-error">Impossible de charger les détails pour l'instant. Vérifie ta connexion et réessaie.</div>`;
  }
}

function closeMovieDetailSheet() {
  closeModal(mdsEl);
}

mdsCloseBtn.addEventListener('click', closeMovieDetailSheet);
mdsEl.addEventListener('click', (e) => { if (e.target === mdsEl) closeMovieDetailSheet(); });
