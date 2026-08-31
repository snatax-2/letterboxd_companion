// ═══════════════════════════════════════════
//  DÉCOUVRIR — pilote Archives & Editorial
// ═══════════════════════════════════════════
// La refonte porte sur la présentation, pas sur la logique : la bascule
// Films/Séries, le choix stable du jour et les cinq sources de carrousels
// restent les mêmes. La recherche transversale ouvre les fiches existantes.

let discoverMediaType = 'movie'; // 'movie' | 'tv' — état du toggle, partagé par les 4 blocs
// discoverLoaded vit désormais dans 01-navigation.js (voir le commentaire
// là-bas — nécessaire dès le premier appel de switchRightTab au démarrage,
// avant que ce fichier-ci ne soit lui-même exécuté).

function normalizeItem(m) {
  // Uniformise film/série : title/name, release_date/first_air_date — pour
  // que le reste du code n'ait jamais à savoir lequel des deux il manipule.
  return {
    id: m.id,
    title: m.title || m.name || '',
    year: (m.release_date || m.first_air_date || '').slice(0, 4),
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
  };
}

// ═══════════════════════════════════════════
//  RECHERCHE ÉDITORIALE TRANSVERSALE
// ═══════════════════════════════════════════
// Une loupe compacte devient un vrai champ sans déplacer brutalement le
// contenu. La requête TMDb multi rassemble films, séries et personnes en un
// seul appel ; les résultats réutilisent ensuite les feuilles détaillées de
// production, sans nouveau parcours simulé.
const discoverSearchEl = document.getElementById('discover-search');
const discoverSearchInput = document.getElementById('discover-search-input');
const discoverSearchToggle = document.getElementById('discover-search-toggle');
const discoverSearchResults = document.getElementById('discover-search-results');
let discoverSearchTimer = null;
let discoverSearchAbortController = null;
let discoverSearchRequestId = 0;

function prepareEditorialImages(scope) {
  if (!scope) return;
  scope.querySelectorAll('img.editorial-image').forEach(image => {
    const reveal = () => image.classList.add('is-loaded');
    if (image.complete && image.naturalWidth > 0) requestAnimationFrame(reveal);
    else {
      image.addEventListener('load', reveal, { once: true });
      // Même en cas d'image indisponible, le navigateur ne doit pas laisser
      // un flou opaque éternel : le fond neutre du conteneur prend le relais.
      image.addEventListener('error', reveal, { once: true });
    }
  });
}

function clearDiscoverSearchResults() {
  if (!discoverSearchResults) return;
  discoverSearchResults.hidden = true;
  discoverSearchResults.innerHTML = '';
  discoverSearchResults.setAttribute('aria-busy', 'false');
}

function setDiscoverSearchOpen(open, { restoreFocus = false } = {}) {
  if (!discoverSearchEl || !discoverSearchInput || !discoverSearchToggle) return;
  discoverSearchEl.classList.toggle('is-open', open);
  discoverSearchInput.disabled = !open;
  discoverSearchToggle.setAttribute('aria-expanded', String(open));
  discoverSearchToggle.setAttribute('aria-label', open ? 'Fermer la recherche' : 'Ouvrir la recherche');
  if (open) {
    requestAnimationFrame(() => discoverSearchInput.focus());
    return;
  }

  clearTimeout(discoverSearchTimer);
  discoverSearchAbortController?.abort();
  discoverSearchAbortController = null;
  discoverSearchRequestId += 1;
  discoverSearchInput.value = '';
  clearDiscoverSearchResults();
  if (restoreFocus) discoverSearchToggle.focus();
}

function discoverSearchStatus(message, state = 'idle') {
  if (!discoverSearchResults) return;
  discoverSearchResults.hidden = false;
  discoverSearchResults.dataset.state = state;
  discoverSearchResults.setAttribute('aria-busy', String(state === 'loading'));
  discoverSearchResults.innerHTML = `
    <div class="discover-search-status" role="status">
      ${state === 'loading' ? '<span class="discover-search-loader" aria-hidden="true"></span>' : ''}
      <span>${escAttr(message)}</span>
    </div>`;
}

