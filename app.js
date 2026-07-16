// ⚠️ FICHIER GÉNÉRÉ AUTOMATIQUEMENT — NE PAS ÉDITER DIRECTEMENT.
// Modifie les fichiers dans src/, puis lance `npm run build`.
// Assemblé depuis : 00-pwa.js, 00b-icons.js, 00c-poster-color.js, 01-navigation.js, 02-theme.js, 03-foundation.js, 03b-pure-logic.js, 04-search.js, 05-rating-form.js, 06-history.js, 07-data-io.js, 08-watchlist.js, 09-modal-init.js, 10-cloud-sync.js, 11-discover.js, 12-movie-detail.js, 13-duels.js

// ═══════════════════════════════════════════
//  PWA : enregistrement du service worker
// ═══════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Détecte une NOUVELLE version qui vient de s'installer (pas la toute
      // première installation — on ne veut prévenir que d'un vrai changement
      // de contenu par rapport à ce que l'utilisateur a déjà ouvert).
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const banner = document.getElementById('update-banner');
            if (banner) banner.classList.add('show');
          }
        });
      });
    }).catch(() => {
      // Échec silencieux : l'app reste 100% fonctionnelle sans service worker,
      // seul l'usage hors-ligne / l'installation ne sera pas dispo.
    });
  });
}

document.getElementById('update-banner-reload-btn')?.addEventListener('click', () => {
  window.location.reload();
});

// ── Indicateur hors-ligne ──
// L'app fonctionne largement sans réseau (historique, watchlist, duels,
// stats : tout est local) — seuls TMDb et le quiz en dépendent. Un badge
// discret l'indique plutôt que de laisser les recherches échouer sans
// explication. Créé une fois, simplement montré/caché ensuite.
(function initOfflineIndicator() {
  const badge = document.createElement('div');
  badge.id = 'offline-badge';
  badge.className = 'offline-badge';
  badge.setAttribute('role', 'status');
  badge.textContent = 'Hors-ligne — tes données restent disponibles';
  document.body.appendChild(badge);

  function update() {
    badge.classList.toggle('visible', !navigator.onLine);
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
})();

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
  medal: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M7 2h4l1.5 4L14 2h4l-3.6 7.2a6 6 0 1 1-4.8 0L7 2z" opacity="0.55"/><circle cx="12" cy="15" r="5.4"/><circle cx="12" cy="15" r="3" fill="#fff" opacity="0.28"/></svg>`,

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
    loadTrendingCarousel();
    loadFilmDuJour();
    loadDailyQuiz();
  }
  // Duel du jour : re-verifie a chaque affichage de Decouvrir (contrairement
  // aux blocs ci-dessus charges une fois) car son etat depend du jour courant.
  if (tabName === 'discover' && typeof renderDailyDuel === 'function') {
    renderDailyDuel();
  }
  // Duels : re-rendus à chaque affichage du profil (rendu léger, et la paire
  // proposée reste ainsi à jour avec les derniers films notés).
  if (tabName === 'profile' && typeof renderDuelsSection === 'function') {
    renderDuelsSection();
    if (typeof renderProfileExtras === 'function') renderProfileExtras();
  }
  // Aperçu unique du geste de swipe à la première visite de l'historique
  if (tabName === 'history' && typeof maybePlaySwipeHint === 'function') {
    maybePlaySwipeHint();
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
// Zones où un glissement (horizontal ou vertical) a déjà un sens propre
// (scroller un carrousel, déplacer un curseur, swiper une carte "Découvrir"...)
// : ni le changement d'onglet, ni le tirer-pour-rafraîchir ne doivent s'y
// déclencher. Fonction partagée (pas enfermée dans une IIFE) exprès — elle
// sert à plusieurs mécanismes de geste distincts dans ce fichier.
function isExcludedTarget(target) {
  return !!target.closest(
    '#carousel-container, .discover-card, .wl-card, .hist-item, .trending-carousel, #quick-stars-container, input[type="range"], input[type="text"], textarea, .modal-overlay.open'
  );
}

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
    if (navProfile.classList.contains('active')) return 'profile';
    return 'rating';
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
//  TIRER VERS LE BAS POUR RAFRAÎCHIR
// ═══════════════════════════════════════════
// Uniquement quand la page est déjà tout en haut (rien à scroller au-dessus) —
// sinon on interférerait avec un simple scroll vers le bas de contenu. Exclut
// les mêmes zones que le swipe d'onglet (cartes, listes, carrousels...) qui
// gèrent déjà leurs propres gestes tactiles.
(function initPullToRefresh() {
  const indicator = document.getElementById('ptr-indicator');
  if (!indicator) return;

  const THRESHOLD = 70;
  const MAX_PULL = 100;
  let startY = 0;
  let pulling = false;
  let refreshing = false;

  document.addEventListener('touchstart', (e) => {
    if (refreshing) return;
    if (window.scrollY > 5) return;
    if (isExcludedTarget(e.target)) return;
    startY = e.touches[0].clientY;
    pulling = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!pulling || refreshing) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY <= 0 || window.scrollY > 5) { pulling = false; indicator.style.opacity = '0'; return; }
    const capped = Math.min(deltaY, MAX_PULL);
    indicator.style.transform = `translateX(-50%) translateY(${capped}px) rotate(${capped * 2.4}deg)`;
    indicator.style.opacity = String(Math.min(capped / THRESHOLD, 1));
    indicator.classList.toggle('ptr-ready', capped >= THRESHOLD);
  }, { passive: true });

  document.addEventListener('touchend', async () => {
    if (!pulling || refreshing) { pulling = false; return; }
    pulling = false;
    const wasReady = indicator.classList.contains('ptr-ready');

    if (!wasReady) {
      indicator.style.opacity = '0';
      return;
    }

    refreshing = true;
    indicator.classList.add('ptr-spinning');
    indicator.style.transform = `translateX(-50%) translateY(${THRESHOLD}px)`;
    try {
      if (getSyncCode()) {
        await pullFromCloud(); // affiche déjà son propre toast de confirmation
      } else {
        renderAll();
        showToast('Actualisé.');
      }
    } catch {
      showToast("Impossible d'actualiser pour l'instant.");
    } finally {
      refreshing = false;
      indicator.classList.remove('ptr-spinning', 'ptr-ready');
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateX(-50%) translateY(0)';
    }
  });
})();

// Accessibilité clavier : un vrai <button> déclenche déjà un clic sur
// Entrée/Espace nativement, mais un <div role="button" tabindex="0"> (utilisé
// pour les cartes cliquables — tendances, casting, filmographie, lignes
// d'historique/watchlist...) ne le fait PAS tout seul, le navigateur ne le
// câble pas automatiquement pour un rôle ARIA sur un élément non natif. Un
// seul écouteur global plutôt que de le répéter à chaque nouvel élément.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const target = e.target.closest('[role="button"][tabindex="0"]');
  if (!target) return;
  e.preventDefault();
  target.click();
});

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

// Bascule jour/nuit du thème Méridien, basée sur l'heure RÉELLE (pas les
// préférences système comme le thème "Auto") — nuit de 20h à 7h. Le laiton
// (accent) reste identique dans les deux cas ; seuls fond et texte s'inversent
// (voir [data-theme="meridien"].meridien-night dans styles.css).
function applyMeridienDayNight() {
  const hour = new Date().getHours();
  const isNight = hour < 7 || hour >= 20;
  document.documentElement.classList.toggle('meridien-night', isNight);
}
let meridienIntervalStarted = false;
function ensureMeridienInterval() {
  if (meridienIntervalStarted) return;
  meridienIntervalStarted = true;
  // Revérifie toutes les 10 minutes : suffisant pour basculer au bon moment
  // même si l'app reste ouverte sans être rechargée à travers la frontière jour/nuit.
  setInterval(() => {
    if (document.documentElement.getAttribute('data-theme') === 'meridien') applyMeridienDayNight();
  }, 10 * 60 * 1000);
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
  if (themeToApply === 'meridien') {
    applyMeridienDayNight();
    ensureMeridienInterval();
  }
  
  document.getElementById('setting-app-name').value = (settings.appName || "").replace(/<\/?em>/g, '');
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
        if (card.dataset.theme === 'meridien') {
          applyMeridienDayNight();
          ensureMeridienInterval();
        }
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

// Différé au tick suivant (setTimeout 0) plutôt qu'appelé immédiatement ici :
// app.js est la concaténation de 16 fichiers exécutés dans l'ordre, et ce
// fichier-ci (03-foundation.js) est encore tôt dans cet ordre. Un appel
// immédiat à renderAll()/loadDraft() peut donc atteindre du code plus tard
// dans le fichier (une const d'un fichier chargé après) qui n'a pas encore
// été exécuté — c'est la cause de plusieurs bugs "Cannot access ... before
// initialization" rencontrés dans ce projet (CRITERIA_SHORT_LABELS,
// CONTEXT_TAG_ICONS, GENRE_BADGE_THRESHOLD, _descCache, DESCS...). En
// repoussant l'appel au tick suivant, TOUT le script (les 16 fichiers) a fini
// de s'exécuter avant que renderAll()/loadDraft() ne démarrent réellement —
// plus aucune const ne peut alors être "pas encore initialisée", quel que
// soit l'ordre des fichiers.
setTimeout(() => {
  renderAll();
  loadDraft();
}, 0);

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

// Le cache est attaché à la fonction elle-même (pas une const top-level) et
// initialisé au premier appel — ainsi aucune ligne de déclaration à atteindre
// avant de pouvoir l'utiliser. C'est exactement la même classe de bug
// rencontrée plusieurs fois dans ce projet (CRITERIA_SHORT_LABELS,
// CONTEXT_TAG_ICONS, GENRE_BADGE_THRESHOLD) : une const top-level référencée
// par une fonction appelée via le renderAll() précoce de 03-foundation.js,
// AVANT que ce fichier-ci (qui charge après) n'ait fini de s'exécuter et
// atteint sa propre déclaration. Cette fois le remède habituel ("rendre la
// constante locale à la fonction") ne suffit pas seul, puisque ce cache doit
// justement SURVIVRE entre les appels — d'où cette variante.
function getDesc(criterion, val) {
  if (!getDesc._cache) getDesc._cache = {};
  const _descCache = getDesc._cache;
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
// ─── Rétrospective annuelle ("Wrapped") ─────────────────────────────────────
// Filtre l'historique sur UNE année (par savedAt, ou date à défaut) et en
// tire les temps forts — genre/réalisateur/acteur/mois les plus présents,
// film le mieux noté, temps total visionné. Fonction pure : ne touche à
// aucun DOM, juste des données en entrée/sortie, pour rester testable
// facilement (contrairement aux tests E2E, plus lents et parfois instables).
// ── Import Letterboxd (voir 07-data-io.js pour l'UI) ──
// Parseur CSV minimal mais correct : gère les champs entre guillemets
// (contenant virgules, retours à la ligne, guillemets doublés ""), le cas le
// plus piégeux des exports Letterboxd (titres comme "Paris, Texas").
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
  return rows;
}

// Convertit les lignes d'un CSV Letterboxd (diary.csv, ratings.csv ou
// watched.csv — colonnes détectées par l'en-tête, insensible à l'ordre) en
// items d'historique Ludex. Note Letterboxd sur 5 étoiles -> score sur 10.
// Retourne aussi le type détecté et les lignes ignorées (sans titre).
function mapLetterboxdCsv(rows) {
  if (!rows || rows.length < 2) return { items: [], skipped: 0, kind: null };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = (name) => header.indexOf(name);
  const iName = col('name'), iYear = col('year'), iRating = col('rating');
  const iWatched = col('watched date'), iDate = col('date');
  if (iName === -1) return { items: [], skipped: 0, kind: null }; // pas un CSV Letterboxd

  const kind = iWatched !== -1 ? 'diary' : (iRating !== -1 ? 'ratings' : 'watched');
  const items = [];
  let skipped = 0;
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const title = (cells[iName] || '').trim();
    if (!title) { skipped++; continue; }
    const year = iYear !== -1 ? (cells[iYear] || '').trim() : '';
    const ratingRaw = iRating !== -1 ? parseFloat(cells[iRating]) : NaN;
    const hasRating = !isNaN(ratingRaw) && ratingRaw > 0;
    const score = hasRating ? (ratingRaw * 2).toFixed(1) : '';
    const watchedDate = (iWatched !== -1 && cells[iWatched]) ? cells[iWatched].trim()
                      : (iDate !== -1 && cells[iDate]) ? cells[iDate].trim() : '';
    items.push({
      title,
      year,
      score,
      mode: 'quick',
      values: hasRating ? { quick: ratingRaw } : {},
      date: watchedDate,
      savedAt: new Date().toISOString(),
      importedFrom: 'letterboxd',
    });
  }
  return { items, skipped, kind };
}

// ── Cartes Profil : "Il y a un an", heatmap, décennies ──
// Compte de films par jour (clé YYYY-MM-DD), pour la heatmap calendrier.
function computeDailyCounts(history) {
  const counts = {};
  for (const item of history) {
    if (!item.date) continue;
    const key = String(item.date).slice(0, 10);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// Films regroupés par décennie de sortie, avec compte et note moyenne.
// Trié par compte décroissant. Les items sans année sont ignorés.
function computeDecadeStats(history) {
  const byDecade = {};
  for (const item of history) {
    const y = parseInt(item.year, 10);
    if (isNaN(y) || y < 1880 || y > 2100) continue;
    const decade = Math.floor(y / 10) * 10;
    if (!byDecade[decade]) byDecade[decade] = { decade, count: 0, scoreSum: 0, scored: 0 };
    byDecade[decade].count++;
    const s = parseFloat(item.score);
    if (!isNaN(s)) { byDecade[decade].scoreSum += s; byDecade[decade].scored++; }
  }
  return Object.values(byDecade)
    .map(d => ({ decade: d.decade, count: d.count, avg: d.scored > 0 ? d.scoreSum / d.scored : null }))
    .sort((a, b) => b.count - a.count);
}

// Le film regardé "il y a un an" : cherche autour de la même date l'an
// dernier, en élargissant progressivement (jour exact, puis ±1, ±2, ±3 jours)
// pour maximiser la chance d'un souvenir sans tricher sur "il y a un an".
function findOneYearAgoFilm(history, today) {
  const base = new Date(today);
  base.setFullYear(base.getFullYear() - 1);
  for (let spread = 0; spread <= 3; spread++) {
    for (const sign of spread === 0 ? [0] : [-1, 1]) {
      const d = new Date(base);
      d.setDate(d.getDate() + spread * sign);
      const key = d.toISOString().slice(0, 10);
      const found = history.find(h => h.date && String(h.date).slice(0, 10) === key);
      if (found) return { item: found, date: key };
    }
  }
  return null;
}

// ── Duels ELO (voir 13-duels.js pour le stockage/rendu) ──
// Probabilité attendue de victoire selon l'écart de cotes, puis mise à jour
// symétrique : le vainqueur gagne exactement ce que le perdant perd. Battre
// plus fort que soi rapporte gros ; battre plus faible rapporte peu.
function computeEloUpdate(winnerElo, loserElo, k = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const delta = Math.round(k * (1 - expectedWinner));
  return { winnerElo: winnerElo + delta, loserElo: loserElo - delta, delta };
}

function computeWrappedStats(history, year) {
  const yearStr = String(year);
  const filtered = history.filter(h => {
    const d = h.savedAt || h.date;
    return !!d && d.slice(0, 4) === yearStr;
  });

  const totalFilms = filtered.length;
  const avgScore = totalFilms > 0
    ? filtered.reduce((sum, h) => sum + (parseFloat(h.score) || 0), 0) / totalFilms
    : 0;

  function topEntry(counts) {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? { name: entries[0][0], count: entries[0][1] } : null;
  }

  const genreCounts = {};
  filtered.forEach(h => {
    if (h.genre) h.genre.split(',').forEach(g => { const t = g.trim(); if (t) genreCounts[t] = (genreCounts[t] || 0) + 1; });
  });

  const directorCounts = {};
  filtered.forEach(h => { if (h.director) { const t = h.director.trim(); if (t) directorCounts[t] = (directorCounts[t] || 0) + 1; } });

  const actorCounts = {};
  filtered.forEach(h => {
    if (h.actors) h.actors.split(',').forEach(a => { const t = a.trim(); if (t) actorCounts[t] = (actorCounts[t] || 0) + 1; });
  });

  const monthCounts = {};
  filtered.forEach(h => {
    const d = h.savedAt || h.date;
    if (d) { const m = d.slice(0, 7); monthCounts[m] = (monthCounts[m] || 0) + 1; }
  });
  const topMonthRaw = topEntry(monthCounts);

  const bestRated = filtered.length > 0
    ? filtered.slice().sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0))[0]
    : null;

  const totalMinutes = filtered.reduce((sum, h) => {
    const m = parseInt(h.runtime, 10);
    return sum + (isNaN(m) ? 0 : m);
  }, 0);

  return {
    year,
    totalFilms,
    avgScore,
    topGenre: topEntry(genreCounts),
    topDirector: topEntry(directorCounts),
    topActor: topEntry(actorCounts),
    topMonth: topMonthRaw, // { name: "2026-03", count } — le nom du mois est formaté à l'affichage, pas ici
    bestRated,
    totalMinutes,
  };
}

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
    computeWrappedStats,
    computeEloUpdate,
    parseCsv,
    mapLetterboxdCsv,
    computeDailyCounts,
    computeDecadeStats,
    findOneYearAgoFilm,
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

