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

// Vit ici (pas dans 11-discover.js) car référencée dès le premier appel de
// switchRightTab() au démarrage — 01-navigation.js s'exécute AVANT
// 11-discover.js dans la concaténation (voir scripts/build-app-js.js), donc
// une déclaration `let` là-bas serait encore dans sa zone morte temporelle
// à ce moment précis : ReferenceError qui bloque tout le script, jamais
// rencontré avant que Découvrir devienne l'onglet ouvert au démarrage.
let discoverLoaded = false;

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
  // Ludex 2.0 : Découvrir entièrement repensé (voir 11-discover.js) — un
  // seul point d'entrée, chargé une fois au premier affichage (pas de
  // re-fetch à chaque fois qu'on revient sur l'onglet).
  if (tabName === 'discover' && !discoverLoaded) {
    discoverLoaded = true;
    if (typeof loadDiscoverTab === 'function') loadDiscoverTab();
  }
  // Duels vit désormais dans Profil (arène + classement) — rendu à chaque
  // affichage pour que la paire proposée reste à jour avec les derniers
  // films notés, comme avant son déplacement depuis Découvrir.
  if (tabName === 'profile' && typeof renderDuelsSection === 'function') {
    renderDuelsSection();
  }
  if (tabName === 'profile') {
    if (typeof renderProfileExtras === 'function') renderProfileExtras(loadHistory());
    // Ludex 2.0 : renderCuratedListsCard() retiré — "Classiques à explorer"
    // a quitté Profil (voir Ludex_Specifications_Profil), remplacé par le
    // carrousel "Top 100 films TMDb" dans Découvrir (voir fetchTopRated(),
    // 11-discover.js), purement éditorial et sans lien avec l'historique.
  }
  // Rattrape un renderStats() sauté pendant que Profil était masqué (rendu
  // ciblé : pas de recalcul du radar/heatmap/badges à chaque sauvegarde si
  // personne ne regardait cet onglet — voir renderAll() dans 06-history.js).
  if (tabName === 'profile' && typeof renderProfileIfDirty === 'function') {
    renderProfileIfDirty();
  }
  // Ludex 2.0 : l'aperçu de swipe n'a plus lieu d'être — l'Historique est
  // passé en grille, il n'y a plus de geste caché à révéler (voir
  // 06b-history-actions.js). maybePlaySwipeHint() reste définie
  // (06a-history-list.js) mais n'est plus appelée nulle part.
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

  // Reflète l'onglet courant dans l'URL (#discover, #history...) — deux
  // bénéfices concrets : un lien copié/mis en favori rouvre sur le bon
  // onglet, et un rechargement de page n'atterrit plus systématiquement sur
  // Découvrir. replaceState (pas pushState) : ceci ne doit PAS créer
  // d'entrée d'historique à chaque clic d'onglet, seulement tenir l'URL à
  // jour sur l'entrée courante. Le bouton Retour reste géré par
  // 20-back-navigation.js (une seule entrée sentinelle, quel que soit le
  // nombre d'onglets visités) — passer `history.state` inchangé préserve
  // cette sentinelle si elle est déjà posée sur l'entrée courante.
  if (location.hash !== `#${view}`) {
    history.replaceState(history.state, '', `#${view}`);
  }
}

navRating.addEventListener('click', () => switchMobileNav('rating'));
navHistory.addEventListener('click', () => switchMobileNav('history'));
navWatchlist.addEventListener('click', () => switchMobileNav('watchlist'));
navDiscover.addEventListener('click', () => switchMobileNav('discover'));
navProfile.addEventListener('click', () => switchMobileNav('profile'));

// Un seul système de bascule de vue à toutes les tailles d'écran désormais
// (voir styles.css : la grille à deux colonnes est remplacée par des onglets
// uniques, positionnés en haut sur PC et en bas sur mobile) — plus besoin de
// réagir différemment au redimensionnement selon la largeur.
// Découvrir est l'onglet ouvert au démarrage par défaut (cohérent avec son
// ordre en tête de la barre de navigation) — sauf si l'URL désigne déjà un
// autre onglet (lien partagé, favori, ou simple rechargement de page : voir
// le replaceState en fin de switchMobileNav ci-dessus).
const ONGLETS_VALIDES = ['discover', 'watchlist', 'rating', 'history', 'profile'];
const ongletInitial = ONGLETS_VALIDES.includes(location.hash.slice(1))
  ? location.hash.slice(1)
  : 'discover';