function discoverPersonDepartment(department) {
  const labels = {
    Acting: 'Interprétation',
    Directing: 'Réalisation',
    Writing: 'Écriture',
    Production: 'Production',
    Camera: 'Image',
  };
  return labels[department] || 'Personne';
}

function discoverResultMeta(item) {
  if (item.media_type === 'movie') {
    return ['Film', (item.release_date || '').slice(0, 4)].filter(Boolean).join(' · ');
  }
  if (item.media_type === 'tv') {
    return ['Série', (item.release_date || '').slice(0, 4)].filter(Boolean).join(' · ');
  }
  const knownFor = Array.isArray(item.known_for) ? item.known_for.filter(Boolean).slice(0, 2).join(', ') : '';
  return [discoverPersonDepartment(item.known_for_department), knownFor].filter(Boolean).join(' · ');
}

function discoverResultPlaceholder(mediaType) {
  if (mediaType === 'tv') return ICONS.tv;
  if (mediaType === 'person') return ICONS.person;
  return ICONS.clapperboardStroke;
}

function renderDiscoverSearchResults(items, queryText) {
  if (!discoverSearchResults) return;
  if (!items.length) {
    discoverSearchStatus(`Aucun résultat pour « ${queryText} ».`, 'empty');
    return;
  }

  discoverSearchResults.hidden = false;
  discoverSearchResults.dataset.state = 'results';
  discoverSearchResults.setAttribute('aria-busy', 'false');
  discoverSearchResults.innerHTML = `
    <div class="discover-search-results-heading">
      <span>Résultats</span>
      <span>${items.length.toString().padStart(2, '0')}</span>
    </div>
    <div class="discover-search-results-list">
      ${items.map((item, index) => {
        const imageUrl = item.poster_path ? tmdbImage(item.poster_path, 'w185') : '';
        const isPerson = item.media_type === 'person';
        return `
          <button type="button" class="discover-search-result" data-search-result-id="${escAttr(String(item.id))}" data-search-result-type="${escAttr(item.media_type)}" data-search-result-title="${escAttr(item.title)}" aria-label="Ouvrir la fiche de ${escAttr(item.title)}">
            <span class="discover-search-result-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
            <span class="discover-search-result-media${isPerson ? ' is-person' : ''}">
              ${imageUrl
                ? `<img class="editorial-image" src="${imageUrl}" alt="" loading="lazy">`
                : `<span class="discover-search-result-placeholder" aria-hidden="true">${discoverResultPlaceholder(item.media_type)}</span>`}
            </span>
            <span class="discover-search-result-copy">
              <span class="discover-search-result-title">${escAttr(item.title)}</span>
              <span class="discover-search-result-meta">${escAttr(discoverResultMeta(item))}</span>
            </span>
            <span class="discover-search-result-arrow" aria-hidden="true">↗</span>
          </button>`;
      }).join('')}
    </div>`;
  prepareEditorialImages(discoverSearchResults);
}

async function runDiscoverSearch(rawQuery) {
  const queryText = rawQuery.trim();
  if (queryText.length < 2) {
    discoverSearchAbortController?.abort();
    clearDiscoverSearchResults();
    return;
  }

  discoverSearchAbortController?.abort();
  discoverSearchAbortController = new AbortController();
  const requestId = ++discoverSearchRequestId;
  discoverSearchStatus('Recherche dans les archives…', 'loading');
  try {
    const response = await fetch(`/api/search?multiQuery=${encodeURIComponent(queryText)}`, {
      signal: discoverSearchAbortController.signal,
    });
    if (!response.ok) throw new Error(`Recherche HTTP ${response.status}`);
    const data = await response.json();
    if (requestId !== discoverSearchRequestId) return;
    renderDiscoverSearchResults(Array.isArray(data.results) ? data.results : [], queryText);
  } catch (error) {
    if (error.name === 'AbortError' || requestId !== discoverSearchRequestId) return;
    discoverSearchStatus('La recherche est momentanément indisponible. Réessaie.', 'error');
  }
}

discoverSearchToggle?.addEventListener('click', () => {
  const shouldOpen = !discoverSearchEl.classList.contains('is-open');
  hapticPulse(discoverSearchToggle, 'light');
  setDiscoverSearchOpen(shouldOpen, { restoreFocus: !shouldOpen });
});

