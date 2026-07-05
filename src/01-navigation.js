// ═══════════════════════════════════════════
//  GESTION DES ONGLETS (Desktop & Mobile)
// ═══════════════════════════════════════════
const tabHistBtn = document.getElementById('tab-right-history');
const tabWlBtn = document.getElementById('tab-right-watchlist');
const viewHist = document.getElementById('view-history');
const viewWl = document.getElementById('view-watchlist');

function switchRightTab(tabName) {
  if (tabName === 'history') {
    tabHistBtn.classList.add('active');
    tabWlBtn.classList.remove('active');
    viewHist.classList.add('active');
    viewWl.classList.remove('active');
  } else {
    tabHistBtn.classList.remove('active');
    tabWlBtn.classList.add('active');
    viewHist.classList.remove('active');
    viewWl.classList.add('active');
  }
}

tabHistBtn.addEventListener('click', () => switchRightTab('history'));
tabWlBtn.addEventListener('click', () => switchRightTab('watchlist'));

const navRating = document.getElementById('nav-rating');
const navHistory = document.getElementById('nav-history');
const navWatchlist = document.getElementById('nav-watchlist');
const colRating = document.getElementById('col-rating');
const colRightViews = document.getElementById('col-right-views');

function switchMobileNav(view) {
  navRating.classList.remove('active');
  navHistory.classList.remove('active');
  navWatchlist.classList.remove('active');
  
  colRating.style.display = 'none';
  colRightViews.style.display = 'none';

  if (view === 'rating') {
    navRating.classList.add('active');
    colRating.style.display = 'block'; 
  } else if (view === 'history') {
    navHistory.classList.add('active');
    colRightViews.style.display = 'flex';
    switchRightTab('history');
  } else if (view === 'watchlist') {
    navWatchlist.classList.add('active');
    colRightViews.style.display = 'flex';
    switchRightTab('watchlist');
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

