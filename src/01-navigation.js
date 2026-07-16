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