discoverSearchInput?.addEventListener('input', () => {
  clearTimeout(discoverSearchTimer);
  discoverSearchAbortController?.abort();
  // Une réponse déjà arrivée dans la file des microtâches peut gagner la
  // course contre abort(). L'identifiant l'invalide immédiatement, avant
  // même le prochain appel debouncé.
  discoverSearchRequestId += 1;
  const queryText = discoverSearchInput.value.trim();
  if (queryText.length < 2) {
    clearDiscoverSearchResults();
    return;
  }
  discoverSearchStatus('Recherche dans les archives…', 'loading');
  discoverSearchTimer = setTimeout(() => runDiscoverSearch(queryText), 250);
});

discoverSearchEl?.addEventListener('submit', (event) => {
  event.preventDefault();
  clearTimeout(discoverSearchTimer);
  runDiscoverSearch(discoverSearchInput.value);
});

discoverSearchEl?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    setDiscoverSearchOpen(false, { restoreFocus: true });
    return;
  }
  if (event.key === 'ArrowDown' && event.target === discoverSearchInput) {
    const firstResult = discoverSearchResults?.querySelector('.discover-search-result');
    if (firstResult) {
      event.preventDefault();
      firstResult.focus();
    }
  }
});

discoverSearchResults?.addEventListener('keydown', (event) => {
  const results = [...discoverSearchResults.querySelectorAll('.discover-search-result')];
  const currentIndex = results.indexOf(document.activeElement);
  if (currentIndex < 0) return;
  if (event.key === 'ArrowDown' && results[currentIndex + 1]) {
    event.preventDefault();
    results[currentIndex + 1].focus();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (results[currentIndex - 1]) results[currentIndex - 1].focus();
    else discoverSearchInput.focus();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    setDiscoverSearchOpen(false, { restoreFocus: true });
  }
});

discoverSearchResults?.addEventListener('click', (event) => {
  const result = event.target.closest('.discover-search-result');
  if (!result) return;
  const { searchResultId: id, searchResultType: type, searchResultTitle: title } = result.dataset;
  setDiscoverSearchOpen(false, { restoreFocus: true });
  if (type === 'tv') openTvDetailSheet(id);
  else if (type === 'person') openPersonDetailSheet(id, title);
  else openMovieDetailSheet(id);
});

// ── Toggle Films/Séries ──
const discoverSegBtns = document.querySelectorAll('.discover-seg-btn');
function setDiscoverMediaType(type) {
  if (type === discoverMediaType) return;
  discoverMediaType = type;
  discoverSegBtns.forEach(b => b.classList.toggle('active', b.dataset.mediaType === type));
  // "Cinéma international" n'a de sens qu'en mode Films — en Séries, le
  // même carrousel (même source de données, juste discover/tv) devient
  // "Séries internationales".
  const intlTitleEl = document.getElementById('carousel-title-international');
  if (intlTitleEl) intlTitleEl.textContent = type === 'tv' ? 'Séries internationales' : 'Cinéma international';
  loadChoixDuJour();
  Object.keys(CAROUSEL_SOURCES).forEach(loadCarousel);
}
discoverSegBtns.forEach(btn => {
  btn.addEventListener('click', () => setDiscoverMediaType(btn.dataset.mediaType));
});

// ═══════════════════════════════════════════
//  CHOIX DU JOUR (hero)
// ═══════════════════════════════════════════
// Réutilise le tirage stable du jour (même graine que l'ancien "Film du
// jour" — un seul choix par jour, cohérent sur tous les appareils) mais
// sans le jeu de devinette : affiche + titre seulement, toute la carte
// cliquable vers la fiche.
const CHOIX_DU_JOUR_KEY = 'lbx_choix_du_jour';