// Recherche une PERSONNE (réalisateur/acteur/etc.) correspondant au texte
// tapé — partagée entre la recherche du formulaire de notation et celle de la
// watchlist. Retourne null si rien de pertinent, plutôt que le premier
// résultat TMDb quel qu'il soit (évite de proposer une correspondance
// approximative sans rapport avec ce qui a été tapé).
async function fetchPersonMatch(q) {
  try {
    const res = await fetch(`/api/search?personSearch=${encodeURIComponent(q)}`);
    const data = await res.json();
    const person = (data.results || [])[0];
    if (!person) return null;
    const qNorm = q.trim().toLowerCase();
    const nameNorm = (person.name || '').toLowerCase();
    return nameNorm.includes(qNorm) ? person : null;
  } catch { return null; }
}

function buildPersonSuggestionEl(person) {
  const photoUrl = person.profile_path ? `https://image.tmdb.org/t/p/w92${person.profile_path}` : '';
  const item = document.createElement('div');
  item.className = 'suggestion-item suggestion-person';
  const imgHtml = photoUrl
    ? `<img class="suggestion-poster" style="border-radius:50%;object-fit:cover;" src="${photoUrl}" alt="Photo de ${escAttr(person.name)}" loading="lazy">`
    : `<div class="suggestion-poster-placeholder">${ICONS.clapper}</div>`;
  item.innerHTML = `${imgHtml}<div class="suggestion-info"><div class="suggestion-title">🎬 ${escAttr(person.name)}</div><div class="suggestion-year">Voir sa filmographie</div></div>`;
  item.addEventListener('click', () => {
    suggestEl.style.display = 'none';
    openPersonDetailSheet(person.id, person.name);
  });
  return item;
}

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
    const [res, personMatch] = await Promise.all([
      fetch(`/api/search?query=${encodeURIComponent(q)}`),
      fetchPersonMatch(q),
    ]);
    const data = await res.json();
    searchStatus.style.display = 'none';
    if (!data.results?.length && !personMatch) { suggestEl.style.display = 'none'; return; }
    suggestEl.innerHTML = '';
    suggestEl.style.display = 'block';

    // Le réalisateur/acteur trouvé (s'il y en a un) apparaît en premier — on
    // tapait probablement un nom, pas un titre de film, dans ce cas.
    if (personMatch) suggestEl.appendChild(buildPersonSuggestionEl(personMatch));

    (data.results || []).slice(0, 6).forEach(m => {
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

    const settings = JSON.parse(localStorage.getItem('lbx_settings') || '{}');
    if (settings.genreWeightsEnabled !== false) {
      suggestGenreWeights(genreNames);
    }

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

// Glisser le doigt/la souris sur les étoiles les remplit progressivement, au
// lieu de devoir taper précisément sur chacune — plus fluide et satisfaisant,
// surtout au tap initial où on peut directement glisser jusqu'à la bonne
// valeur sans relâcher. S'appuie sur elementFromPoint (pas un calcul de
// position manuel) : robuste face à la mise en page row-reverse et à toute
// variation de tailles/espacements entre thèmes.
(function initStarDrag() {
  const container = document.getElementById('quick-stars-container');
  if (!container) return;
  let dragging = false;

  function selectLabelAt(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const label = el && el.closest('#quick-stars-container label');
    if (!label || !label.htmlFor) return;
    const radio = document.getElementById(label.htmlFor);
    if (radio && !radio.checked) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  container.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    dragging = true;
    const t = e.touches[0];
    selectLabelAt(t.clientX, t.clientY);
  }, { passive: true });
  container.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    e.stopPropagation();
    const t = e.touches[0];
    selectLabelAt(t.clientX, t.clientY);
  }, { passive: true });
  container.addEventListener('touchend', () => { dragging = false; });
  container.addEventListener('touchcancel', () => { dragging = false; });

  // Souris (pratique pour tester sur desktop / vercel dev)
  container.addEventListener('mousedown', (e) => { dragging = true; selectLabelAt(e.clientX, e.clientY); });
  document.addEventListener('mousemove', (e) => { if (dragging) selectLabelAt(e.clientX, e.clientY); });
  document.addEventListener('mouseup', () => { dragging = false; });
})();

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
    <div class="save-confirm-ticket">
      <div class="save-confirm-ticket-half save-confirm-ticket-left">${ICONS.clapper}</div>
      <div class="save-confirm-ticket-perf"></div>
      <div class="save-confirm-ticket-half save-confirm-ticket-right">✓</div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (navigator.vibrate) navigator.vibrate([12, 25, 12]);
  setTimeout(() => overlay.remove(), 850);
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
  setTodayDate(); // remet la date à aujourd'hui — sinon elle restait bloquée sur la dernière date utilisée
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

function showToast(msg, withUndo = false, undoFnName = 'undoDelete') {
  const t = document.getElementById('toast');
  
  let html = `<span>${msg}</span>`;
  if (withUndo) {
    html += `<button class="toast-undo-btn" onclick="${undoFnName}()">Annuler</button>`;
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
    // Une requête à 4 chiffres (ex: "1994") matche aussi l'année du film, et
    // "199" les années 1990-1999 : la recherche sert ainsi de filtre par
    // année/décennie sans UI supplémentaire — combinable avec les puces de
    // genre et le filtre de note comme le reste.
    const isYearQuery = /^\d{3,4}$/.test(historySearchQuery.trim());
    h = h.filter(item => {
      const titleMatch = item.title && item.title.toLowerCase().includes(historySearchQuery);
      const dirMatch = item.director && item.director.toLowerCase().includes(historySearchQuery);
      const actMatch = item.actors && item.actors.toLowerCase().includes(historySearchQuery);
      const yearMatch = isYearQuery && item.year && String(item.year).startsWith(historySearchQuery.trim());
      return titleMatch || dirMatch || actMatch || yearMatch;
    });
  }

  if (sortOrder === 'date') {
    return [...h].sort((a, b) => {
      const dateA = a.date || a.savedAt || "";
      const dateB = b.date || b.savedAt || "";
      return dateB.localeCompare(dateA); 
    });
  }

  if (sortOrder === 'score-desc') return [...h].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  if (sortOrder === 'score-asc')  return [...h].sort((a, b) => parseFloat(a.score) - parseFloat(b.score));
  if (sortOrder === 'title')      return [...h].sort((a, b) => a.title.localeCompare(b.title));
  
  return h; 
}

function renderHistory() {
  // Capture tout geste "armé" AVANT de reconstruire le DOM (voir
  // captureArmedHistoryState/reapplyArmedHistoryState dans initHistoryGestures) —
  // sinon l'état visuel armé disparaîtrait silencieusement sur le nouvel
  // élément si un re-rendu (synchro en arrière-plan, tirer-pour-rafraîchir,
  // une autre suppression confirmée en parallèle...) s'intercale pendant que
  // l'utilisateur attend de confirmer un swipe.
  const capturedArmedState = window.captureArmedHistoryState ? window.captureArmedHistoryState() : null;

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
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.clapper}</div>La salle est vide… Note ton premier film pour lancer la séance !<button type="button" class="empty-state-cta" id="empty-state-history-cta">Rechercher mon premier film</button></div>`;
    window._justSavedHistoryTitle = null;
    return;
  }

  if (sorted.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.search}</div>Rien à l'affiche sous ce nom.</div>`;
    window._justSavedHistoryTitle = null;
    return;
  }

  container.innerHTML = '';
  sorted.forEach((item, i) => {
    const realIdx = history.findIndex(h => h.savedAt === item.savedAt && h.title === item.title);
    const div = document.createElement('div');
    div.className = 'hist-item';
    div.dataset.idx = realIdx;
    div.dataset.savedAt = item.savedAt || '';
    div.dataset.titleKey = item.title.toLowerCase();
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
      <div class="hist-item-content" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
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
          <button class="hist-action-btn" onclick="loadItem(${realIdx})" title="Modifier" aria-label="Modifier ma note pour ${item.title.replace(/"/g, '&quot;')}">${ICONS.edit}</button>
          <button class="hist-action-btn del" onclick="deleteItem(${realIdx}, this)" title="Supprimer" aria-label="Supprimer ${item.title.replace(/"/g, '&quot;')} de l'historique">${ICONS.trash}</button>
        </div>
      </div>`;
    container.appendChild(div);
    applyPosterAccent(item.poster, div);
  });
  window._justSavedHistoryTitle = null;
  if (window.reapplyArmedHistoryState) window.reapplyArmedHistoryState(capturedArmedState);
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
  const MOVE_CANCEL_PX = 12; // marge avant de trancher swipe/scroll — le ratio généreux (0.5, voir plus bas) fait maintenant le plus gros du travail, donc ce seuil peut redescendre pour un geste plus réactif dès le départ
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
    // Capture une clé STABLE (pas juste l'index brut) : entre ce tap de
    // confirmation et l'exécution réelle (~500ms plus tard, deux délais
    // d'animation cumulés), une AUTRE suppression/modification confirmée en
    // parallèle peut décaler tous les index suivants — un index figé ici
    // deviendrait alors celui d'un AUTRE film au moment de l'exécuter. D'où
    // le bug observé : des cartes qui semblaient "figées" en plein envol,
    // l'action retardée s'appliquant au mauvais film (ou à un index qui
    // n'existait plus).
    const savedAt = item.dataset.savedAt;
    const titleKey = item.dataset.titleKey;
    function resolveCurrentIdx() {
      const freshHistory = loadHistory();
      const found = freshHistory.findIndex(h => h.savedAt === savedAt && h.title.toLowerCase() === titleKey);
      return found !== -1 ? found : parseInt(item.dataset.idx, 10); // repli sur l'ancien index si jamais introuvable
    }
    armedItem = null;
    armedDirection = null;
    if (dir === 'left') {
      item.classList.add('hist-swipe-out-left');
      content.style.transform = 'translateX(-110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(item, 'strong');
      setTimeout(() => deleteItem(resolveCurrentIdx()), 200); // pas de btnEl : évite de cumuler avec l'animation .deleting existante
    } else {
      item.classList.add('hist-swipe-out-right');
      content.style.transform = 'translateX(110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(item, 'strong');
      setTimeout(() => loadItem(resolveCurrentIdx()), 200);
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

  // Remet aussi le VISUEL à zéro (pas juste le suivi interne) — utilisé pour
  // touchcancel, qui peut se déclencher sur un vrai téléphone (notification,
  // appel entrant, le système qui interrompt le geste en cours) sans jamais
  // passer par resolveGesture(). Sans ce nettoyage visuel, le film glissé au
  // moment de l'interruption restait visuellement coincé à mi-chemin — décalé,
  // sans indice Supprimer/Modifier visible — et le restait indéfiniment,
  // jusqu'à ce qu'on retouche cet item précis. D'où le bug remonté :
  // "après avoir déjà swipé un autre film juste avant".
  function cancelGestureFully(e) {
    if (pressedItem) {
      if (pressedContent) {
        pressedContent.style.transition = 'transform .2s ease';
        pressedContent.style.transform = '';
      }
      pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
    }
    resetGesture(e);
  }

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.hist-item');
    if (!item || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) { resetGesture(); return; }
    e.stopPropagation(); // évite que ce geste ne remonte jusqu'au swipe de changement d'onglet (01-navigation.js)
    // NOTE : ne PAS annuler ici un item armé — un simple tap déclenche
    // touchstart AVANT click, et annuler dès le toucher tuait l'état armé
    // avant que le clic de confirmation n'arrive (le tap "Supprimer" ouvrait
    // alors la fiche du film). L'annulation pour cause de nouveau geste se
    // fait plus bas, au moment où un VRAI glissement démarre (swipeMode).
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
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll'; // nettement favorable au swipe (etait 1:1, encore trop de faux "scroll" signales par l'utilisateur) : un vrai geste de glissement a souvent un peu de derive verticale, surtout au tout debut
        // C'est ICI (nouveau glissement réellement engagé) qu'on nettoie un
        // éventuel état armé du même film — assez tôt pour éviter les deux
        // états contradictoires (le bug historique du re-swipe), assez tard
        // pour ne pas tuer le tap de confirmation (qui ne passe jamais ici).
        if (swipeMode === 'swipe' && armedItem === pressedItem) cancelArmed();
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

  container.addEventListener('touchcancel', cancelGestureFully);

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
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll'; // nettement favorable au swipe (etait 1:1, encore trop de faux "scroll" signales par l'utilisateur) : un vrai geste de glissement a souvent un peu de derive verticale, surtout au tout debut
        // Même correctif que le tactile : nettoyer un état armé au démarrage
        // d'un VRAI glissement, jamais au simple clic (voir touchstart).
        if (swipeMode === 'swipe' && armedItem === pressedItem) cancelArmed();
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

  // Exposé pour renderHistory() : un re-rendu (déclenché par une synchro en
  // arrière-plan, un tirer-pour-rafraîchir, une autre suppression confirmée
  // en parallèle...) reconstruit tout le DOM de la liste. Sans rien faire de
  // plus, l'état "armé" (piste révélée, en attente d'un tap de confirmation)
  // disparaîtrait silencieusement sur le nouvel élément reconstruit — le
  // prochain tap de l'utilisateur sur l'indice ne ferait alors plus rien,
  // puisque ni la classe visuelle ni la variable JS ne s'y attendent plus.
  // Solution en deux temps : capturer l'état AVANT de vider le DOM (clé
  // stable, pas un index qui pourrait avoir changé), puis le réappliquer
  // sur le NOUVEL élément correspondant après la reconstruction.
  window.captureArmedHistoryState = function() {
    // Cas 1 : un item est déjà ARMÉ (piste révélée, en attente de confirmation).
    if (armedItem) {
      const captured = {
        kind: 'armed',
        savedAt: armedItem.dataset.savedAt,
        titleKey: armedItem.dataset.titleKey,
        direction: armedDirection,
      };
      resetGesture();
      armedItem = null;
      armedDirection = null;
      return captured;
    }
    // Cas 2 : un glissement est EN COURS (doigt toujours posé, pas encore
    // armé) — c'est le cas qui manquait encore : un re-rendu à ce moment-là
    // laissait pressedItem/pressedContent pointer vers un élément détaché,
    // donc le reste du geste (touchmove/touchend) ne mettait plus rien à
    // jour de VISIBLE, exactement le bug "le swipe est détecté mais reste
    // vide" remonté par l'utilisateur.
    if (pressedItem) {
      const captured = {
        kind: 'dragging',
        savedAt: pressedItem.dataset.savedAt,
        titleKey: pressedItem.dataset.titleKey,
        dx, swipeMode,
      };
      return captured; // ne réinitialise PAS ici : le doigt est encore posé, le geste continue
    }
    return null;
  };

  window.reapplyArmedHistoryState = function(captured) {
    if (!captured) return;
    const container = document.getElementById('history-list');
    const newItem = container?.querySelector(
      `.hist-item[data-saved-at="${CSS.escape(captured.savedAt)}"][data-title-key="${CSS.escape(captured.titleKey)}"]`
    );
    if (!newItem) return; // le film a été supprimé entre-temps par ailleurs : rien à réappliquer
    const content = newItem.querySelector('.hist-item-content');

    if (captured.kind === 'armed') {
      const cls = captured.direction === 'left' ? 'hist-swipe-armed-left' : 'hist-swipe-armed-right';
      const swipeCls = captured.direction === 'left' ? 'hist-swipe-left' : 'hist-swipe-right';
      newItem.classList.add(cls, swipeCls);
      if (content) content.style.transform = `translateX(${captured.direction === 'left' ? -120 : 120}px)`;
      armedItem = newItem;
      armedDirection = captured.direction;
    } else if (captured.kind === 'dragging') {
      // Rebranche pressedItem/pressedContent sur le NOUVEL élément (le geste
      // continue dessus dès le prochain touchmove/touchend), et redonne
      // immédiatement le même rendu visuel qu'avant le re-rendu.
      pressedItem = newItem;
      pressedContent = content;
      dx = captured.dx;
      swipeMode = captured.swipeMode;
      if (content) content.style.transform = `translateX(${dx}px)`;
      newItem.classList.toggle('hist-swipe-left', dx < -10);
      newItem.classList.toggle('hist-swipe-right', dx > 10);
    }
  };
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

  const s = 220, c = s/2, r = 72;
  // Nombre d'axes = nombre de critères actuels (CRITERIA) : ne plus jamais figer
  // ce nombre en dur, sinon l'ajout d'un critère (ex: "Rythme") désaligne le
  // graphique ou perd un axe silencieusement.
  // NB : s (220) est volontairement plus grand que 2×r (144) — la différence
  // (38px de chaque côté) est la marge réservée aux libellés des axes.
  // Avant, s=180 et r=0.42×s=76 plaçaient l'ancre du texte PILE sur le bord du
  // viewBox (aucune marge), ce qui faisait déborder "Réal." et "Photo" (le
  // texte s'étend depuis son ancre, pas autour) hors du cadre visible.
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
  renderProfileDiscoveryCards();
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

  const badges = computeBadges(history, { totalMinutes, streak });
  renderBadges(badges);

  // Genre favori (pour la carte de profil) : même logique que le top
  // réalisateurs/acteur favori, sur le champ genre.
  const genreCounts = {};
  history.forEach(h => { if (h.genre) h.genre.split(',').forEach(g => { const t = g.trim(); if (t) genreCounts[t] = (genreCounts[t] || 0) + 1; }); });
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Moyennes par critère (mode détaillé) : pour le mini-radar de la carte de
  // profil. null si l'utilisateur n'a jamais utilisé le mode détaillé.
  const criteriaAverages = computeCriteriaAverages(history, CRITERIA);
  const hasCriteriaData = Object.values(criteriaAverages).some(v => v !== null);

  drawProfileShareCard({
    history, totalMinutes, memberSinceStr,
    topActor: topActors[0]?.name,
    topGenre,
    criteriaAverages: hasCriteriaData ? criteriaAverages : null,
    badges,
  });
}

function renderBadges(badges) {
  const grid = document.getElementById('badges-grid');
  if (!grid) return;
  // Compteur dans l'en-tête plié : l'info essentielle (progression) reste
  // visible sans déplier, le détail ne prend plus tout cet espace du profil.
  const countEl = document.getElementById('badges-count');
  if (countEl) {
    const unlocked = badges.filter(b => b.unlocked).length;
    countEl.textContent = `${unlocked}/${badges.length}`;
  }
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
// Dessine un petit radar (moyennes par critère) sur le canvas — même principe
// que createRadarSVG (06-history.js) mais en dessin canvas natif, pas du SVG.
function drawMiniRadarOnCanvas(ctx, cx, cy, radius, criteriaAverages, color, gridColor) {
  const keys = CRITERIA;
  const angleStep = (Math.PI * 2) / keys.length;

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  keys.forEach((k, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  keys.forEach((k, i) => {
    const val = criteriaAverages[k] || 0;
    const r = (val / 10) * radius;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Bande de perforations façon pellicule de film — juste décoratif, en haut et
// en bas de la carte, pour ancrer visuellement le thème "cinéma".
function drawFilmStripBand(ctx, y, w, color) {
  const holeW = 10, holeH = 6, gap = 8;
  ctx.fillStyle = color;
  for (let x = gap; x < w - gap; x += holeW + gap) {
    ctx.fillRect(x, y, holeW, holeH);
  }
}

function drawProfileShareCard(data) {
  const canvas = document.getElementById('profile-share-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // certains environnements restrictifs renvoient null plutôt que de lever une erreur
  const w = canvas.width, h = canvas.height;

  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue('--surface').trim() || '#1f2935';
  const bg2 = styles.getPropertyValue('--bg').trim() || '#14181c';
  const textHi = styles.getPropertyValue('--text-hi').trim() || '#fff';
  const textMid = styles.getPropertyValue('--text-mid').trim() || '#9ab';
  const accent = styles.getPropertyValue('--orange').trim() || '#ff8000';
  const gold = styles.getPropertyValue('--gold').trim() || accent;
  const border = styles.getPropertyValue('--border').trim() || '#333';
  const fontHeading = (styles.getPropertyValue('--font-heading').trim() || 'sans-serif').split(',')[0].replace(/['"]/g, '');

  ctx.clearRect(0, 0, w, h);
  // Fond en léger dégradé (pas un simple aplat) pour donner un peu de profondeur.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  drawFilmStripBand(ctx, 10, w, accent);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `900 26px "${fontHeading}", sans-serif`;
  ctx.fillText('LUDEX', w / 2, 52);
  ctx.fillStyle = textMid;
  ctx.font = `12px "${fontHeading}", sans-serif`;
  ctx.fillText('MON PROFIL CINÉPHILE', w / 2, 72);

  if (!data || !data.history || data.history.length === 0) {
    ctx.fillStyle = textMid;
    ctx.font = '15px sans-serif';
    ctx.fillText('Note quelques films pour', w / 2, h / 2 - 8);
    ctx.fillText('débloquer ta carte de profil', w / 2, h / 2 + 16);
    drawFilmStripBand(ctx, h - 16, w, accent);
    return;
  }

  const { history, totalMinutes, memberSinceStr, topActor, topGenre, criteriaAverages, badges } = data;
  const avg = history.reduce((sum, item) => sum + (parseFloat(item.score) || 0), 0) / history.length;

  // Chiffre "héros" : le nombre de films, en très grand, façon Wrapped.
  ctx.fillStyle = textHi;
  ctx.font = `900 68px "${fontHeading}", sans-serif`;
  ctx.fillText(String(history.length), w / 2, 148);
  ctx.fillStyle = textMid;
  ctx.font = `bold 12px "${fontHeading}", sans-serif`;
  ctx.fillText('FILMS NOTÉS', w / 2, 168);

  // Note moyenne, mise en avant juste en dessous.
  ctx.fillStyle = gold;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`★ ${avg.toFixed(1)}/10 de moyenne`, w / 2, 196);

  // Mini-radar (mode détaillé utilisé) ou, à défaut, un genre/acteur mis en avant.
  if (criteriaAverages) {
    drawMiniRadarOnCanvas(ctx, w / 2, 275, 65, criteriaAverages, accent, border);
  } else {
    ctx.fillStyle = textMid;
    ctx.font = '13px sans-serif';
    ctx.fillText('Utilise le mode Détaillé pour', w / 2, 260);
    ctx.fillText('débloquer ton profil de goûts (radar)', w / 2, 280);
  }

  // Genre et acteur favoris, côte à côte.
  ctx.font = '11px sans-serif';
  ctx.fillStyle = textMid;
  ctx.fillText('GENRE FAVORI', w * 0.28, 345);
  ctx.fillText('ACTEUR FAVORI', w * 0.72, 345);
  ctx.fillStyle = textHi;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(topGenre || '—', w * 0.28, 365);
  ctx.fillText(topActor || '—', w * 0.72, 365);

  // Badges débloqués : jusqu'à 6 pastilles, pleines si débloquées.
  const unlocked = (badges || []).filter(b => b.unlocked).slice(0, 6);
  const badgeY = 400;
  const badgeR = 14;
  const totalBadgeWidth = unlocked.length * (badgeR * 2 + 10) - 10;
  let bx = w / 2 - totalBadgeWidth / 2 + badgeR;
  unlocked.forEach(() => {
    ctx.beginPath();
    ctx.arc(bx, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();
    bx += badgeR * 2 + 10;
  });
  if (unlocked.length > 0) {
    ctx.fillStyle = textMid;
    ctx.font = '10px sans-serif';
    ctx.fillText(`${unlocked.length} badge${unlocked.length > 1 ? 's' : ''} débloqué${unlocked.length > 1 ? 's' : ''}`, w / 2, badgeY + 32);
  }

  // Pied de carte : membre depuis + temps visionné.
  ctx.fillStyle = textMid;
  ctx.font = '11px sans-serif';
  ctx.fillText(`Membre depuis ${memberSinceStr || '—'} · ${formatWatchTime(totalMinutes)} de films`, w / 2, h - 26);

  drawFilmStripBand(ctx, h - 16, w, accent);
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

// ═══════════════════════════════════════════
//  RÉTROSPECTIVE ANNUELLE ("WRAPPED")
// ═══════════════════════════════════════════
const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function formatMonthLabel(monthKey) {
  // monthKey au format "2026-03"
  const [y, m] = monthKey.split('-');
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${y}`;
}

