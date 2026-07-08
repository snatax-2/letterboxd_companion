// ═══════════════════════════════════════════
//  GESTION DES ONGLETS (Desktop & Mobile)
// ═══════════════════════════════════════════
const tabHistBtn = document.getElementById('tab-right-history');
const tabWlBtn = document.getElementById('tab-right-watchlist');
const viewHist = document.getElementById('view-history');
const viewWl = document.getElementById('view-watchlist');

function switchRightTab(tabName) {
  const isHistory = tabName === 'history';
  tabHistBtn.classList.toggle('active', isHistory);
  tabWlBtn.classList.toggle('active', !isHistory);
  tabHistBtn.setAttribute('aria-selected', String(isHistory));
  tabWlBtn.setAttribute('aria-selected', String(!isHistory));
  viewHist.classList.toggle('active', isHistory);
  viewWl.classList.toggle('active', !isHistory);
}

tabHistBtn.addEventListener('click', () => switchRightTab('history'));
tabWlBtn.addEventListener('click', () => switchRightTab('watchlist'));

const navRating = document.getElementById('nav-rating');
const navHistory = document.getElementById('nav-history');
const navWatchlist = document.getElementById('nav-watchlist');
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
  navRating.removeAttribute('aria-current');
  navHistory.removeAttribute('aria-current');
  navWatchlist.removeAttribute('aria-current');
  
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
  }
}

navRating.addEventListener('click', () => switchMobileNav('rating'));
navHistory.addEventListener('click', () => switchMobileNav('history'));
navWatchlist.addEventListener('click', () => switchMobileNav('watchlist'));

window.addEventListener('resize', () => {
  if (window.innerWidth > 860) {
    colRating.style.display = '';
    colRightViews.style.display = '';
  } else {
    const activeNavId = document.querySelector('.nav-btn.active')?.id;
    if (activeNavId === 'nav-history') switchMobileNav('history');
    else if (activeNavId === 'nav-watchlist') switchMobileNav('watchlist');
    else switchMobileNav('rating');
  }
});

if (window.innerWidth <= 860) {
  switchMobileNav('rating');
}