async function loadChoixDuJour() {
  const heroEl = document.getElementById('choix-du-jour-card');
  if (!heroEl) return;
  const todayKey = new Date().toISOString().slice(0, 10);
  // Ludex 2.0 : une clé PAR type de média plutôt qu'une seule partagée
  // (bug signalé par l'utilisateur : "ça change 2 à 3 fois par jour") —
  // l'ancienne clé unique était écrasée à chaque bascule Films/Séries,
  // donc revenir sur Films après un passage sur Séries redéclenchait
  // systématiquement un nouveau tirage, croyant le cache absent alors
  // qu'il existait juste pour l'AUTRE type de média.
  const cacheKey = `${CHOIX_DU_JOUR_KEY}_${discoverMediaType}`;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { /* ignore */ }

  if (cached && cached.date === todayKey && cached.movie) {
    renderChoixDuJour(cached.movie);
    return;
  }

  blocChoixDuJour(heroEl).style.display = '';
  heroEl.innerHTML = `
    <span class="choix-du-jour-poster-wrap skeleton-bg" aria-hidden="true"></span>
    <span class="choix-du-jour-skeleton-copy" aria-hidden="true">
      <span class="skeleton-text short skeleton-bg"></span>
      <span class="skeleton-text long skeleton-bg"></span>
      <span class="skeleton-text short skeleton-bg"></span>
    </span>`;
  try {
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const res = await fetch(`/api/search?dailyPick=${daysSinceEpoch}&mediaType=${discoverMediaType}`);
    const data = await res.json();
    const pick = data.result;
    if (!pick) { montrerChoixDuJourIndisponible(heroEl); return; }
    const item = normalizeItem(pick);
    // Second appel pour le réalisateur (le tirage du jour ne renvoie que les
    // champs de base, sans crédits — voir dailyPick dans api/search.js). Ne
    // bloque pas l'affichage de l'affiche+titre si cet appel échoue ou tarde :
    // rendu immédiat sans réalisateur, puis complété dès qu'il arrive.
    renderChoixDuJour(item);
    localStorage.setItem(cacheKey, JSON.stringify({ date: todayKey, movie: item }));

    const detailEndpoint = discoverMediaType === 'tv' ? `tvId=${item.id}` : `id=${item.id}`;
    const detailRes = await fetch(`/api/search?${detailEndpoint}`);
    const details = await detailRes.json();
    const director = discoverMediaType === 'tv'
      ? details.created_by?.[0]?.name
      : details.credits?.crew?.find(c => c.job === 'Director')?.name;
    if (director) {
      item.director = director;
      renderChoixDuJour(item);
      localStorage.setItem(cacheKey, JSON.stringify({ date: todayKey, movie: item }));
    }
  } catch (e) {
    console.warn('Impossible de charger le choix du jour', e);
    montrerChoixDuJourIndisponible(heroEl);
  }
}

// Le squelette de chargement du hero n'est retiré que par un rendu réussi.
// Sans ce repli, une API en panne ou un appareil hors-ligne laissait le
// miroitement tourner INDÉFINIMENT — l'utilisateur attend un contenu qui
// n'arrivera jamais, sans le moindre indice. Les 4 carrousels géraient déjà
// leur échec (ils se masquent, voir loadCarousel) ; le hero, non.
// Il est masqué plutôt que remplacé par un message : c'est une suggestion du
// jour, pas une donnée que l'utilisateur a demandée — signaler son absence
// par une erreur serait disproportionné.
function montrerChoixDuJourIndisponible(heroEl) {
  heroEl.innerHTML = '';
  // On masque le BLOC (surtitre « Choix du jour » + carte), pas seulement la
  // carte : masquer la carte seule laisserait le surtitre flotter au-dessus
  // d'un vide de 24px. C'est exactement ce que font déjà les 4 carrousels,
  // qui masquent `carousel-block-*` et non la seule rangée d'affiches.
  blocChoixDuJour(heroEl).style.display = 'none';
  delete heroEl.dataset.itemId;
  delete heroEl.dataset.mediaType;
}

// Le conteneur à masquer/réafficher. Repli sur la carte elle-même si le
// balisage venait à changer, pour ne jamais planter sur un null.
function blocChoixDuJour(heroEl) {
  return heroEl.closest('.choix-du-jour-wrap') || heroEl;
}