// Différé au tick suivant (setTimeout 0) : app.js est la concaténation de
// ~28 fichiers exécutés dans l'ordre, et 01-navigation.js est tôt dans cet
// ordre — un appel immédiat à switchMobileNav(...) atteint le code de
// 11-discover.js (discoverMediaType, CAROUSEL_SOURCES...), pas encore
// exécuté à ce stade. Même classe de bug "Cannot access ... before
// initialization" que celle déjà documentée dans 03-foundation.js, jamais
// rencontrée avant que Découvrir devienne l'onglet ouvert au démarrage
// (l'ancien 'rating' ne déclenchait aucun appel à ce code).
setTimeout(() => switchMobileNav(ongletInitial), 0);

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
    '#carousel-container, .carousel-row, .choix-du-jour-card, .wl-card, .hist-item, .wl-lists-row, .heatmap-scroll, #quick-stars-container, input[type="range"], input[type="text"], textarea, .modal-overlay.open'
  );
}

(function initMobileSwipeNav() {
  // Ordre aligné sur la disposition visuelle de la barre (gauche à droite) :
  // Découvrir, À voir, Noter, Historique, Profil — un swipe suit désormais
  // le même sens que ce qu'on voit à l'écran.
  const TAB_ORDER = ['discover', 'watchlist', 'rating', 'history', 'profile'];
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

// L'écouteur keydown global qui rattrapait Entrée/Espace sur les
// <div role="button" tabindex="0"> a été RETIRÉ : ces cartes cliquables sont
// désormais de vrais <button>, que le navigateur active nativement au
// clavier. Le palliatif n'avait plus rien à rattraper.

// Ludex 2.0 : animations au tap sur la navigation et les 5 bascules
// Films/Séries (voir Ludex_Explication_Switch + Ludex_Animations_
// Interactives — documents de spécification). Un seul écouteur délégué
// sur tout le document plutôt qu'un par bouton (ils vivent dans des zones
// différentes : barre de navigation fixe, + 5 endroits disséminés dans
// Noter/Historique/Watchlist/Découvrir/Profil).
//
// Noter (#nav-rating) reste sur l'ancien "pop" générique appliqué à
// l'icône elle-même (voir .tap-pop, styles.css) — inchangé à la demande
// explicite de l'utilisateur. Les 4 autres onglets de nav et les 5
// switches ont chacun leur propre animation ciblée sur une sous-partie du
// SVG (aiguille, signet, barres, tête/corps, clap, antenne) — la classe
// "animate" se pose donc sur le BOUTON (.nav-btn / .mode-tab), pas sur
// l'icône, pour que les sélecteurs CSS descendants (ex: .nav-btn.animate
// .icon-compass .needle) puissent cibler la bonne sous-partie.
//
// void el.offsetWidth (le "reflow hack") entre le retrait et l'ajout de la
// classe, dans les deux cas : sans ça, retaper très vite le même bouton
// avant la fin de l'animation précédente ne la redéclenche pas (le
// navigateur voit juste "la classe est déjà là", aucun changement à animer).
document.addEventListener('click', (e) => {
  const fabIcon = e.target.closest('#nav-rating')?.querySelector('.nav-btn-icon');
  if (fabIcon) {
    fabIcon.classList.remove('tap-pop');
    void fabIcon.offsetWidth;
    fabIcon.classList.add('tap-pop');
    return;
  }
  const el = e.target.closest('.nav-btn:not(#nav-rating), .mode-tab');
  if (!el) return;
  el.classList.remove('animate');
  void el.offsetWidth;
  el.classList.add('animate');

  // Ludex 2.0 : positionne la pastille glissante du switch Films/Séries
  // (voir .toggle-slider, styles.css) — même écouteur, pas un de plus.
  // Détection générique par la présence de l'icône TV plutôt qu'un
  // identifiant précis : les 5 switches n'utilisent pas tous le même
  // schéma d'id/attribut (id="...-tv", data-media-type="tv"...), mais
  // tous ont systématiquement .icon-tv sur le bouton "Séries".
  const tabsContainer = el.closest('.mode-tabs');
  if (tabsContainer) {
    tabsContainer.classList.toggle('series-active', !!el.querySelector('.icon-tv'));
  }
});
