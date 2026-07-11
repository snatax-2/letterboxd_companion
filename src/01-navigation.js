// ═══════════════════════════════════════════
//  GESTION DES ONGLETS (Desktop & Mobile)
// ═══════════════════════════════════════════
const tabHistBtn = document.getElementById('tab-right-history');
const tabWlBtn = document.getElementById('tab-right-watchlist');
const tabDiscoverBtn = document.getElementById('tab-right-discover');
const viewHist = document.getElementById('view-history');
const viewWl = document.getElementById('view-watchlist');
const viewDiscover = document.getElementById('view-discover');

function switchRightTab(tabName) {
  const tabs = {
    history:   { btn: tabHistBtn,     view: viewHist },
    watchlist: { btn: tabWlBtn,       view: viewWl },
    discover:  { btn: tabDiscoverBtn, view: viewDiscover },
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

const navRating = document.getElementById('nav-rating');
const navHistory = document.getElementById('nav-history');
const navWatchlist = document.getElementById('nav-watchlist');
const navDiscover = document.getElementById('nav-discover');
const colRating = document.getElementById('col-rating');
const colRightViews = document.getElementById('col-right-views');

// Redémarre l'animation d'entrée (mobileViewIn) sur un élément : on retire la
// classe, on force un reflow (lecture d'une propriété layout), puis on la
// rajoute — sinon le navigateur ne rejoue pas l'animation si la classe était
// déjà présente.
function playMobileViewAnim(el) {
  el.classList.remove('mobile-view-anim');
  void el.offsetWidth;
  el.classList.add('mobile-view-anim');
}

function switchMobileNav(view) {
  navRating.classList.remove('active');
  navHistory.classList.remove('active');
  navWatchlist.classList.remove('active');
  navDiscover.classList.remove('active');
  navRating.removeAttribute('aria-current');
  navHistory.removeAttribute('aria-current');
  navWatchlist.removeAttribute('aria-current');
  navDiscover.removeAttribute('aria-current');

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
  }
}

navRating.addEventListener('click', () => switchMobileNav('rating'));
navHistory.addEventListener('click', () => switchMobileNav('history'));
navWatchlist.addEventListener('click', () => switchMobileNav('watchlist'));
navDiscover.addEventListener('click', () => switchMobileNav('discover'));

window.addEventListener('resize', () => {
  if (window.innerWidth > 860) {
    colRating.style.display = '';
    colRightViews.style.display = '';
  } else {
    const activeNavId = document.querySelector('.nav-btn.active')?.id;
    if (activeNavId === 'nav-history') switchMobileNav('history');
    else if (activeNavId === 'nav-watchlist') switchMobileNav('watchlist');
    else if (activeNavId === 'nav-discover') switchMobileNav('discover');
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
  const TAB_ORDER = ['rating', 'history', 'watchlist', 'discover'];
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
      '#carousel-container, .discover-card, .wl-card, input[type="range"], input[type="text"], textarea, .modal-overlay.open'
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
    } else if (dx > 0 && idx > 0) {
      switchMobileNav(TAB_ORDER[idx - 1]); // glissement vers la droite -> onglet précédent
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }, { passive: true });
})();