function renderChoixDuJour(item) {
  const heroEl = document.getElementById('choix-du-jour-card');
  if (!heroEl) return;
  const posterUrl = item.poster_path ? tmdbImage(item.poster_path, 'w342') : '';
  const mediaLabel = discoverMediaType === 'tv' ? 'Série du jour' : 'Film du jour';
  const creatorLabel = discoverMediaType === 'tv' ? 'Créée par' : 'Réalisé par';
  blocChoixDuJour(heroEl).style.display = '';  // annule un masquage laissé par un échec précédent
  heroEl.innerHTML = `
    <span class="choix-du-jour-poster-wrap">
      ${posterUrl
        ? `<img class="choix-du-jour-poster editorial-image" src="${posterUrl}" alt="Affiche de ${escAttr(item.title)}">`
        : `<span class="choix-du-jour-poster-placeholder" aria-hidden="true">${discoverMediaType === 'tv' ? ICONS.tv : ICONS.clapperboardStroke}</span>`}
      <span class="choix-du-jour-catalogue-index" aria-hidden="true">01</span>
    </span>
    <span class="choix-du-jour-content">
      <span class="choix-du-jour-kicker">${mediaLabel}</span>
      <span class="choix-du-jour-title">${escAttr(item.title)}</span>
      ${item.director ? `<span class="choix-du-jour-director"><span>${creatorLabel}</span> ${escAttr(item.director)}</span>` : ''}
      ${item.year ? `<span class="choix-du-jour-year">${escAttr(item.year)}</span>` : ''}
      <span class="choix-du-jour-open">Ouvrir la fiche <span aria-hidden="true">↗</span></span>
    </span>
  `;
  heroEl.dataset.itemId = String(item.id);
  heroEl.dataset.mediaType = discoverMediaType;
  heroEl.setAttribute('aria-label', `Voir la fiche de ${item.title}`);
  prepareEditorialImages(heroEl);
}

document.getElementById('choix-du-jour-card')?.addEventListener('click', function() {
  const id = this.dataset.itemId;
  if (!id) return;
  if (this.dataset.mediaType === 'tv') openTvDetailSheet(id);
  else openMovieDetailSheet(id);
});

// ═══════════════════════════════════════════
//  LES 4 CARROUSELS
// ═══════════════════════════════════════════
// Une seule fonction générique : chaque carrousel ne diffère que par sa
// source de données (voir CAROUSEL_SOURCES). Rendu SANS le doublement de
// liste utilisé par l'ancien carrousel Tendances (qui donnait l'impression
// d'un film en double en cours de défilement) — juste un défilement
// horizontal normal, pas de boucle infinie.

async function fetchNouveautes() {
  // "Nouveautés" = tendances de la semaine (trending/all/week filtré par le
  // media_type actif), dédupliquées par id — TMDb peut renvoyer un même
  // titre sur deux pages différentes de sa fenêtre de calcul.
  const res = await fetch('/api/search?trending=true');
  const data = await res.json();
  const seen = new Set();
  return (data.results || [])
    .filter(m => m.poster_path && m.media_type === discoverMediaType)
    .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
    .slice(0, 15)
    .map(normalizeItem);
}

async function fetchClassiques() {
  // "Classiques intemporels" = meilleurs films/séries d'une décennie au
  // hasard parmi les 5 dernières — varie un peu d'un chargement à l'autre
  // plutôt que de toujours montrer la même décennie fixe.
  const decades = [1970, 1980, 1990, 2000, 2010];
  const startYear = decades[Math.floor(Math.random() * decades.length)];
  const res = await fetch(`/api/search?decadeTop=${startYear}&mediaType=${discoverMediaType}`);
  const data = await res.json();
  return (data.results || []).slice(0, 15).map(normalizeItem);
}

