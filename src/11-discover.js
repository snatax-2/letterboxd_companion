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
let discoverLoaded = false;
let discoverLoadFailed = false; // évite de re-fetch à chaque fois qu'on rouvre l'onglet

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
    facts.push(`Tagline officielle : « ${escAttr(m.tagline)} »`);
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
  card.setAttribute('aria-label', `Voir la fiche de ${escAttr(m.title)}`);
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

  // Distingue "vraiment plus rien a suggerer" (toutes les requetes ont abouti
  // mais tout a deja ete vu) d'une panne reseau totale (aucune n'a abouti) :
  // les deux meritent des messages tres differents.
  discoverLoadFailed = shuffledTop.length > 0 && !results.some(r => r.status === 'fulfilled');

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
    discoverActionsEl.style.display = 'none';
    if (discoverLoadFailed) {
      discoverStack.innerHTML = `
        <div class="error-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
          <div class="error-state-msg">Impossible de charger les suggestions. Vérifie ta connexion.</div>
          <button type="button" class="error-retry-btn" data-retry-discover>Réessayer</button>
        </div>`;
    } else {
      discoverStack.innerHTML = '<div class="discover-empty">Tu as tout vu ! 🎉<br>Reviens plus tard ou appuie sur ↻ pour de nouvelles suggestions.</div>';
    }
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
    el.setAttribute('aria-label', `Suggestion : ${escAttr(m.title)}. Flèche droite pour ajouter à la watchlist, flèche gauche pour passer.`);
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
    <div class="quiz-question">${escAttr(q.question)}</div>
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
    <div class="quiz-question">${escAttr(q.question)}</div>
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

// Reprise après panne réseau des suggestions : délégué au niveau racine.
discoverStack?.addEventListener('click', (e) => {
  if (!e.target.closest('.error-retry-btn[data-retry-discover]')) return;
  discoverLoadFailed = false;
  loadDiscoverQueue();
});
