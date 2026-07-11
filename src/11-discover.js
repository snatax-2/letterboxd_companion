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
      <div class="trending-item" data-movie-id="${m.id}">
        <img class="trending-item-poster" src="${posterUrl}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">
        <div class="trending-item-title">${escAttr(m.title)}</div>
      </div>`;
  }).join('');

  // La piste contient la liste EN DOUBLE : l'animation glisse de 0 à -50%,
  // ce qui retombe exactement sur une copie identique de la première moitié
  // — boucle infinie sans à-coup ni "retour au début" visible.
  outer.innerHTML = `<div class="trending-carousel-track">${itemsHtml}${itemsHtml}</div>`;
  const track = outer.querySelector('.trending-carousel-track');

  outer.addEventListener('click', (e) => {
    const item = e.target.closest('.trending-item');
    if (item) openMovieDetailSheet(item.dataset.movieId);
  });
  // Pause pendant l'interaction (survol souris, ou doigt posé sur mobile) —
  // sinon le défilement continue de bouger sous le doigt pendant qu'on essaie
  // de taper précisément sur une affiche.
  outer.addEventListener('touchstart', () => track.classList.add('paused'), { passive: true });
  outer.addEventListener('touchend', () => track.classList.remove('paused'));
}

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