async function fetchInternational() {
  // "Cinéma international" = plusieurs pays mélangés dans le MÊME
  // chargement (pas un seul pays par session) — un vrai brassage de
  // cultures/continents plutôt qu'une monoculture qui varie juste d'une
  // fois sur l'autre. Liste volontairement étalée sur plusieurs
  // continents (Asie, Europe, Amérique latine, Afrique, Moyen-Orient).
  const allCountries = ['KR', 'JP', 'FR', 'IT', 'IN', 'ES', 'DE', 'MX', 'BR', 'SE', 'NG', 'IR', 'TH', 'PL', 'EG'];
  // 5 pays tirés au hasard parmi la liste, un ordre différent à chaque
  // chargement (Fisher-Yates sur une copie, pas de biais vers le début du
  // tableau contrairement à un simple .sort(Math.random())).
  const shuffledCountries = [...allCountries];
  for (let i = shuffledCountries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledCountries[i], shuffledCountries[j]] = [shuffledCountries[j], shuffledCountries[i]];
  }
  const picked = shuffledCountries.slice(0, 5);

  const results = await Promise.allSettled(
    picked.map(cc => fetch(`/api/search?countryCode=${cc}&mediaType=${discoverMediaType}`).then(r => r.json()))
  );
  // 3 films par pays plutôt que de vider un pays avant de passer au
  // suivant : garantit un vrai mélange dans les 15 premiers plutôt qu'un
  // classement qui recolle les pays par blocs.
  const perCountry = results.map(r => (r.status === 'fulfilled' ? (r.value.results || []).slice(0, 3) : []));
  const merged = [];
  for (let i = 0; i < 3; i++) {
    perCountry.forEach(list => { if (list[i]) merged.push(list[i]); });
  }
  return merged.slice(0, 15).map(normalizeItem);
}

async function fetchTopRated() {
  // Ludex 2.0 : "Top 100 films TMDb" — classement éditorial officiel de
  // TMDb, aucun lien avec l'historique ou la watchlist de l'utilisateur
  // (remplace l'ancien "Classiques à explorer" qui vivait dans Profil et se
  // basait sur l'Historique — repositionné ici en tant que pure vitrine à
  // parcourir). TOUJOURS des films, quel que soit le bascule Films/Séries
  // actif — TMDb n'a pas d'équivalent "top séries" via ce même endpoint.
  const res = await fetch('/api/search?topRated=true');
  const data = await res.json();
  const pool = (data.results || []).filter(m => m.poster_path);
  // Fisher-Yates : chaque ouverture donne une vraie sélection, sans biais
  // vers les premières positions du classement.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 15).map(m => ({ ...normalizeItem(m), media_type: 'movie', topRank: m.ludex_top_rank }));
}

async function fetchHistorique() {
  // "D'après ton historique" = recommandations TMDb agrégées à partir de
  // quelques films/séries de l'historique, choisis pour leur diversité de
  // genre plutôt qu'au hasard pur (voir pickDiverseBasisItems) — même
  // logique que l'ancienne pile de suggestions "swipe", réutilisée ici.
  // Films et séries vivent dans deux stockages différents (loadHistory() vs
  // loadTvShows(), avec tmdbId vs tmdbTvId) — normalisés ici en un seul
  // tableau { tmdbId, genre } pour que pickDiverseBasisItems n'ait pas à
  // connaître la différence.
  const basisPool = discoverMediaType === 'tv'
    ? loadTvShows().map(s => ({ tmdbId: s.tmdbTvId, genre: s.genre || '' }))
    : loadHistory().filter(h => h.tmdbId).map(h => ({ tmdbId: h.tmdbId, genre: h.genre || '' }));
  if (basisPool.length === 0) return [];
  const basis = pickDiverseBasisItems(basisPool, 3);
  markBasisUsed(basis.map(f => f.tmdbId));
  const seenIds = new Set(basisPool.map(f => String(f.tmdbId)));

  const results = await Promise.allSettled(
    basis.map(item => fetch(`/api/search?id=${item.tmdbId}&recommendations=true&mediaType=${discoverMediaType}`).then(r => r.json()))
  );
  const allRecs = [];
  results.forEach(r => {
    if (r.status !== 'fulfilled') return;
    const arr = r.value.results || (Array.isArray(r.value) ? r.value : []);
    allRecs.push(...arr);
  });

  const addedIds = new Set();
  const unique = [];
  allRecs.forEach(m => {
    if (!m || !m.id || !m.poster_path) return;
    const idStr = String(m.id);
    if (addedIds.has(idStr) || seenIds.has(idStr)) return;
    addedIds.add(idStr);
    unique.push(m);
  });
  // Fisher-Yates — pas .sort(Math.random()) (biaisé), pour ne pas grouper
  // les résultats par film de base (donc souvent par genre).
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, 15).map(normalizeItem);
}