// Année à retenir par défaut : la plus récente qui a des films notés (pas
// forcément l'année civile en cours, si l'utilisateur vient de commencer ou
// n'a rien noté depuis un moment).
function getWrappedDefaultYear(history) {
  const years = history
    .map(h => { const d = h.savedAt || h.date; return d ? parseInt(d.slice(0, 4), 10) : null; })
    .filter(Boolean);
  return years.length > 0 ? Math.max(...years) : new Date().getFullYear();
}

function buildWrappedSlides(stats) {
  const slides = [];

  slides.push(`
    <div class="wrapped-slide-eyebrow">Ton année ${stats.year}</div>
    <div class="wrapped-slide-big">${stats.totalFilms}</div>
    <div class="wrapped-slide-label">film${stats.totalFilms > 1 ? 's' : ''} noté${stats.totalFilms > 1 ? 's' : ''}</div>
    <div class="wrapped-slide-detail">Voyons ce que ${stats.totalFilms > 1 ? 'ces films disent' : 'ce film dit'} de ton année cinéma...</div>
  `);

  if (stats.topGenre || stats.topDirector) {
    slides.push(`
      <div class="wrapped-slide-eyebrow">Tes habitudes</div>
      ${stats.topGenre ? `<div class="wrapped-slide-label">🎭 Genre favori : ${escAttr(stats.topGenre.name)}</div><div class="wrapped-slide-detail">${stats.topGenre.count} film${stats.topGenre.count > 1 ? 's' : ''}</div>` : ''}
      ${stats.topDirector ? `<div class="wrapped-slide-label" style="margin-top:22px;">🎬 Réalisateur favori : ${escAttr(stats.topDirector.name)}</div><div class="wrapped-slide-detail">${stats.topDirector.count} film${stats.topDirector.count > 1 ? 's' : ''}</div>` : ''}
    `);
  }

  if (stats.topMonth || stats.bestRated) {
    slides.push(`
      <div class="wrapped-slide-eyebrow">Les temps forts</div>
      ${stats.topMonth ? `<div class="wrapped-slide-label">📅 Mois le plus actif</div><div class="wrapped-slide-detail">${formatMonthLabel(stats.topMonth.name)} — ${stats.topMonth.count} film${stats.topMonth.count > 1 ? 's' : ''}</div>` : ''}
      ${stats.bestRated ? `<div class="wrapped-slide-label" style="margin-top:22px;">⭐ Ton coup de cœur</div><div class="wrapped-slide-detail">${escAttr(stats.bestRated.title)} — ${stats.bestRated.score}/10</div>` : ''}
    `);
  }

  slides.push(`
    <div class="wrapped-slide-eyebrow">Le récap'</div>
    <div class="wrapped-slide-big" style="font-size:2.2rem;">${stats.avgScore.toFixed(1)}<span style="font-size:1.2rem;color:var(--text-mid);">/10</span></div>
    <div class="wrapped-slide-label">note moyenne de l'année</div>
    <div class="wrapped-slide-detail">${formatWatchTime(stats.totalMinutes)} passées devant l'écran</div>
  `);

  slides.push(`
    <div class="wrapped-slide-eyebrow">À partager</div>
    <div class="wrapped-share-canvas-wrap"><canvas id="wrapped-share-canvas" width="360" height="480"></canvas></div>
    <button type="button" class="wrapped-share-btn" id="wrapped-share-download-btn">Télécharger l'image</button>
  `);

  return slides;
}