const CAROUSEL_SOURCES = {
  nouveautes: fetchNouveautes,
  classiques: fetchClassiques,
  international: fetchInternational,
  topRated: fetchTopRated,
  historique: fetchHistorique,
};
// Ludex 2.0 : "Top 100 films TMDb" est TOUJOURS des films (voir
// fetchTopRated() plus haut) — contrairement aux 4 autres carrousels qui
// suivent le bascule Films/Séries actif. Sans ce repli, loadCarousel()
// marquerait ses affiches data-media-type="tv" en mode Séries (copié du
// bascule courant), cassant leur clic vers la fiche (des identifiants de
// films ouverts comme des séries). Masqué plutôt que vidé en mode Séries —
// une vitrine "Top films" mélangée à des carrousels séries serait
// incohérente visuellement.
const CAROUSEL_FIXED_MEDIA_TYPE = { topRated: 'movie' };

async function loadCarousel(key) {
  const rowEl = document.getElementById(`carousel-${key}`);
  const blockEl = document.getElementById(`carousel-block-${key}`);
  if (!rowEl || !blockEl) return;
  const fixedType = CAROUSEL_FIXED_MEDIA_TYPE[key];
  if (fixedType && fixedType !== discoverMediaType) { blockEl.style.display = 'none'; return; }
  const effectiveMediaType = fixedType || discoverMediaType;
  rowEl.innerHTML = Array.from({ length: 5 }, () => `<div class="poster-min skeleton-bg"></div>`).join('');
  blockEl.style.display = 'block';
  try {
    const items = await CAROUSEL_SOURCES[key]();
    if (items.length === 0) { blockEl.style.display = 'none'; return; }
    rowEl.innerHTML = items.map(item => `
      <button type="button" class="poster-min" data-item-id="${item.id}" data-media-type="${effectiveMediaType}"${item.topRank ? ` data-top-rank="${item.topRank}"` : ''} aria-label="Voir la fiche de ${escAttr(item.title)}">
        ${item.poster_path
          ? `<img class="editorial-image" src="${tmdbImage(item.poster_path, 'w200')}" alt="Affiche de ${escAttr(item.title)}" loading="lazy">`
          : ''}
      </button>`).join('');
    prepareEditorialImages(rowEl);
  } catch (e) {
    console.warn(`Impossible de charger le carrousel ${key}`, e);
    blockEl.style.display = 'none';
  }
}

// Clic délégué : un seul écouteur pour les 4 carrousels plutôt qu'un par
// vignette (des dizaines d'affiches au total entre les 4 blocs).
document.getElementById('view-discover')?.addEventListener('click', (e) => {
  const poster = e.target.closest('.poster-min[data-item-id]');
  if (!poster) return;
  if (poster.dataset.mediaType === 'tv') openTvDetailSheet(poster.dataset.itemId);
  else openMovieDetailSheet(poster.dataset.itemId, { topRank: Number(poster.dataset.topRank) || null });
});
// Aucun gestionnaire clavier n'est nécessaire : .poster-min est un vrai
// <button>, activé nativement à Entrée et Espace.

// ── Base diversifiée pour "D'après ton historique" (repris de l'ancienne
// pile de suggestions, généralisé film/série) ──
const DISCOVER_BASIS_USED_KEY = 'lbx_discover_basis_used';
function loadBasisUsed() {
  try { return JSON.parse(localStorage.getItem(DISCOVER_BASIS_USED_KEY)) || []; } catch { return []; }
}
function markBasisUsed(tmdbIds) {
  const used = loadBasisUsed();
  used.push(...tmdbIds.map(String));
  localStorage.setItem(DISCOVER_BASIS_USED_KEY, JSON.stringify(used.slice(-30)));
}
function pickDiverseBasisItems(pool, count) {
  const used = new Set(loadBasisUsed());
  const fresh = pool.filter(f => !used.has(String(f.tmdbId)));
  const candidates = fresh.length >= count ? fresh : pool;

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
  const remaining = candidates.filter(f => !picked.includes(f));
  while (picked.length < count && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    picked.push(remaining.splice(idx, 1)[0]);
  }
  return picked;
}

// Point d'entrée unique, appelé depuis 01-navigation.js au premier
// affichage de l'onglet Découvrir.
function loadDiscoverTab() {
  loadChoixDuJour();
  Object.keys(CAROUSEL_SOURCES).forEach(loadCarousel);
}