function drawWrappedShareCard(stats) {
  const canvas = document.getElementById('wrapped-share-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;

  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue('--surface').trim() || '#1f2935';
  const bg2 = styles.getPropertyValue('--bg').trim() || '#14181c';
  const textHi = styles.getPropertyValue('--text-hi').trim() || '#fff';
  const textMid = styles.getPropertyValue('--text-mid').trim() || '#9ab';
  const accent = styles.getPropertyValue('--orange').trim() || '#ff8000';
  const fontHeading = (styles.getPropertyValue('--font-heading').trim() || 'sans-serif').split(',')[0].replace(/['"]/g, '');

  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `900 24px "${fontHeading}", sans-serif`;
  ctx.fillText(`LUDEX WRAPPED ${stats.year}`, w / 2, 55);

  ctx.fillStyle = textHi;
  ctx.font = `900 80px "${fontHeading}", sans-serif`;
  ctx.fillText(String(stats.totalFilms), w / 2, 175);
  ctx.fillStyle = textMid;
  ctx.font = `bold 13px "${fontHeading}", sans-serif`;
  ctx.fillText(`FILM${stats.totalFilms > 1 ? 'S' : ''} EN ${stats.year}`, w / 2, 198);

  const rows = [
    ['Note moyenne', `${stats.avgScore.toFixed(1)}/10`],
    ['Genre favori', stats.topGenre?.name || '—'],
    ['Réalisateur favori', stats.topDirector?.name || '—'],
    ['Coup de cœur', stats.bestRated?.title || '—'],
    ['Temps visionné', formatWatchTime(stats.totalMinutes)],
  ];
  let y = 250;
  rows.forEach(([label, val]) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = textMid;
    ctx.font = '11px sans-serif';
    ctx.fillText(label.toUpperCase(), 30, y);
    ctx.fillStyle = textHi;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(val, 30, y + 22);
    y += 46;
  });
}

(function initWrappedModal() {
  const modal = document.getElementById('wrapped-modal');
  const entryCard = document.getElementById('wrapped-entry-card');
  const closeBtn = document.getElementById('wrapped-close-btn');
  const slidesEl = document.getElementById('wrapped-slides');
  const dotsEl = document.getElementById('wrapped-dots');
  const prevBtn = document.getElementById('wrapped-prev-btn');
  const nextBtn = document.getElementById('wrapped-next-btn');
  if (!modal || !entryCard) return;

  let slides = [];
  let current = 0;

  function renderCurrentSlide() {
    slidesEl.innerHTML = slides.map((html, i) =>
      `<div class="wrapped-slide${i === current ? ' active' : ''}${i < current ? ' leaving-left' : ''}">${html}</div>`
    ).join('');
    dotsEl.innerHTML = slides.map((_, i) => `<span class="onboarding-dot${i === current ? ' active' : ''}"></span>`).join('');
    prevBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = current === slides.length - 1 ? 'Fermer' : 'Suivant';

    if (current === slides.length - 1) {
      const shareBtn = document.getElementById('wrapped-share-download-btn');
      drawWrappedShareCard(window._currentWrappedStats);
      shareBtn?.addEventListener('click', () => {
        const canvas = document.getElementById('wrapped-share-canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `ludex-wrapped-${window._currentWrappedStats.year}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Image téléchargée.');
      });
    }
  }

  entryCard.addEventListener('click', () => {
    const history = loadHistory();
    const year = getWrappedDefaultYear(history);
    const stats = computeWrappedStats(history, year);
    window._currentWrappedStats = stats;
    slides = buildWrappedSlides(stats);
    current = 0;
    renderCurrentSlide();
    lastFocusedBeforeModal = document.activeElement;
    modal.classList.add('open');
    closeBtn.focus();
  });

  nextBtn.addEventListener('click', () => {
    if (current === slides.length - 1) { closeModal(modal); return; }
    current++;
    renderCurrentSlide();
  });
  prevBtn.addEventListener('click', () => {
    if (current === 0) return;
    current--;
    renderCurrentSlide();
  });
  closeBtn.addEventListener('click', () => closeModal(modal));
})();

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

// ── Découvrabilité du swipe ──
// Les gestes de glissement (noter à nouveau / supprimer) sont puissants mais
// invisibles : rien n'indique qu'ils existent. À la PREMIÈRE visite de
// l'historique (avec au moins un film), la première carte fait un petit
// aperçu automatique — elle glisse brièvement, révélant l'action cachée
// dessous, puis revient. Une seule fois, jamais plus (clé localStorage).
const SWIPE_HINT_KEY = 'lbx_swipe_hint_seen';
function maybePlaySwipeHint() {
  if (localStorage.getItem(SWIPE_HINT_KEY)) return;
  const firstItem = document.querySelector('.hist-item');
  if (!firstItem) return; // pas de film : on retentera à une prochaine visite
  const content = firstItem.querySelector('.hist-item-content');
  if (!content) return;
  localStorage.setItem(SWIPE_HINT_KEY, '1');

  // Respecte la préférence de réduction des animations
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  setTimeout(() => {
    firstItem.classList.add('hist-swipe-left'); // révèle l'indice visuel sous la carte
    content.style.transition = 'transform .45s cubic-bezier(.2,.8,.2,1)';
    content.style.transform = 'translateX(-56px)';
    setTimeout(() => {
      content.style.transform = '';
      setTimeout(() => {
        firstItem.classList.remove('hist-swipe-left');
        content.style.transition = '';
      }, 450);
    }, 900);
  }, 600);
}
// ── Rendu des trois cartes Profil ajoutées (Il y a un an / Heatmap / Décennies) ──
function renderYearAgoCard(history) {
  const card = document.getElementById('year-ago-card');
  const body = document.getElementById('year-ago-body');
  if (!card || !body) return;
  const found = findOneYearAgoFilm(history, new Date());
  if (!found) { card.style.display = 'none'; return; }
  card.style.display = '';
  const { item } = found;
  const posterHtml = item.poster
    ? `<img class="year-ago-poster" src="${item.poster}" alt="" loading="lazy" decoding="async">`
    : `<div class="year-ago-poster year-ago-poster-ph">${ICONS.clapper}</div>`;
  body.innerHTML = `
    ${posterHtml}
    <div>
      <div class="year-ago-title">${escAttr(item.title)}</div>
      <div class="year-ago-meta">Tu regardais ce film à la même période l'an dernier${item.year ? ` (${escAttr(String(item.year))})` : ''}.</div>
      ${item.score ? `<div class="year-ago-score">Ta note : ${escAttr(String(item.score))}/10</div>` : ''}
    </div>
  `;
}

function renderHeatmap(history) {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  const counts = computeDailyCounts(history);

  // 53 colonnes de semaines, en remontant depuis aujourd'hui jusqu'à ~1 an.
  // On démarre au lundi de la semaine d'il y a 52 semaines pour des colonnes alignées.
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const dayOfWeek = (start.getDay() + 6) % 7; // lundi=0
  start.setDate(start.getDate() - dayOfWeek);

  let html = '';
  const cur = new Date(start);
  while (cur <= today) {
    const key = cur.toISOString().slice(0, 10);
    const n = counts[key] || 0;
    const lvl = n === 0 ? 'l0' : n === 1 ? 'l1' : n === 2 ? 'l2' : 'l3';
    html += `<div class="heatmap-cell ${lvl}" title="${key}${n > 0 ? ` — ${n} film${n > 1 ? 's' : ''}` : ''}"></div>`;
    cur.setDate(cur.getDate() + 1);
  }
  grid.innerHTML = html;
  // Amène la vue sur la fin (les semaines récentes), pas le début d'il y a un an
  const scroll = grid.parentElement;
  if (scroll) scroll.scrollLeft = scroll.scrollWidth;
}

function renderDecades(history) {
  const card = document.getElementById('decades-card');
  const list = document.getElementById('decades-list');
  if (!card || !list) return;
  const stats = computeDecadeStats(history);
  if (stats.length === 0) { card.style.display = 'none'; return; }
  card.style.display = '';
  const max = stats[0].count;
  list.innerHTML = stats.slice(0, 6).map(d => `
    <div class="decade-row">
      <span class="decade-label">${d.decade}s</span>
      <div class="decade-bar-track"><div class="decade-bar" style="width:${Math.round(d.count / max * 100)}%"></div></div>
      <span class="decade-count">${d.count} · ${d.avg !== null ? d.avg.toFixed(1) : '—'}</span>
    </div>
  `).join('');
}

// Regroupe les trois cartes ajoutées ensuite (Il y a un an / Heatmap /
// Décennies). Nom distinct de renderProfileExtras : les deux fonctions
// portaient le même nom à un moment, et la seconde écrasait silencieusement
// la première par hissage — cassant toute la carte "Ton profil" (Membre
// depuis, Temps visionné...). Leçon : un nom = une fonction, vérifié par grep.
function renderProfileDiscoveryCards() {
  const history = loadHistory();
  renderYearAgoCard(history);
  renderHeatmap(history);
  renderDecades(history);
}

// ═══════════════════════════════════════════
//  EXPORT / IMPORT
// ═══════════════════════════════════════════
const LAST_EXPORT_KEY = 'lbx_last_export_at';

document.getElementById('export-btn').addEventListener('click', () => {
  const history = loadHistory();
  if (!history.length) { showToast('Aucun film à exporter.'); return; }
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ludex-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  const banner = document.getElementById('backup-reminder');
  if (banner) banner.remove();
  showToast(`${history.length} film${history.length > 1 ? 's' : ''} exporté${history.length > 1 ? 's' : ''}`);
});

document.getElementById('import-trigger').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

function importLudexJson(text) {
  const data = JSON.parse(text);
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
}

// Import Letterboxd : accepte diary.csv, ratings.csv ou watched.csv de
// l'export officiel Letterboxd (Réglages -> Import & Export). Le parsing et
// le mapping (note /5 -> /10, colonnes détectées par l'en-tête) sont des
// fonctions pures testées dans tests/letterboxd-import.test.js.
function importLetterboxdCsv(text) {
  const rows = parseCsv(text);
  const { items, kind } = mapLetterboxdCsv(rows);
  if (!kind) { showToast('CSV non reconnu — attendu : un export Letterboxd (diary, ratings ou watched).'); return; }
  if (items.length === 0) { showToast('Aucun film trouvé dans ce fichier.'); return; }

  const existing = loadHistory();
  const existingKeys = new Set(existing.map(h => (h.title + '|' + (h.year||'')).toLowerCase()));
  const toAdd = items.filter(d => !existingKeys.has((d.title + '|' + (d.year||'')).toLowerCase()));
  const dupes = items.length - toAdd.length;

  const kindLabel = { diary: 'journal', ratings: 'notes', watched: 'films vus' }[kind];
  openModal(
    'Import Letterboxd',
    `Fichier ${kindLabel} détecté : ${items.length} film${items.length > 1 ? 's' : ''}, dont ${toAdd.length} nouveau${toAdd.length > 1 ? 'x' : ''}${dupes > 0 ? ` (${dupes} déjà présent${dupes > 1 ? 's' : ''}, ignorés)` : ''}. Importer ?`,
    () => {
      const merged = [...toAdd, ...loadHistory()];
      saveHistory(merged);
      renderAll();
      showToast(`${toAdd.length} film${toAdd.length > 1 ? 's' : ''} importé${toAdd.length > 1 ? 's' : ''} depuis Letterboxd 🎬`);
    }
  );
}

document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target.result;
    try {
      // Détection automatique du format : un JSON valide commence par [ ou {,
      // sinon on tente le chemin CSV Letterboxd. Le nom du fichier n'est pas
      // fiable (téléchargements renommés), le contenu l'est.
      const trimmed = text.trimStart();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        importLudexJson(text);
      } else {
        importLetterboxdCsv(text);
      }
    } catch {
      showToast('Fichier non reconnu (attendu : sauvegarde Ludex .json ou export Letterboxd .csv).');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ── Rappel de sauvegarde ──
// localStorage peut être effacé par le navigateur (nettoyage de stockage,
// réinstallation...). Si la dernière sauvegarde date de plus de 30 jours (ou
// n'a jamais eu lieu) et qu'il y a au moins 10 films en jeu, une bannière
// discrète le rappelle — fermable, et re-proposée au plus tous les 7 jours.
const BACKUP_SNOOZE_KEY = 'lbx_backup_snoozed_at';
function maybeShowBackupReminder() {
  const history = loadHistory();
  if (history.length < 10) return;

  const lastExport = localStorage.getItem(LAST_EXPORT_KEY);
  const days = lastExport ? (Date.now() - new Date(lastExport).getTime()) / 86400000 : Infinity;
  if (days < 30) return;

  const snoozed = localStorage.getItem(BACKUP_SNOOZE_KEY);
  if (snoozed && (Date.now() - new Date(snoozed).getTime()) / 86400000 < 7) return;

  const banner = document.createElement('div');
  banner.id = 'backup-reminder';
  banner.className = 'backup-reminder';
  banner.innerHTML = `
    <span class="backup-reminder-text">${lastExport ? 'Dernière sauvegarde il y a plus de 30 jours.' : `${history.length} films notés, aucune sauvegarde.`}</span>
    <button type="button" class="backup-reminder-btn" id="backup-reminder-export">Exporter</button>
    <button type="button" class="backup-reminder-close" id="backup-reminder-close" aria-label="Plus tard">✕</button>
  `;
  document.body.appendChild(banner);
  document.getElementById('backup-reminder-export').addEventListener('click', () => {
    document.getElementById('export-btn').click();
  });
  document.getElementById('backup-reminder-close').addEventListener('click', () => {
    localStorage.setItem(BACKUP_SNOOZE_KEY, new Date().toISOString());
    banner.remove();
  });
}
// Différé pour ne pas gêner le premier rendu (et laisser l'onboarding passer devant)
setTimeout(maybeShowBackupReminder, 2500);

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

function loadWatchlist(listId) {
  try { return JSON.parse(localStorage.getItem(watchlistStorageKey(listId || getActiveWatchlistId()))) || []; } catch { return []; }
}
function saveWatchlist(list, listId) {
  localStorage.setItem(watchlistStorageKey(listId || getActiveWatchlistId()), JSON.stringify(list));
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
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.target}</div>Rien au programme pour l'instant — ajoute les films que tu veux voir.<button type="button" class="empty-state-cta" id="empty-state-watchlist-cta">Découvrir des films à ajouter</button></div>`;
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
      <div class="wl-card-content" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
        ${posterHtml}
        <div class="wl-body">
          <div class="wl-title">${item.title}</div>
          <div class="wl-meta">${[item.year, item.genre].filter(Boolean).join(' · ')}</div>
          <div class="wl-providers" id="wl-providers-${i}">
            <span class="wl-provider-loading">⏳ Chargement streaming...</span>
          </div>
        </div>
        <div class="wl-actions">
          <button class="wl-btn rate" onclick="watchlistToForm(${i})" title="Je l'ai vu, noter" aria-label="Noter ${escAttr(item.title)}, vu">${ICONS.star}</button>
          <button class="wl-btn del" onclick="removeWatchlist(${i})" title="Retirer" aria-label="Retirer ${escAttr(item.title)} de la watchlist">${ICONS.close}</button>
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

// Normalise un nom de plateforme pour comparaison souple (ex: "Apple TV+" et
// "apple tv" doivent se reconnaître comme la même chose malgré la casse et le
// "+"/"Plus"), plutôt que d'exiger une correspondance exacte fragile face aux
// variations de nommage entre ce qu'on propose dans les réglages et ce que
// TMDb renvoie réellement.
function normalizeProviderName(name) {
  return (name || '').toLowerCase().replace(/\+/g, ' plus').replace(/\s+/g, ' ').trim();
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

    // Si l'utilisateur a précisé les plateformes qu'il possède (réglages), on
    // ne garde que celles-là — sinon (rien coché), on affiche tout, comme
    // avant l'ajout de cette fonctionnalité.
    const owned = loadOwnedProviders().map(normalizeProviderName);
    const filterOwned = (list) => owned.length === 0 ? list : list.filter(p => {
      const n = normalizeProviderName(p.provider_name);
      return owned.some(o => n.includes(o) || o.includes(n));
    });

    const allFlat = providerRoot.flatrate || [];
    const allRent = providerRoot.rent || [];
    const flat = filterOwned(allFlat);
    const rentOnly = filterOwned(allRent).filter(r => !flat.find(f => f.provider_id === r.provider_id));

    let html = '';
    if (flat.length > 0) {
      html += `<span class="wl-provider-tag flatrate">Inclus</span>`;
      flat.slice(0, 5).forEach(p => {
        html += `<img class="wl-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }
    if (rentOnly.length > 0) {
      html += `<span class="wl-provider-tag rent">Location</span>`;
      rentOnly.slice(0, 4).forEach(p => {
        html += `<img class="wl-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }

    if (!html) {
      // Distingue "vraiment nulle part en streaming" de "disponible, mais pas
      // sur TES plateformes" — les deux messages n'ont pas la même utilité.
      const availableElsewhere = owned.length > 0 && (allFlat.length > 0 || allRent.length > 0);
      el.innerHTML = availableElsewhere
        ? '<span class="wl-no-streaming">Disponible, mais pas sur tes plateformes 📵</span>'
        : '<span class="wl-no-streaming">Non disponible en streaming 🇧🇪</span>';
    } else {
      el.innerHTML = html;
    }
  } catch {
    if (el) el.innerHTML = '<span class="wl-no-streaming">Providers indisponibles</span>';
  }
}

async function addToWatchlistFromTMDb(movie, year) {
  // Ne fait plus l'ajout directement : demande d'abord dans quelle liste,
  // avec la possibilité d'en créer une nouvelle à la volée.
  openWatchlistPicker(movie, year);
}

async function addToSpecificWatchlist(movie, year, listId) {
  const list = loadWatchlist(listId);
  const key = (movie.title + '|' + year).toLowerCase();
  if (list.find(i => (i.title + '|' + (i.year||'')).toLowerCase() === key)) {
    showToast('Déjà dans cette liste.');
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
  saveWatchlist(list, listId);
  if (listId === getActiveWatchlistId()) {
    window._justSavedWatchlistTitle = movie.title.toLowerCase();
    renderWatchlist();
  }
  const listName = loadWatchlistsMeta().find(l => l.id === listId)?.name || 'la liste';
  showToast(`"${movie.title}" ajouté à "${listName}" 🎯`);
}

function openWatchlistPicker(movie, year) {
  const modal = document.getElementById('wl-picker-modal');
  const listEl = document.getElementById('wl-picker-list');
  const newRow = document.getElementById('wl-picker-new-row');
  const newForm = document.getElementById('wl-picker-new-form');
  const newBtn = document.getElementById('wl-picker-new-btn');
  const newInput = document.getElementById('wl-picker-new-input');
  const newConfirm = document.getElementById('wl-picker-new-confirm');
  const cancelBtn = document.getElementById('wl-picker-cancel-btn');
  if (!modal || !listEl) return;

  // Repart d'un état propre à chaque ouverture (le formulaire "nouvelle liste"
  // ne doit pas rester déplié d'une fois à l'autre).
  newForm.style.display = 'none';
  newBtn.style.display = 'flex';
  newInput.value = '';

  const meta = loadWatchlistsMeta();
  listEl.innerHTML = meta.map(l => {
    const count = loadWatchlist(l.id).length;
    return `<button type="button" class="wl-picker-item" data-list-id="${l.id}"><span>${escAttr(l.name)}</span><span class="wl-picker-item-count">${count} film${count > 1 ? 's' : ''}</span></button>`;
  }).join('');

  function pickList(listId) {
    addToSpecificWatchlist(movie, year, listId);
    closeModal(modal);
  }

  listEl.querySelectorAll('.wl-picker-item').forEach(btn => {
    btn.addEventListener('click', () => pickList(btn.dataset.listId));
  });

  newBtn.onclick = () => {
    newBtn.style.display = 'none';
    newForm.style.display = 'flex';
    newInput.focus();
  };
  newConfirm.onclick = () => {
    const name = newInput.value.trim();
    if (!name) { newInput.focus(); return; }
    const id = createWatchlistList(name);
    pickList(id);
  };
  newInput.onkeydown = (e) => { if (e.key === 'Enter') newConfirm.click(); };
  cancelBtn.onclick = () => closeModal(modal);

  lastFocusedBeforeModal = document.activeElement;
  modal.classList.add('open');
  (meta.length > 0 ? listEl.querySelector('.wl-picker-item') : newBtn)?.focus();
}

let deletedWlItemCache = null;
let deletedWlItemIndex = null;
let deletedWlListId = null;

window.removeWatchlist = function(idx) {
  const list = loadWatchlist();
  const item = list[idx];
  const title = item?.title;
  deletedWlItemCache = item || null;
  deletedWlItemIndex = idx;
  deletedWlListId = getActiveWatchlistId(); // au cas où l'utilisateur changerait de liste avant d'annuler
  list.splice(idx, 1);
  saveWatchlist(list);
  if (item) recordTombstone(watchlistTombstonesKey(getActiveWatchlistId()), watchlistItemKey(item));
  renderWatchlist();
  if (title) showToast(`"${title}" retiré`, true, 'undoWatchlistDelete');
};

window.undoWatchlistDelete = function() {
  if (!deletedWlItemCache || !deletedWlListId) return;
  // Réinsère dans la liste d'ORIGINE (pas forcément celle active maintenant,
  // si l'utilisateur a changé de liste pendant la fenêtre d'annulation).
  const key = watchlistStorageKey(deletedWlListId);
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key)) || []; } catch {}
  list.splice(Math.min(deletedWlItemIndex, list.length), 0, deletedWlItemCache);
  localStorage.setItem(key, JSON.stringify(list));
  removeTombstone(watchlistTombstonesKey(deletedWlListId), watchlistItemKey(deletedWlItemCache));
  if (getActiveWatchlistId() === deletedWlListId) renderWatchlist();
  showToast('Retrait annulé.');
  deletedWlItemCache = null;
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
      const [res, personMatch] = await Promise.all([
        fetch(`/api/search?query=${encodeURIComponent(q)}`),
        fetchPersonMatch(q),
      ]);
      const data = await res.json();
      if (!data.results?.length && !personMatch) { wlSuggestEl.style.display = 'none'; return; }
      wlSuggestEl.innerHTML = '';
      wlSuggestEl.style.display = 'block';

      if (personMatch) {
        const photoUrl = personMatch.profile_path ? `https://image.tmdb.org/t/p/w92${personMatch.profile_path}` : '';
        const personEl = document.createElement('div');
        personEl.className = 'wl-suggest-item';
        personEl.innerHTML = `
          ${photoUrl
            ? `<img class="wl-suggest-poster" style="border-radius:50%;object-fit:cover;" src="${photoUrl}" alt="Photo de ${escAttr(personMatch.name)}" loading="lazy">`
            : `<div class="wl-suggest-poster" style="display:flex;align-items:center;justify-content:center;">${ICONS.clapper}</div>`}
          <div>
            <div class="wl-suggest-title">🎬 ${escAttr(personMatch.name)}</div>
            <div class="wl-suggest-year">Voir sa filmographie</div>
          </div>`;
        personEl.addEventListener('click', () => {
          wlSuggestEl.style.display = 'none';
          openPersonDetailSheet(personMatch.id, personMatch.name);
        });
        wlSuggestEl.appendChild(personEl);
      }

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
//  ACCUEIL POUR UN NOUVEL UTILISATEUR
// ═══════════════════════════════════════════
// Affiché uniquement à un VRAI nouvel utilisateur (historique et watchlists
// vides) — quelqu'un qui a déjà des données (import, synchro restaurée...)
// n'a pas besoin qu'on lui explique l'app depuis le début.
(function initOnboarding() {
  const ONBOARDING_SEEN_KEY = 'lbx_onboarding_seen';
  if (localStorage.getItem(ONBOARDING_SEEN_KEY)) return;

  const hasHistory = loadHistory().length > 0;
  const hasWatchlistItems = loadWatchlistsMeta().some(meta => {
    try { return (JSON.parse(localStorage.getItem(`lbx_watchlist_${meta.id}`)) || []).length > 0; } catch { return false; }
  });
  if (hasHistory || hasWatchlistItems) {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1'); // a déjà des données, pas besoin de cet accueil
    return;
  }

  const modal = document.getElementById('onboarding-modal');
  if (!modal) return;
  const slides = Array.from(modal.querySelectorAll('.onboarding-slide'));
  const dots = Array.from(modal.querySelectorAll('.onboarding-dot'));
  const nextBtn = document.getElementById('onboarding-next-btn');
  const skipBtn = document.getElementById('onboarding-skip-btn');
  let current = 0;

  function showSlide(idx) {
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
      s.classList.toggle('leaving-left', i < idx);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    nextBtn.textContent = idx === slides.length - 1 ? 'Commencer' : 'Suivant';
  }

  function dismiss() {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    closeModal(modal);
  }

  nextBtn.addEventListener('click', () => {
    if (current === slides.length - 1) { dismiss(); return; }
    current++;
    showSlide(current);
  });
  skipBtn.addEventListener('click', dismiss);

  // Après la disparition de l'écran de démarrage (1200ms + marge), pas avant.
  setTimeout(() => {
    lastFocusedBeforeModal = document.activeElement;
    modal.classList.add('open');
    nextBtn.focus();
  }, 1400);
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

// ═══════════════════════════════════════════
//  FILM DU JOUR
// ═══════════════════════════════════════════
// Un film choisi aléatoirement mais STABLE toute la journée (même choix du
// matin au soir, change le lendemain), avec 3 informations générées à partir
// de données TMDb réelles — pas de vraies "anecdotes" (trivia) : TMDb n'a pas
// cet endpoint, on affiche donc des faits fiables (budget/recettes, tagline
// officielle, équipe) plutôt que d'inventer du contenu.
const FILM_DU_JOUR_KEY = 'lbx_film_du_jour';

function formatMoneyShort(amount) {
  if (!amount || amount <= 0) return null;
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1).replace('.0', '') + ' Md$';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(0) + ' M$';
  return (amount / 1_000).toFixed(0) + ' k$';
}

function buildFilmDuJourFacts(m) {
  const facts = [];

  if (m.budget > 0 && m.revenue > 0) {
    const ratio = m.revenue / m.budget;
    facts.push(ratio >= 2
      ? `A rapporté ${ratio.toFixed(1)}× son budget au box-office.`
      : `Budget de ${formatMoneyShort(m.budget)} pour ${formatMoneyShort(m.revenue)} de recettes.`);
  } else if (m.budget > 0) {
    facts.push(`Produit avec un budget de ${formatMoneyShort(m.budget)}.`);
  }

  if (m.tagline) {
    facts.push(`Tagline officielle : « ${m.tagline} »`);
  }

  const director = m.credits?.crew?.find(c => c.job === 'Director')?.name;
  const mainActor = m.credits?.cast?.[0]?.name;
  if (director && mainActor) {
    facts.push(`Réalisé par ${director}, avec ${mainActor} en tête d'affiche.`);
  } else if (director) {
    facts.push(`Réalisé par ${director}.`);
  } else if (mainActor) {
    facts.push(`Avec ${mainActor} en tête d'affiche.`);
  }

  if (facts.length < 3 && m.release_date) {
    const years = new Date().getFullYear() - parseInt(m.release_date.slice(0, 4), 10);
    if (years > 0) facts.push(`Sorti il y a ${years} an${years > 1 ? 's' : ''}.`);
  }
  if (facts.length < 3 && m.vote_average) {
    facts.push(`Noté ${m.vote_average.toFixed(1)}/10 par les spectateurs sur TMDb.`);
  }
  if (facts.length < 3 && m.production_countries?.length) {
    facts.push(`Production ${m.production_countries.map(c => c.name).join(', ')}.`);
  }
  if (facts.length < 3 && m.runtime) {
    facts.push(`Dure ${m.runtime} minutes.`);
  }

  return facts.slice(0, 3);
}

async function loadFilmDuJour() {
  const todayKey = new Date().toISOString().slice(0, 10);
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(FILM_DU_JOUR_KEY) || 'null'); } catch {}

  if (cached && cached.date === todayKey && cached.movie) {
    renderFilmDuJour(cached.movie);
    return;
  }

  try {
    // Réutilise l'endpoint "tendances" déjà en place comme réservoir de films
    // candidats — pas besoin d'un nouveau point d'accès dédié.
    const res = await fetch('/api/search?trending=true');
    const data = await res.json();
    const pool = (data.results || []).filter(m => m.poster_path);
    if (pool.length === 0) return;

    // Choix déterministe basé sur la date (pas Math.random) : stable toute la
    // journée sur TOUS les appareils de l'utilisateur, change automatiquement
    // le lendemain, sans avoir besoin de stocker quoi que ce soit côté serveur.
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const pick = pool[daysSinceEpoch % pool.length];

    const detailRes = await fetch(`/api/search?id=${pick.id}`);
    const details = await detailRes.json();
    if (!details || !details.title) return;

    localStorage.setItem(FILM_DU_JOUR_KEY, JSON.stringify({ date: todayKey, movie: details }));
    renderFilmDuJour(details);
  } catch (e) {
    console.warn('Impossible de charger le film du jour', e);
  }
}

function renderFilmDuJour(m) {
  const wrap = document.getElementById('fdj-wrap');
  const card = document.getElementById('fdj-card');
  const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : '';
  const year = m.release_date ? m.release_date.slice(0, 4) : '';
  const facts = buildFilmDuJourFacts(m);

  card.innerHTML = `
    ${posterUrl ? `<img class="fdj-poster" src="${posterUrl}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">` : `<div class="fdj-poster fdj-poster-ph">${ICONS.clapper}</div>`}
    <div class="fdj-info">
      <div class="fdj-film-title">${escAttr(m.title)}${year ? ` <span class="fdj-year">(${year})</span>` : ''}</div>
      <ul class="fdj-facts">
        ${facts.map(f => `<li>${escAttr(f)}</li>`).join('')}
      </ul>
      <div class="fdj-providers" id="fdj-providers">Recherche des plateformes disponibles…</div>
    </div>
  `;
  wrap.style.display = 'block';
  card.dataset.movieId = String(m.id);
  card.setAttribute('aria-label', `Voir la fiche de ${m.title}`);
  card.addEventListener('click', (e) => {
    if (e.target.closest('.fdj-providers')) return; // évite de rouvrir la fiche si on vient de re-tenter le chargement des plateformes
    openMovieDetailSheet(m.id);
  });

  fetchFilmDuJourProviders(m.id);
}

async function fetchFilmDuJourProviders(tmdbId) {
  const el = document.getElementById('fdj-providers');
  if (!el) return;
  try {
    const res = await fetch(`/api/search?id=${tmdbId}&providers=BE`);
    const data = await res.json();
    const providerRoot = data['watch/providers']?.results?.BE
                      || data.providers?.results?.BE
                      || data.watchProviders?.BE
                      || null;

    const owned = loadOwnedProviders().map(normalizeProviderName);
    const filterOwned = (list) => owned.length === 0 ? list : list.filter(p => {
      const n = normalizeProviderName(p.provider_name);
      return owned.some(o => n.includes(o) || o.includes(n));
    });

    const allFlat = providerRoot?.flatrate || [];
    const allRent = providerRoot?.rent || [];
    const flat = filterOwned(allFlat);
    const rentOnly = filterOwned(allRent).filter(r => !flat.find(f => f.provider_id === r.provider_id));

    let html = '';
    [...flat, ...rentOnly].slice(0, 6).forEach(p => {
      html += `<img class="fdj-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
    });

    if (!html) {
      const availableElsewhere = owned.length > 0 && (allFlat.length > 0 || allRent.length > 0);
      el.innerHTML = `<span class="fdj-no-streaming">${availableElsewhere ? 'Disponible, mais pas sur tes plateformes' : 'Non disponible en streaming 🇧🇪'}</span>`;
    } else {
      el.innerHTML = html;
    }
  } catch {
    el.innerHTML = '<span class="fdj-no-streaming">Plateformes indisponibles</span>';
  }
}

// ═══════════════════════════════════════════
//  CARROUSEL "TENDANCES DU MOMENT"
// ═══════════════════════════════════════════
// Séparé du jeu de cartes à swiper : pas basé sur l'historique de
// l'utilisateur, juste ce qui buzz sur TMDb cette semaine. Défilement
// automatique en boucle (CSS, pas de JS dans la boucle d'animation), mis en
// pause au survol/toucher pour laisser le temps de taper sur une affiche.
let trendingLoaded = false;

async function loadTrendingCarousel() {
  if (trendingLoaded) return;
  trendingLoaded = true;
  try {
    const res = await fetch('/api/search?trending=true');
    const data = await res.json();
    const movies = (data.results || []).filter(m => m.poster_path).slice(0, 15);
    if (movies.length === 0) return;
    renderTrendingCarousel(movies);
    document.getElementById('trending-carousel-wrap').style.display = 'block';
  } catch (e) {
    console.warn('Impossible de charger les tendances du moment', e);
  }
}

function renderTrendingCarousel(movies) {
  const outer = document.getElementById('trending-carousel');
  const itemsHtml = movies.map(m => {
    const posterUrl = `https://image.tmdb.org/t/p/w200${m.poster_path}`;
    return `
      <div class="trending-item" data-movie-id="${m.id}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(m.title)}">
        <img class="trending-item-poster" src="${posterUrl}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">
        <div class="trending-item-title">${escAttr(m.title)}</div>
      </div>`;
  }).join('');

  // La piste contient la liste EN DOUBLE pour permettre une boucle infinie
  // sans à-coup (voir plus bas : on revient à 0 dès qu'on a défilé au-delà
  // d'une copie complète, ce qui retombe pile sur un contenu identique).
  outer.innerHTML = `<div class="trending-carousel-track">${itemsHtml}${itemsHtml}</div>`;
  const track = outer.querySelector('.trending-carousel-track');

  outer.addEventListener('click', (e) => {
    const item = e.target.closest('.trending-item');
    if (item) openMovieDetailSheet(item.dataset.movieId);
  });

  // Défilement automatique piloté en JS (pas une animation CSS) : ça permet
  // de le mettre en pause pendant une interaction manuelle (glisser du doigt,
  // molette, flèches) tout en laissant le défilement NATIF du navigateur
  // gérer cette interaction lui-même — plutôt que de devoir réimplémenter un
  // suivi de glissement à la main.
  const AUTO_SCROLL_SPEED = 0.5; // px par frame
  const RESUME_DELAY_MS = 3000; // reprise du défilement auto 3s après la dernière interaction
  let autoScrollPaused = false;
  let resumeTimer = null;

  function pauseThenScheduleResume() {
    autoScrollPaused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { autoScrollPaused = false; }, RESUME_DELAY_MS);
  }

  function tick() {
    // Ne fait le travail (qui force un recalcul de mise en page via
    // scrollLeft) QUE si l'onglet Découvrir est bien affiché — sinon cette
    // boucle tournait indéfiniment en arrière-plan, même après être passé sur
    // un autre onglet, au lieu de s'arrêter. Coût quasi nul quand invisible
    // (juste une vérification de classe), pour pouvoir reprendre sans à-coup
    // dès qu'on revient sur Découvrir.
    const isVisible = document.getElementById('view-discover')?.classList.contains('active');
    if (isVisible && !autoScrollPaused) {
      outer.scrollLeft += AUTO_SCROLL_SPEED;
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0 && outer.scrollLeft >= halfWidth) outer.scrollLeft -= halfWidth;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  outer.addEventListener('touchstart', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('touchmove', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('wheel', pauseThenScheduleResume, { passive: true });
  outer.addEventListener('scroll', pauseThenScheduleResume, { passive: true });

  // Flèches de navigation (utiles surtout au clavier/souris sur desktop, où
  // glisser à la souris est moins naturel qu'au doigt sur mobile).
  document.getElementById('trending-prev-btn').addEventListener('click', () => {
    pauseThenScheduleResume();
    outer.scrollBy({ left: -200, behavior: 'smooth' });
  });
  document.getElementById('trending-next-btn').addEventListener('click', () => {
    pauseThenScheduleResume();
    outer.scrollBy({ left: 200, behavior: 'smooth' });
  });
}

const discoverStack = document.getElementById('discover-stack');
const discoverActionsEl = document.getElementById('discover-actions');
const discoverReloadBtn = document.getElementById('discover-reload-btn');
const discoverPassBtn = document.getElementById('discover-pass-btn');
const discoverLikeBtn = document.getElementById('discover-like-btn');

// ═══════════════════════════════════════════
//  "SURPRENDS-MOI" : film totalement au hasard dans TOUTE la base TMDb —
//  pas une recommandation personnalisée (contrairement aux suggestions),
//  ni limité à la watchlist. Ouvre directement sa fiche complète.
// ═══════════════════════════════════════════
const surpriseMeBtn = document.getElementById('surprise-me-btn');
surpriseMeBtn?.addEventListener('click', async () => {
  if (surpriseMeBtn.disabled) return;
  surpriseMeBtn.disabled = true;
  const originalHtml = surpriseMeBtn.innerHTML;
  surpriseMeBtn.textContent = '⏳ Recherche...';
  try {
    const res = await fetch('/api/search?random=true');
    const data = await res.json();
    if (!data.result || !data.result.id) {
      showToast("Impossible de trouver un film pour l'instant, réessaie.");
      return;
    }
    openMovieDetailSheet(data.result.id);
  } catch {
    showToast("Impossible de charger un film au hasard pour l'instant.");
  } finally {
    surpriseMeBtn.disabled = false;
    surpriseMeBtn.innerHTML = originalHtml;
  }
});

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
  // Squelette aux dimensions d'une vraie carte de suggestion plutôt qu'un
  // texte d'attente : la mise en page ne "saute" pas à l'arrivée du contenu,
  // et la perception d'attente est bien meilleure.
  discoverStack.innerHTML = `
    <div class="discover-card discover-card-skeleton">
      <div class="skeleton-bg" style="width:100%;aspect-ratio:2/3;border-radius:var(--radius-sm);"></div>
      <div class="skeleton-text long skeleton-bg" style="margin-top:10px;height:16px;"></div>
      <div class="skeleton-text short skeleton-bg"></div>
    </div>`;

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

  // Mélange véritable (Fisher-Yates), pas le raccourci .sort(Math.random())
  // habituel (biaisé et peu fiable) : sans lui, les suggestions restaient
  // groupées par film source (donc souvent par genre), puisque allRecs les
  // accumule film de base par film de base, dans l'ordre.
  for (let i = uniqueRecs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueRecs[i], uniqueRecs[j]] = [uniqueRecs[j], uniqueRecs[i]];
  }

  discoverQueue = uniqueRecs.slice(0, 15);
  discoverLoaded = true;
  renderDiscoverStack();
}

function renderDiscoverStack() {
  if (discoverQueue.length === 0) {
    discoverStack.innerHTML = '';
    discoverActionsEl.style.display = 'none';
    discoverStack.innerHTML = '<div class="discover-empty">Tu as tout vu ! 🎉<br>Reviens plus tard ou appuie sur ↻ pour de nouvelles suggestions.</div>';
    return;
  }
  discoverActionsEl.style.display = 'flex';

  // Retire l'ancienne carte "top" (celle qui vient de s'envoler après un
  // swipe) — son animation de sortie est déjà terminée à ce stade
  // (resolveDiscoverSwipe n'est appelé qu'après le délai de l'animation).
  const oldTop = discoverStack.querySelector('.discover-card.top');
  if (oldTop) oldTop.remove();

  const existingBehind = discoverStack.querySelector('.discover-card.behind');
  const behindMatchesNewTop = existingBehind && existingBehind.dataset.movieId === String(discoverQueue[0].id);

  if (behindMatchesNewTop) {
    // Réutilise la carte déjà chargée et posée derrière (affiche déjà
    // récupérée, couleur d'accent déjà extraite) plutôt que de tout
    // reconstruire — c'était la principale source du délai ressenti entre
    // deux cartes : chaque swipe relançait un chargement d'image et une
    // extraction de couleur pour une carte qui était déjà prête juste avant.
    existingBehind.classList.remove('behind');
    existingBehind.classList.add('top');
    existingBehind.setAttribute('tabindex', '0');
    existingBehind.setAttribute('role', 'group');
    existingBehind.setAttribute('aria-label', `Suggestion : ${discoverQueue[0].title}. Flèche droite pour ajouter à la watchlist, flèche gauche pour passer.`);
    attachSwipeHandlers(existingBehind, discoverQueue[0]);
  } else {
    // Pas de correspondance (première ouverture de l'onglet, ou file
    // rechargée manuellement) : construit la carte du haut de zéro.
    if (existingBehind) existingBehind.remove();
    const topCard = buildDiscoverCardEl(discoverQueue[0], true);
    discoverStack.appendChild(topCard);
    attachSwipeHandlers(topCard, discoverQueue[0]);
  }

  // Construit la nouvelle carte "derrière" (aperçu du film suivant).
  if (discoverQueue[1]) {
    const newBehind = buildDiscoverCardEl(discoverQueue[1], false);
    discoverStack.insertBefore(newBehind, discoverStack.firstChild);
  }
}

function buildDiscoverCardEl(m, isTop) {
  const year = m.release_date?.slice(0, 4) || '????';
  const rating = m.vote_average ? m.vote_average.toFixed(1) : null;
  const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '';
  let overview = m.overview ? m.overview : 'Pas de synopsis disponible.';
  if (overview.length > 160) overview = overview.slice(0, 160) + '…';

  const el = document.createElement('div');
  el.className = 'discover-card ' + (isTop ? 'top' : 'behind');
  el.dataset.movieId = String(m.id);
  el.innerHTML = `
    <div class="discover-card-poster-wrap">
      ${posterUrl
        ? `<img class="discover-card-poster" src="${posterUrl}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">`
        : `<div class="discover-card-poster-ph">${ICONS.clapper}</div>`}
      <div class="discover-stamp like">Watchlist</div><div class="discover-stamp pass">Passer</div>
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
      setTimeout(() => resolveDiscoverSwipe(direction), 200);
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
//  QUIZ DU JOUR
// ═══════════════════════════════════════════
// Une question par jour (stable toute la journée, comme Film du jour), tirée
// d'Open Trivia DB (catégorie 11 = Entertainment: Film) — gratuit, sans clé,
// jamais à court de contenu contrairement à une banque de questions écrites
// à la main qu'il faudrait sans cesse renouveler. Un lot de 30 questions est
// récupéré une fois puis mis en cache ; chaque jour, une question du lot est
// choisie de façon déterministe (index = jour depuis l'epoch, modulo la
// taille du lot), et le lot est renouvelé une fois entièrement parcouru.
const QUIZ_BATCH_KEY = 'lbx_quiz_batch';
const QUIZ_BATCH_FETCHED_DAY_KEY = 'lbx_quiz_batch_fetched_day';
const QUIZ_STREAK_KEY = 'lbx_quiz_streak';
const QUIZ_LAST_PLAYED_KEY = 'lbx_quiz_last_played_date';
const QUIZ_LAST_RESULT_KEY = 'lbx_quiz_last_result';

function quizDaysSinceEpoch() {
  return Math.floor(Date.now() / 86400000);
}
function quizTodayStr() {
  return new Date().toISOString().slice(0, 10);
}
function quizDecodeEntities(str) {
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}
// Mélange déterministe (seed = index du jour) : l'ordre des réponses reste
// stable toute la journée, pas un nouveau tirage à chaque rafraîchissement.
function quizSeededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function ensureQuizBatch() {
  let batch = [];
  try { batch = JSON.parse(localStorage.getItem(QUIZ_BATCH_KEY)) || []; } catch {}
  const fetchedDay = parseInt(localStorage.getItem(QUIZ_BATCH_FETCHED_DAY_KEY), 10) || 0;
  const daysSinceFetch = quizDaysSinceEpoch() - fetchedDay;
  const needsRefresh = batch.length === 0 || daysSinceFetch >= batch.length || daysSinceFetch >= 30;
  if (!needsRefresh) return batch;

  try {
    const res = await fetch('https://opentdb.com/api.php?amount=30&category=11&type=multiple&encode=url3986');
    const data = await res.json();
    if (data.response_code === 0 && data.results?.length > 0) {
      batch = data.results;
      localStorage.setItem(QUIZ_BATCH_KEY, JSON.stringify(batch));
      localStorage.setItem(QUIZ_BATCH_FETCHED_DAY_KEY, String(quizDaysSinceEpoch()));
    }
  } catch {
    // Silencieux : la section reste cachée si indisponible (voir loadDailyQuiz), pas d'erreur gênante pour l'utilisateur.
  }
  return batch;
}

function getTodaysQuizQuestion(batch) {
  if (!batch || batch.length === 0) return null;
  const idx = quizDaysSinceEpoch() % batch.length;
  const raw = batch[idx];
  const question = quizDecodeEntities(decodeURIComponent(raw.question));
  const correctAnswer = quizDecodeEntities(decodeURIComponent(raw.correct_answer));
  const incorrectAnswers = raw.incorrect_answers.map(a => quizDecodeEntities(decodeURIComponent(a)));
  const allAnswers = quizSeededShuffle([correctAnswer, ...incorrectAnswers], idx);
  return { idx, question, correctAnswer, allAnswers };
}

function renderQuizStreakBadge() {
  const badge = document.getElementById('quiz-streak-badge');
  if (!badge) return;
  const streak = parseInt(localStorage.getItem(QUIZ_STREAK_KEY), 10) || 0;
  badge.innerHTML = streak > 0 ? `${ICONS.flame} ${streak}` : '';
}

function renderQuizAnsweredState(card, q, lastResult) {
  card.innerHTML = `
    <div class="quiz-question">${q.question}</div>
    <div class="quiz-answers">
      ${q.allAnswers.map(a => {
        const cls = a === q.correctAnswer ? 'correct' : (a === lastResult.picked ? 'wrong' : '');
        return `<button class="quiz-answer-btn ${cls}" disabled>${a}</button>`;
      }).join('')}
    </div>
    <div class="quiz-already-played">${lastResult.wasCorrect ? "✓ Bonne réponse aujourd'hui — reviens demain pour la suite." : `La bonne réponse était « ${q.correctAnswer} » — reviens demain.`}</div>
  `;
}

async function loadDailyQuiz() {
  const wrap = document.getElementById('quiz-wrap');
  const card = document.getElementById('quiz-card');
  if (!wrap || !card) return;

  const batch = await ensureQuizBatch();
  const q = getTodaysQuizQuestion(batch);
  if (!q) return; // API indisponible pour l'instant : section reste cachée plutôt que d'afficher une erreur

  wrap.style.display = 'block';
  renderQuizStreakBadge();

  const today = quizTodayStr();
  const lastPlayed = localStorage.getItem(QUIZ_LAST_PLAYED_KEY);
  let lastResult = null;
  try { lastResult = JSON.parse(localStorage.getItem(QUIZ_LAST_RESULT_KEY)); } catch {}

  if (lastPlayed === today && lastResult && lastResult.questionIdx === q.idx) {
    renderQuizAnsweredState(card, q, lastResult);
    return;
  }

  card.innerHTML = `
    <div class="quiz-question">${q.question}</div>
    <div class="quiz-answers">
      ${q.allAnswers.map(a => `<button class="quiz-answer-btn" data-answer="${escAttr(a)}">${a}</button>`).join('')}
    </div>
  `;

  card.querySelectorAll('.quiz-answer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const picked = btn.dataset.answer;
      const wasCorrect = picked === q.correctAnswer;
      card.querySelectorAll('.quiz-answer-btn').forEach(b => {
        b.disabled = true;
        if (b.dataset.answer === q.correctAnswer) b.classList.add('correct');
        else if (b === btn) b.classList.add('wrong');
      });

      // Série : hier → continue ; sinon (jamais joué, ou pause d'un jour ou
      // plus) → repart de 1. Une mauvaise réponse casse la série (compte
      // vraiment y répondre juste, contrairement à la série de notation qui
      // ne demande que d'être actif).
      const streak = parseInt(localStorage.getItem(QUIZ_STREAK_KEY), 10) || 0;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newStreak = wasCorrect ? (lastPlayed === yesterday ? streak + 1 : 1) : 0;

      localStorage.setItem(QUIZ_STREAK_KEY, String(newStreak));
      localStorage.setItem(QUIZ_LAST_PLAYED_KEY, today);
      localStorage.setItem(QUIZ_LAST_RESULT_KEY, JSON.stringify({ questionIdx: q.idx, wasCorrect, picked }));
      renderQuizStreakBadge();
      if (navigator.vibrate) navigator.vibrate(wasCorrect ? 20 : [20, 40, 20]);

      const resultEl = document.createElement('div');
      resultEl.className = 'quiz-result';
      resultEl.textContent = wasCorrect ? 'Bonne réponse ! 🎉' : `La bonne réponse était « ${q.correctAnswer} ».`;
      card.appendChild(resultEl);
    });
  });
}

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

// Bande-annonce : chargée seulement au clic (vignette + bouton lecture avant
// ça), pas embarquée automatiquement dès l'ouverture de la fiche. Attaché ici,
// au niveau racine (pas dans renderCastCarousel), pour qu'il fonctionne même
// pour un film sans casting. Le gestionnaire clavier générique
// (01-navigation.js) couvre déjà Entrée/Espace pour ce role="button".
mdsContentEl.addEventListener('click', (e) => {
  const trailerWrap = e.target.closest('.mds-trailer-wrap');
  if (!trailerWrap || trailerWrap.querySelector('iframe')) return;
  const key = trailerWrap.dataset.videoKey;
  trailerWrap.innerHTML = `<iframe class="mds-trailer" src="https://www.youtube.com/embed/${key}?autoplay=1" title="Bande-annonce" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
});

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
function buildMdsContent(data, localMatch, localMatchIdx) {
  const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : '';
  const year = data.release_date ? data.release_date.slice(0, 4) : '';
  const runtime = data.runtime ? `${data.runtime} min` : '';
  const genres = (data.genres || []).map(g => g.name).join(', ');
  const directorObj = data.credits?.crew?.find(c => c.job === 'Director') || null;
  const castList = (data.credits?.cast || []).slice(0, 5);
  const releaseDateStr = data.release_date
    ? new Date(data.release_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Inconnue';

  // Petit lien cliquable sur un nom de réalisateur/acteur : ouvre sa fiche
  // personne (bio + filmographie + % déjà vu). data-person-id/data-person-name
  // portés directement sur l'élément, lus par le clic délégué plus bas.
  function personLink(p) {
    return `<span class="mds-person-link" data-person-id="${p.id}" data-person-name="${escAttr(p.name)}">${escAttr(p.name)}</span>`;
  }
  const directorHtml = directorObj ? personLink(directorObj) : '';
  const castHtml = castList.map(personLink).join(', ');

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
      <div class="mds-header-left">
        <div class="mds-poster-wrap">
          ${posterUrl
            ? `<img class="mds-poster" src="${posterUrl}" alt="Affiche de ${escAttr(data.title)}" loading="lazy">`
            : `<div class="mds-poster mds-poster-ph">${ICONS.clapper}</div>`}
          ${data.vote_average ? `<div class="mds-score-stamp"><span class="mds-score-stamp-val">${data.vote_average.toFixed(1)}</span><span class="mds-score-stamp-label">TMDb</span></div>` : ''}
        </div>
      </div>
      <div class="mds-header-info">
        <div class="mds-title" id="mds-title">${data.title}</div>
        <div class="mds-meta">${[year, runtime, genres].filter(Boolean).map(s => `<span>${s}</span>`).join('')}</div>
        ${directorObj ? `<div class="mds-header-director"><span class="mds-director-label">Réalisé par</span> <b>${escAttr(directorObj.name)}</b></div>` : ''}
      </div>
    </div>

    <div class="mds-actions" style="animation-delay:.02s">
      ${localMatch
        ? `<button type="button" class="mds-action-btn" id="mds-edit-btn" data-idx="${localMatchIdx}" title="Modifier ma note">${ICONS.edit} Modifier ma note</button>`
        : `<button type="button" class="mds-action-btn primary" id="mds-rate-btn" title="Noter ce film">${ICONS.star} Noter</button>
           <button type="button" class="mds-action-btn" id="mds-watchlist-btn" title="Ajouter à la watchlist">${ICONS.target} Watchlist</button>`
      }
    </div>

    ${personalHtml}

    ${(() => {
      const trailer = pickBestTrailer(data.videos?.results || []);
      if (!trailer) return '';
      return `
      <div class="mds-section" style="animation-delay:.08s">
        <div class="mds-section-title">Bande-annonce</div>
        <div class="mds-trailer-wrap" data-video-key="${trailer.key}" role="button" tabindex="0" aria-label="Lire la bande-annonce de ${escAttr(data.title)}">
          <img class="mds-trailer-thumb" src="https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg" alt="" loading="lazy">
          <div class="mds-trailer-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
      </div>`;
    })()}

    ${data.overview ? `
      <div class="mds-section" style="animation-delay:.1s">
        <div class="mds-section-title">Synopsis</div>
        <div class="mds-overview" id="mds-overview">${escAttr(data.overview)}</div>
        <button type="button" class="mds-overview-toggle" id="mds-overview-toggle">Lire la suite ▾</button>
      </div>` : ''}

    <div class="mds-section" style="animation-delay:.15s">
      <div class="mds-section-title">Équipe</div>
      ${directorHtml ? `<div class="mds-row"><span class="mds-label">Réalisateur</span><span>${directorHtml}</span></div>` : ''}
      ${castHtml ? `<div class="mds-row"><span class="mds-label">Avec</span><span>${castHtml}</span></div>` : ''}
      ${!directorHtml && !castHtml ? `<div class="mds-row"><span class="mds-label">—</span><span>Non communiqué</span></div>` : ''}
    </div>

    <div class="mds-section" style="animation-delay:.2s">
      <div class="mds-section-title">Détails</div>
      <div class="mds-row"><span class="mds-label">Sortie</span><span>${releaseDateStr}</span></div>
      <div class="mds-row"><span class="mds-label">Budget</span><span>${formatMoney(data.budget)}</span></div>
      <div class="mds-row"><span class="mds-label">Box-office</span><span>${formatMoney(data.revenue)}</span></div>
    </div>

    ${(data.credits?.cast || []).length > 0 ? `
      <div class="mds-section" style="animation-delay:.25s">
        <div class="mds-section-title">Casting</div>
        <div class="mds-cast-carousel" id="mds-cast-carousel"></div>
      </div>` : ''}
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

// Carrousel du casting complet, en bas de la fiche film — même mécanique que
// le carrousel "Tendances" de Découvrir (défilement auto piloté en JS, pas
// une animation CSS qui bloquerait le glissement manuel natif), à vitesse
// volontairement plus lente ici (plus de monde à voir défiler, moins de
// pression pour choisir/lire rapidement).
function renderCastCarousel(castArray) {
  const outer = document.getElementById('mds-cast-carousel');
  if (!outer) return;
  const cast = castArray.filter(c => c.id).slice(0, 20);
  if (cast.length === 0) return;

  const itemsHtml = cast.map(actor => {
    const photoUrl = actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : '';
    return `
      <div class="mds-cast-item" data-person-id="${actor.id}" data-person-name="${escAttr(actor.name)}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(actor.name)}">
        ${photoUrl
          ? `<img class="mds-cast-photo" src="${photoUrl}" alt="Photo de ${escAttr(actor.name)}" loading="lazy">`
          : `<div class="mds-cast-photo mds-cast-photo-ph">${ICONS.clapper}</div>`}
        <div class="mds-cast-name">${escAttr(actor.name)}</div>
        ${actor.character ? `<div class="mds-cast-character">${escAttr(actor.character)}</div>` : ''}
      </div>`;
  }).join('');

  // Duplique la liste une fois : le défilement peut boucler sans à-coup dès
  // qu'il a parcouru l'équivalent d'une copie complète.
  outer.innerHTML = `<div class="mds-cast-track">${itemsHtml}${itemsHtml}</div>`;
  const track = outer.querySelector('.mds-cast-track');

  outer.addEventListener('click', (e) => {
    const item = e.target.closest('.mds-cast-item');
    if (item) openPersonDetailSheet(item.dataset.personId, item.dataset.personName);
  });

  const AUTO_SCROLL_SPEED = 0.3; // plus lent que le carrousel tendances (0.5) : plus de monde à voir défiler
  const RESUME_DELAY_MS = 3000;
  let autoScrollPaused = false;
  let resumeTimer = null;

  function pauseThenScheduleResume() {
    autoScrollPaused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { autoScrollPaused = false; }, RESUME_DELAY_MS);
  }

  function tick() {
    if (!autoScrollPaused && mdsEl.classList.contains('open')) {
      outer.scrollLeft += AUTO_SCROLL_SPEED;
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0 && outer.scrollLeft >= halfWidth) outer.scrollLeft -= halfWidth;
    }
    // Arrête la boucle si la fiche a été fermée (évite de faire tourner un
    // requestAnimationFrame indéfiniment pour un carrousel qu'on ne voit plus).
    if (mdsEl.classList.contains('open')) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  outer.addEventListener('touchstart', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('touchmove', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('wheel', pauseThenScheduleResume, { passive: true });
  outer.addEventListener('scroll', pauseThenScheduleResume, { passive: true });
}

// Cache le bouton "Lire la suite" si le synopsis tient déjà entièrement dans
// les lignes visibles par défaut — pas la peine de proposer un accordéon pour
// un texte qui ne déborde pas. Comparaison scrollHeight/clientHeight après un
// requestAnimationFrame, le temps que le layout (avec le clamp CSS) se stabilise.
function setupOverviewToggle() {
  const overview = document.getElementById('mds-overview');
  const toggle = document.getElementById('mds-overview-toggle');
  if (!overview || !toggle) return;
  requestAnimationFrame(() => {
    if (overview.scrollHeight <= overview.clientHeight + 2) {
      toggle.style.display = 'none';
    }
  });
}

// En-tête collant qui rétrécit : au-delà d'un seuil de défilement DANS la
// fiche (.mds-box, le conteneur qui défile réellement), l'affiche+titre
// passent en mode compact — l'inverse en repassant sous ce seuil. Un seul
// écouteur de scroll par ouverture de fiche (retiré à la fermeture) pour ne
// pas empiler des écouteurs orphelins à chaque nouvelle fiche ouverte.
const STICKY_HEADER_THRESHOLD = 80;
let stickyHeaderScrollHandler = null;
function setupStickyHeader() {
  const box = mdsEl.querySelector('.mds-box');
  const header = document.querySelector('.mds-header');
  if (!box || !header) return;
  if (stickyHeaderScrollHandler) box.removeEventListener('scroll', stickyHeaderScrollHandler);
  stickyHeaderScrollHandler = () => {
    header.classList.toggle('compact', box.scrollTop > STICKY_HEADER_THRESHOLD);
  };
  box.addEventListener('scroll', stickyHeaderScrollHandler, { passive: true });
}

// Choisit la meilleure bande-annonce parmi les vidéos TMDb : uniquement
// YouTube (seule plateforme embarquable simplement sans clé ni accord
// spécifique), en priorisant une vraie "Trailer" officielle, puis en
// préférant la version française si elle existe — sans quoi n'importe quelle
// bande-annonce YouTube fait l'affaire plutôt que rien.
function pickBestTrailer(videos) {
  const yt = videos.filter(v => v.site === 'YouTube');
  if (yt.length === 0) return null;
  const trailers = yt.filter(v => v.type === 'Trailer');
  const pool = trailers.length > 0 ? trailers : yt;
  return pool.find(v => v.official && v.iso_639_1 === 'fr')
      || pool.find(v => v.iso_639_1 === 'fr')
      || pool.find(v => v.official)
      || pool[0];
}

let mdsCurrentData = null; // données complètes du film actuellement affiché, pour les boutons d'action

async function openMovieDetailSheet(tmdbId) {
  if (!tmdbId) {
    showToast("Ce film n'a pas de fiche TMDb liée (ajouté en saisie manuelle).");
    return;
  }

  lastFocusedBeforeModal = document.activeElement;
  mdsContentEl.innerHTML = buildMdsSkeleton();
  mdsEl.classList.add('open');
  mdsCloseBtn.focus(); // déplace le focus DANS la fiche à l'ouverture (pas juste piégé une fois qu'on y est déjà)
  const mdsBoxEl = mdsEl.querySelector('.mds-box');
  if (mdsBoxEl) mdsBoxEl.scrollTop = 0; // évite de démarrer en mode compact si une fiche precedente avait été scrollée

  try {
    const res = await fetch(`/api/search?id=${tmdbId}`);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (!data || !data.title) throw new Error('no data');

    const history = loadHistory();
    const localMatch = history.find(h => String(h.tmdbId) === String(tmdbId));
    const localMatchIdx = history.findIndex(h => String(h.tmdbId) === String(tmdbId));

    mdsContentEl.innerHTML = buildMdsContent(data, localMatch, localMatchIdx);
    mdsCurrentData = data;
    renderCastCarousel(data.credits?.cast || []);
    setupOverviewToggle();
    setupStickyHeader();
    const mdsPosterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : '';
    applyPosterAccent(mdsPosterUrl, mdsEl.querySelector('.mds-box'));
  } catch (e) {
    mdsCurrentData = null;
    mdsContentEl.innerHTML = `<div class="mds-error">Impossible de charger les détails pour l'instant. Vérifie ta connexion et réessaie.</div>`;
  }
}

function closeMovieDetailSheet() {
  closeModal(mdsEl);
}

mdsCloseBtn.addEventListener('click', closeMovieDetailSheet);
mdsEl.addEventListener('click', (e) => {
  if (e.target === mdsEl) { closeMovieDetailSheet(); return; }

  const personLink = e.target.closest('.mds-person-link');
  if (personLink) {
    openPersonDetailSheet(personLink.dataset.personId, personLink.dataset.personName);
    return;
  }

  const overviewToggle = e.target.closest('#mds-overview-toggle');
  if (overviewToggle) {
    const overview = document.getElementById('mds-overview');
    const expanded = overview.classList.toggle('expanded');
    overviewToggle.textContent = expanded ? 'Réduire ▴' : 'Lire la suite ▾';
    return;
  }

  if (e.target.closest('#mds-rate-btn')) {
    if (!mdsCurrentData) return;
    const year = mdsCurrentData.release_date ? mdsCurrentData.release_date.slice(0, 4) : '????';
    closeMovieDetailSheet();
    selectMovie(mdsCurrentData, year);
    if (window.innerWidth <= 860) switchMobileNav('rating');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (e.target.closest('#mds-watchlist-btn')) {
    if (!mdsCurrentData) return;
    const year = mdsCurrentData.release_date ? mdsCurrentData.release_date.slice(0, 4) : '';
    addToWatchlistFromTMDb(mdsCurrentData, year);
    closeMovieDetailSheet();
    return;
  }

  const editBtn = e.target.closest('#mds-edit-btn');
  if (editBtn) {
    const idx = parseInt(editBtn.dataset.idx, 10);
    closeMovieDetailSheet();
    loadItem(idx);
    if (window.innerWidth <= 860) switchMobileNav('rating');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// ═══════════════════════════════════════════
//  FICHE PERSONNE (réalisateur/acteur)
// ═══════════════════════════════════════════
// Bio + filmographie complète + pourcentage déjà vu (films de sa filmographie
// présents dans l'historique de l'utilisateur). Ouverte en tapant un nom de
// réalisateur/acteur dans la fiche film.
const pdsEl = document.getElementById('person-detail-sheet');
const pdsContentEl = document.getElementById('pds-content');
const pdsCloseBtn = document.getElementById('pds-close-btn');

function buildPdsSkeleton(personName) {
  return `
    <div class="mds-skeleton">
      <div class="mds-skeleton-poster skeleton-bg"></div>
      <div class="mds-skeleton-lines">
        <div class="skeleton-text long skeleton-bg" style="height:18px;">${escAttr(personName || '')}</div>
        <div class="skeleton-text short skeleton-bg"></div>
      </div>
    </div>
    <div class="skeleton-text long skeleton-bg" style="margin-top:18px;"></div>
    <div class="skeleton-text long skeleton-bg"></div>
  `;
}

// Combine cast + équipe technique en une filmographie dédoublonnée (une
// personne peut apparaître à la fois comme actrice ET réalisatrice sur le
// même film, ex: dans les deux listes renvoyées par TMDb). Marque aussi
// chaque film comme "vu" ou non (par tmdbId dans l'historique) — utilisé à la
// fois pour le pourcentage et pour griser les affiches déjà vues.
function buildPersonFilmography(data) {
  const history = loadHistory();
  const seenIds = new Set(history.map(h => String(h.tmdbId)).filter(Boolean));

  // Limite la filmographie au rôle PRINCIPAL de la personne plutôt que de tout
  // mélanger (un réalisateur crédité comme producteur ou scénariste sur un
  // film n'a, à nos yeux ici, pas "réalisé" ce film-là — c'est ce qui gonflait
  // la filmographie de films produits/écrits en plus de ceux réalisés).
  const dept = data.known_for_department;
  let source;
  if (dept === 'Directing') {
    source = (data.movie_credits?.crew || []).filter(m => m.job === 'Director');
  } else if (dept === 'Writing') {
    source = (data.movie_credits?.crew || []).filter(m => m.department === 'Writing');
  } else if (dept === 'Acting') {
    source = data.movie_credits?.cast || [];
  } else {
    // Département moins courant (Production, Camera...) : pas de règle
    // spécifique établie, on garde le mélange complet plutôt que de risquer
    // de cacher des films pertinents pour ces cas plus rares.
    source = [...(data.movie_credits?.cast || []), ...(data.movie_credits?.crew || [])];
  }

  const seen = new Set();
  const films = [];
  source.forEach(m => {
    if (!m.id || seen.has(m.id)) return;
    seen.add(m.id);
    films.push({ id: m.id, title: m.title, release_date: m.release_date, poster_path: m.poster_path, isSeen: seenIds.has(String(m.id)) });
  });
  films.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
  return films;
}

// Pourcentage de la filmographie déjà présent dans l'historique de
// l'utilisateur — le petit "plus" ludique de cette fiche.
function computeSeenPercentage(films) {
  const seenCount = films.filter(f => f.isSeen).length;
  const pct = films.length > 0 ? Math.round((seenCount / films.length) * 100) : 0;
  return { seenCount, total: films.length, pct };
}

function buildPdsContent(data) {
  const films = buildPersonFilmography(data);
  const { seenCount, total, pct } = computeSeenPercentage(films);
  const photoUrl = data.profile_path ? `https://image.tmdb.org/t/p/w185${data.profile_path}` : '';
  const bio = data.biography
    ? (data.biography.length > 400 ? data.biography.slice(0, 400) + '…' : data.biography)
    : '';

  return `
    <div class="mds-header" style="animation-delay:0s">
      ${photoUrl
        ? `<img class="mds-poster" src="${photoUrl}" alt="Photo de ${escAttr(data.name)}" loading="lazy">`
        : `<div class="mds-poster mds-poster-ph">${ICONS.clapper}</div>`}
      <div class="mds-header-info">
        <div class="mds-title" id="pds-title">${escAttr(data.name)}</div>
        <div class="mds-meta">${escAttr(data.known_for_department || '')}</div>
      </div>
    </div>

    <div class="mds-section pds-completion" style="animation-delay:.05s">
      <div class="mds-section-title">Films vus dans sa filmographie</div>
      <div class="pds-completion-bar"><div class="pds-completion-fill" style="width:${pct}%"></div></div>
      <div class="pds-completion-label">${seenCount} / ${total} film${total > 1 ? 's' : ''} vus (${pct}%)</div>
    </div>

    ${bio ? `
      <div class="mds-section" style="animation-delay:.1s">
        <div class="mds-section-title">Biographie</div>
        <div class="mds-overview">${escAttr(bio)}</div>
      </div>` : ''}

    <div class="mds-section" style="animation-delay:.15s">
      <div class="mds-section-title">Filmographie (${total})</div>
      <div class="pds-filmography">
        ${films.map(f => {
          const posterUrl = f.poster_path ? `https://image.tmdb.org/t/p/w185${f.poster_path}` : '';
          const year = f.release_date ? f.release_date.slice(0, 4) : '';
          return `
            <div class="pds-film-item${f.isSeen ? ' seen' : ''}" data-movie-id="${f.id}" title="${f.isSeen ? 'Déjà vu' : ''}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(f.title)}${f.isSeen ? ', déjà vu' : ''}">
              ${posterUrl
                ? `<img class="pds-film-poster" src="${posterUrl}" alt="Affiche de ${escAttr(f.title)}" loading="lazy">`
                : `<div class="pds-film-poster pds-film-poster-ph">${ICONS.clapper}</div>`}
              <div class="pds-film-title">${escAttr(f.title)}</div>
              <div class="pds-film-year">${year}</div>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

async function openPersonDetailSheet(personId, personName) {
  if (!personId) return;
  lastFocusedBeforeModal = document.activeElement;
  pdsContentEl.innerHTML = buildPdsSkeleton(personName);
  pdsEl.classList.add('open');
  pdsCloseBtn.focus(); // déplace le focus DANS la fiche à l'ouverture

  try {
    const res = await fetch(`/api/search?personId=${personId}`);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (!data || !data.name) throw new Error('no data');
    pdsContentEl.innerHTML = buildPdsContent(data);
  } catch (e) {
    pdsContentEl.innerHTML = `<div class="mds-error">Impossible de charger cette fiche pour l'instant. Vérifie ta connexion et réessaie.</div>`;
  }
}

function closePersonDetailSheet() {
  closeModal(pdsEl);
}

pdsCloseBtn.addEventListener('click', closePersonDetailSheet);
pdsEl.addEventListener('click', (e) => {
  if (e.target === pdsEl) { closePersonDetailSheet(); return; }
  const filmItem = e.target.closest('.pds-film-item');
  if (filmItem) {
    closePersonDetailSheet();
    openMovieDetailSheet(filmItem.dataset.movieId);
  }
});

// ═══════════════════════════════════════════
//  GLISSER VERS LE BAS POUR FERMER
// ═══════════════════════════════════════════
// En plus de la croix (gardée pour clavier/souris/lecteurs d'écran) : sur
// mobile, glisser la fiche vers le bas la ferme, geste naturel et attendu
// pour ce genre de panneau. Ne s'active que si la fiche est déjà tout en haut
// de son propre défilement (sinon un glissement vers le bas doit d'abord
// juste faire remonter le contenu) et pas depuis une zone qui gère déjà son
// propre geste horizontal (carrousel de casting).
function initSwipeToClose(overlayEl, closeFn) {
  const box = overlayEl.querySelector('.mds-box');
  if (!box) return;
  const THRESHOLD = 110;
  let startY = 0;
  let dragging = false;
  let currentDelta = 0;

  box.addEventListener('touchstart', (e) => {
    if (box.scrollTop > 5) return;
    if (e.target.closest('.mds-cast-carousel, .mds-trailer-wrap')) return;
    startY = e.touches[0].clientY;
    dragging = true;
    box.style.transition = 'none';
  }, { passive: true });

  box.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY <= 0 || box.scrollTop > 5) { dragging = false; box.style.transition = ''; box.style.transform = ''; return; }
    currentDelta = deltaY;
    box.style.transform = `translateY(${deltaY}px) scale(1)`;
    overlayEl.style.backgroundColor = `rgba(0,0,0,${Math.max(0, 0.8 - deltaY / 250)})`;
  }, { passive: true });

  box.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    box.style.transition = 'transform .22s ease';
    if (currentDelta > THRESHOLD) {
      box.style.transform = `translateY(100%) scale(1)`;
      setTimeout(() => {
        closeFn();
        box.style.transform = '';
        box.style.transition = '';
        overlayEl.style.backgroundColor = '';
      }, 180);
    } else {
      box.style.transform = '';
      overlayEl.style.backgroundColor = '';
    }
    currentDelta = 0;
  });
}

initSwipeToClose(mdsEl, closeMovieDetailSheet);
initSwipeToClose(pdsEl, closePersonDetailSheet);

// ═══════════════════════════════════════════
//  DUELS ELO
// ═══════════════════════════════════════════
// "Lequel préfères-tu ?" : l'app propose deux films déjà vus, on choisit, et
// un classement personnel se construit duel après duel — système ELO, le même
// que les échecs. Pourquoi ELO plutôt qu'un tri manuel : chaque duel n'exige
// qu'une micro-décision facile ("celui-là"), et le classement global émerge
// tout seul, y compris entre films jamais comparés directement.
//
// Les cotes vivent dans leur propre clé localStorage (lbx_duels), séparée de
// l'historique : l'export/import de l'historique n'est pas pollué par des
// données de jeu, et supprimer un film de l'historique ne casse rien ici
// (sa cote devient simplement orpheline et ignorée).

const DUELS_KEY = 'lbx_duels';
const DUEL_START_ELO = 1200;
const DUEL_K = 32; // facteur K standard : assez réactif sans être erratique

function duelFilmKey(item) {
  return (item.title + '|' + (item.year || '')).toLowerCase();
}

function loadDuelsData() {
  try {
    const d = JSON.parse(localStorage.getItem(DUELS_KEY)) || {};
    // pairs : memoire des affrontements deja joues (cle canonique triee),
    // pour ne JAMAIS reproposer deux fois le meme duel. Le || {} assure la
    // compatibilite avec les donnees d'avant cette fonctionnalite.
    return { ratings: d.ratings || {}, totalDuels: d.totalDuels || 0, pairs: d.pairs || {} };
  }
  catch { return { ratings: {}, totalDuels: 0, pairs: {} }; }
}

function duelPairKey(keyA, keyB) {
  return [keyA, keyB].sort().join('||');
}
function saveDuelsData(data) {
  localStorage.setItem(DUELS_KEY, JSON.stringify(data));
}

function getDuelRating(data, key) {
  return data.ratings[key] || { elo: DUEL_START_ELO, duels: 0 };
}

// Cœur mathématique dans 03b-pure-logic.js (computeEloUpdate), testé dans
// tests/duels.test.js — ici uniquement le stockage, la sélection de paires
// et le rendu.

// Choisit la paire du prochain duel : privilégie les films les MOINS déjà
// duellés, puis parmi eux, deux films aux cotes PROCHES — mais JAMAIS deux
// films qui se sont déjà affrontés (mémoire data.pairs). Si toutes les paires
// possibles ont été jouées, retourne { exhausted: true } pour un message dédié.
function pickDuelPair() {
  const history = loadHistory();
  if (history.length < 2) return null;
  const data = loadDuelsData();

  // Déduplique par clé (re-visionnages = même film)
  const seen = new Set();
  const films = [];
  for (const item of history) {
    const key = duelFilmKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    films.push({ key, item, ...getDuelRating(data, key) });
  }
  if (films.length < 2) return null;

  // PASSE 1 — départage : s'il existe quelque part une paire jamais affrontée
  // de films ayant la MÊME note dans l'historique (deux 8/10 à ordonner
  // enfin), elle passe en priorité absolue. Parmi ces paires, celles ayant le
  // moins duellé d'abord, avec un peu de hasard entre égalités.
  const tiebreakPairs = [];
  for (let i = 0; i < films.length; i++) {
    const si = parseFloat(films[i].item.score);
    if (isNaN(si)) continue;
    for (let j = i + 1; j < films.length; j++) {
      if (parseFloat(films[j].item.score) !== si) continue;
      if (data.pairs[duelPairKey(films[i].key, films[j].key)]) continue;
      tiebreakPairs.push([films[i], films[j]]);
    }
  }
  if (tiebreakPairs.length > 0) {
    tiebreakPairs.sort((a, b) => (a[0].duels + a[1].duels) - (b[0].duels + b[1].duels) || Math.random() - 0.5);
    const [first, second] = tiebreakPairs[0];
    return Math.random() < 0.5 ? [first, second] : [second, first];
  }

  // PASSE 2 — cas général : les moins expérimentés d'abord, adversaire proche en cote.
  const byExperience = films.slice().sort((a, b) => a.duels - b.duels || Math.random() - 0.5);

  for (const first of byExperience) {
    const unfought = films.filter(f =>
      f.key !== first.key && !data.pairs[duelPairKey(first.key, f.key)]
    );
    if (unfought.length === 0) continue;
    unfought.sort((a, b) => Math.abs(a.elo - first.elo) - Math.abs(b.elo - first.elo));
    const nearest = unfought.slice(0, Math.min(5, unfought.length));
    const second = nearest[Math.floor(Math.random() * nearest.length)];
    return Math.random() < 0.5 ? [first, second] : [second, first];
  }

  return { exhausted: true }; // toutes les paires possibles ont été jouées
}

function resolveDuel(winnerKey, loserKey) {
  const data = loadDuelsData();
  const w = getDuelRating(data, winnerKey);
  const l = getDuelRating(data, loserKey);
  const { winnerElo, loserElo, delta } = computeEloUpdate(w.elo, l.elo, DUEL_K);
  data.ratings[winnerKey] = { elo: winnerElo, duels: w.duels + 1 };
  data.ratings[loserKey] = { elo: loserElo, duels: l.duels + 1 };
  data.pairs[duelPairKey(winnerKey, loserKey)] = true; // ce duel ne sera plus jamais reproposé
  data.totalDuels = (data.totalDuels || 0) + 1;
  saveDuelsData(data);
  return delta;
}

// Classement : uniquement les films ayant réellement duellé (>= 3 duels pour
// éviter qu'un film à 1 victoire chanceuse squatte le podium), croisé avec
// l'historique pour ignorer les cotes orphelines de films supprimés.
function computeDuelRanking(minDuels = 3) {
  const history = loadHistory();
  const data = loadDuelsData();
  const seen = new Set();
  const ranked = [];
  for (const item of history) {
    const key = duelFilmKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    const r = data.ratings[key];
    if (r && r.duels >= minDuels) ranked.push({ key, item, elo: r.elo, duels: r.duels });
  }
  ranked.sort((a, b) => b.elo - a.elo);
  return ranked;
}

// ── Rendu ──
let currentDuelPair = null;

function duelPosterHtml(item) {
  return item.poster
    ? `<img class="duel-poster" src="${item.poster}" alt="" loading="lazy" decoding="async">`
    : `<div class="duel-poster duel-poster-ph">${ICONS.clapper}</div>`;
}

function renderDuel() {
  const arena = document.getElementById('duel-arena');
  const emptyEl = document.getElementById('duel-empty');
  if (!arena || !emptyEl) return;

  currentDuelPair = pickDuelPair();
  if (!currentDuelPair || currentDuelPair.exhausted) {
    arena.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.textContent = currentDuelPair && currentDuelPair.exhausted
      ? 'Tous les duels possibles ont été joués — ton classement est complet ! Note de nouveaux films pour relancer l\'arène.'
      : 'Note au moins 2 films pour lancer les duels.';
    if (currentDuelPair && currentDuelPair.exhausted) currentDuelPair = null;
    return;
  }
  arena.style.display = '';
  emptyEl.style.display = 'none';

  const [a, b] = currentDuelPair;
  arena.innerHTML = `
    <div class="duel-side" data-key="${escAttr(a.key)}" role="button" tabindex="0" aria-label="Choisir ${escAttr(a.item.title)}">
      ${duelPosterHtml(a.item)}
      <div class="duel-title">${escAttr(a.item.title)}</div>
      <div class="duel-year">${a.item.year || ''}</div>
    </div>
    <div class="duel-vs">VS</div>
    <div class="duel-side" data-key="${escAttr(b.key)}" role="button" tabindex="0" aria-label="Choisir ${escAttr(b.item.title)}">
      ${duelPosterHtml(b.item)}
      <div class="duel-title">${escAttr(b.item.title)}</div>
      <div class="duel-year">${b.item.year || ''}</div>
    </div>
  `;
}

function renderDuelRanking() {
  const listEl = document.getElementById('duel-ranking-list');
  const counterEl = document.getElementById('duel-counter');
  if (!listEl) return;
  const data = loadDuelsData();
  if (counterEl) counterEl.textContent = data.totalDuels > 0 ? `${data.totalDuels} duel${data.totalDuels > 1 ? 's' : ''}` : '';

  const ranking = computeDuelRanking().slice(0, 10);
  if (ranking.length === 0) {
    listEl.innerHTML = `<div class="duel-ranking-empty">Ton podium apparaîtra après quelques duels (3 duels minimum par film).</div>`;
    return;
  }
  // Podium (top 3) toujours visible, sans les points ELO — c'est l'ORDRE qui
  // compte pour l'utilisateur, le chiffre interne n'apporte que du bruit. Le
  // reste du top 10 se déplie à la demande (accordéon natif <details>).
  // Médailles en SVG (même dessin, trois teintes or/argent/bronze via CSS)
  // plutôt que les emojis 🥇🥈🥉 : rendu identique sur tous les appareils,
  // couleurs cohérentes avec le thème actif.
  const medals = [
    `<span class="duel-medal duel-medal-gold">${ICONS.medal}</span>`,
    `<span class="duel-medal duel-medal-silver">${ICONS.medal}</span>`,
    `<span class="duel-medal duel-medal-bronze">${ICONS.medal}</span>`,
  ];
  const rowHtml = (r, i) => `
    <div class="duel-rank-row">
      <span class="duel-rank-pos">${medals[i] || (i + 1)}</span>
      <span class="duel-rank-title">${escAttr(r.item.title)}</span>
    </div>`;
  const podium = ranking.slice(0, 3).map(rowHtml).join('');
  const rest = ranking.slice(3);
  const restHtml = rest.length > 0 ? `
    <details class="duel-rank-more">
      <summary>Voir le reste du top 10 (${rest.length})</summary>
      ${rest.map((r, i) => rowHtml(r, i + 3)).join('')}
    </details>` : '';
  listEl.innerHTML = podium + restHtml;
}

function renderDuelsSection() {
  renderDuel();
  renderDuelRanking();
}

// Gestion des choix : délégué au niveau racine (leçon apprise : jamais dans
// une fonction de rendu conditionnelle, sinon il disparaît selon le chemin).
document.getElementById('duel-arena')?.addEventListener('click', (e) => {
  const side = e.target.closest('.duel-side');
  if (!side || !currentDuelPair) return;
  const winnerKey = side.dataset.key;
  const loser = currentDuelPair.find(f => f.key !== winnerKey);
  const winner = currentDuelPair.find(f => f.key === winnerKey);
  if (!winner || !loser) return;

  resolveDuel(winner.key, loser.key);
  if (navigator.vibrate) navigator.vibrate(15);

  // Petit feedback visuel avant d'enchaîner sur la paire suivante
  side.classList.add('duel-winner');
  currentDuelPair = null; // fige les clics le temps de l'animation
  setTimeout(() => {
    renderDuelsSection();
  }, 450);
});

document.getElementById('duel-arena')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const side = e.target.closest('.duel-side');
  if (side) { e.preventDefault(); side.click(); }
});

document.getElementById('duel-skip-btn')?.addEventListener('click', () => {
  renderDuel(); // nouvelle paire, aucune cote touchée
});

// ── Duel du jour (onglet Découvrir) ──
// Un duel par jour, à côté du Quiz du jour : même rituel quotidien. Réutilise
// exactement la même mécanique (sélection de paire, résolution, mémoire des
// paires) — seule la limite quotidienne s'ajoute. Jouer le duel du jour
// alimente le même classement que l'arène du Profil.
const DAILY_DUEL_DATE_KEY = 'lbx_daily_duel_date';
let dailyDuelPair = null;

function renderDailyDuel() {
  const wrap = document.getElementById('daily-duel-wrap');
  const card = document.getElementById('daily-duel-card');
  if (!wrap || !card) return;

  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(DAILY_DUEL_DATE_KEY) === today) {
    wrap.style.display = 'block';
    card.innerHTML = `<div class="quiz-already-played">✓ Duel du jour joué — reviens demain pour le suivant.</div>`;
    return;
  }

  dailyDuelPair = pickDuelPair();
  if (!dailyDuelPair) {
    wrap.style.display = 'none'; // moins de 2 films : section absente (rien d'utile à dire à un nouvel utilisateur ici)
    return;
  }
  if (dailyDuelPair.exhausted) {
    // Tout a été joué : le dire explicitement plutôt que de faire disparaître
    // la section sans explication (on croirait à un bug).
    wrap.style.display = 'block';
    card.innerHTML = `<div class="quiz-already-played">Tous les duels possibles ont été joués — note de nouveaux films pour relancer l'arène !</div>`;
    dailyDuelPair = null;
    return;
  }
  wrap.style.display = 'block';

  const [a, b] = dailyDuelPair;
  card.innerHTML = `
    <div class="duel-arena">
      <div class="duel-side" data-key="${escAttr(a.key)}" role="button" tabindex="0" aria-label="Choisir ${escAttr(a.item.title)}">
        ${duelPosterHtml(a.item)}
        <div class="duel-title">${escAttr(a.item.title)}</div>
        <div class="duel-year">${a.item.year || ''}</div>
      </div>
      <div class="duel-vs">VS</div>
      <div class="duel-side" data-key="${escAttr(b.key)}" role="button" tabindex="0" aria-label="Choisir ${escAttr(b.item.title)}">
        ${duelPosterHtml(b.item)}
        <div class="duel-title">${escAttr(b.item.title)}</div>
        <div class="duel-year">${b.item.year || ''}</div>
      </div>
    </div>
  `;
}

document.getElementById('daily-duel-card')?.addEventListener('click', (e) => {
  const side = e.target.closest('.duel-side');
  if (!side || !dailyDuelPair) return;
  const winner = dailyDuelPair.find(f => f.key === side.dataset.key);
  const loser = dailyDuelPair.find(f => f.key !== side.dataset.key);
  if (!winner || !loser) return;

  resolveDuel(winner.key, loser.key);
  localStorage.setItem(DAILY_DUEL_DATE_KEY, new Date().toISOString().slice(0, 10));
  if (navigator.vibrate) navigator.vibrate(15);

  side.classList.add('duel-winner');
  dailyDuelPair = null;
  setTimeout(() => renderDailyDuel(), 500);
});
document.getElementById('daily-duel-card')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const side = e.target.closest('.duel-side');
  if (side) { e.preventDefault(); side.click(); }
});
