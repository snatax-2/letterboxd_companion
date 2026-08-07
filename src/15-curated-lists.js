// ═══════════════════════════════════════════
//  LISTES PRÉDÉFINIES — logique et affichage
// ═══════════════════════════════════════════
// Deux natures de contenu bien distinctes, à ne pas présenter pareil :
// - "Tous les temps" : compilée à la main (voir 00f-curated-lists-data.js),
//   sur le classement Sight & Sound 2022 — une vraie référence critique.
// - Par décennie : tri algorithmique TMDb (note + 500 votes minimum, voir
//   api/search.js) — annoncé comme tel dans l'app, "les mieux notés sur
//   TMDb", pas un vrai palmarès critique. Toutes les décennies disponibles,
//   des années 1920 (le cinéma sonore/l'ère TMDb couvre correctement) à
//   aujourd'hui — les décennies les plus anciennes auront naturellement
//   moins de films avec 500+ votes, ce qui est normal, pas un défaut.
const CURATED_RESOLVED_KEY = 'lbx_curated_alltime_resolved';
const CURATED_DECADE_KEY_PREFIX = 'lbx_curated_decade_v2_'; // v2 : invalide le cache d'avant le correctif de l'annee manquante (voir withExtractedYear)
const CURATED_DECADE_CACHE_DAYS = 30;
const CURATED_DECADES = [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

function curatedDecadeLabel(startYear) {
  return `Les meilleurs des années ${startYear}`;
}

// ── Résolution "Tous les temps" (titre+année -> id/affiche TMDb) ──
// Se fait une seule fois, en tâche de fond, par lots pour respecter la
// limite de débit du proxy (60 requêtes/minute) — pas un souci pour
// l'usage normal de recherche, mais 100 titres d'un coup la dépasserait.
function loadResolvedAllTime() {
  try { return JSON.parse(localStorage.getItem(CURATED_RESOLVED_KEY) || '{}'); } catch { return {}; }
}
function saveResolvedAllTime(map) {
  localStorage.setItem(CURATED_RESOLVED_KEY, JSON.stringify(map));
}

async function resolveOneCuratedFilm(entry) {
  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(entry.title)}`);
    const data = await readApiJson(res);
    const results = data.results || [];
    // Cherche une correspondance sur l'année (±1 pour absorber les écarts de
    // date de sortie selon les pays) parmi les résultats de recherche par
    // titre, plutôt que de prendre le premier résultat les yeux fermés.
    const match = results.find(r => {
      const y = r.release_date ? parseInt(r.release_date.slice(0, 4), 10) : null;
      return y && Math.abs(y - entry.year) <= 1;
    }) || results[0];
    if (!match) return null;
    return { id: match.id, title: match.title, year: entry.year, poster_path: match.poster_path };
  } catch {
    return null;
  }
}

let curatedResolutionInProgress = false;
async function ensureAllTimeResolved(onProgress) {
  const resolved = loadResolvedAllTime();
  const missing = CURATED_ALL_TIME.filter(f => !resolved[f.title]);
  if (missing.length === 0) return resolved;
  if (curatedResolutionInProgress) return resolved; // évite deux résolutions en parallèle si l'onglet est rouvert vite
  curatedResolutionInProgress = true;

  const BATCH_SIZE = 8;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(resolveOneCuratedFilm));
    batch.forEach((entry, idx) => {
      if (results[idx]) resolved[entry.title] = results[idx];
    });
    saveResolvedAllTime(resolved);
    if (onProgress) onProgress(Object.keys(resolved).length, CURATED_ALL_TIME.length);
    if (i + BATCH_SIZE < missing.length) await new Promise(r => setTimeout(r, 1500));
  }
  curatedResolutionInProgress = false;
  return resolved;
}

function getAllTimeFilmsFromCache() {
  const resolved = loadResolvedAllTime();
  return CURATED_ALL_TIME.map(f => resolved[f.title]).filter(Boolean);
}

// ── Listes par décennie ──
function loadDecadeCache(startYear) {
  try {
    const raw = JSON.parse(localStorage.getItem(CURATED_DECADE_KEY_PREFIX + startYear) || 'null');
    if (!raw) return null;
    const ageDays = (Date.now() - raw.fetchedAt) / 86400000;
    if (ageDays > CURATED_DECADE_CACHE_DAYS) return null;
    return raw.films;
  } catch { return null; }
}
// Normalise .year depuis .release_date : les résultats bruts de l'API
// discover TMDb (décennies, studios) n'ont qu'une date complète, pas une
// année pré-extraite — sans ça, l'année s'affichait vide dans la grille
// (vrai bug trouvé en vérifiant le texte réellement affiché, pas juste le
// nombre de films).
function withExtractedYear(films) {
  return films.map(f => ({ ...f, year: f.year || (f.release_date ? f.release_date.slice(0, 4) : '') }));
}

async function fetchDecadeList(startYear) {
  const cached = loadDecadeCache(startYear);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/search?decadeTop=${startYear}`);
    const data = await readApiJson(res);
    const films = withExtractedYear(data.results || []);
    localStorage.setItem(CURATED_DECADE_KEY_PREFIX + startYear, JSON.stringify({ films, fetchedAt: Date.now() }));
    return films;
  } catch {
    return [];
  }
}

// ── Catalogues de studio ──
const CURATED_STUDIO_KEY_PREFIX = 'lbx_curated_studio_';
function loadStudioCache(studioId) {
  try {
    const raw = JSON.parse(localStorage.getItem(CURATED_STUDIO_KEY_PREFIX + studioId) || 'null');
    if (!raw) return null;
    const ageDays = (Date.now() - raw.fetchedAt) / 86400000;
    if (ageDays > CURATED_DECADE_CACHE_DAYS) return null; // même durée que les décennies : ça ne bouge presque jamais
    return raw.films;
  } catch { return null; }
}
async function fetchStudioList(studioId) {
  const cached = loadStudioCache(studioId);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/search?studioId=${studioId}`);
    const data = await readApiJson(res);
    const films = withExtractedYear(data.results || []);
    localStorage.setItem(CURATED_STUDIO_KEY_PREFIX + studioId, JSON.stringify({ films, fetchedAt: Date.now() }));
    return films;
  } catch {
    return [];
  }
}

// ── Cinéma par pays (carte du monde) ──
const CURATED_COUNTRY_KEY_PREFIX = 'lbx_curated_country_';
function loadCountryCache(code) {
  try {
    const raw = JSON.parse(localStorage.getItem(CURATED_COUNTRY_KEY_PREFIX + code) || 'null');
    if (!raw) return null;
    const ageDays = (Date.now() - raw.fetchedAt) / 86400000;
    if (ageDays > CURATED_DECADE_CACHE_DAYS) return null;
    return raw.films;
  } catch { return null; }
}
async function fetchCountryList(code) {
  const cached = loadCountryCache(code);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/search?countryCode=${code}`);
    const data = await readApiJson(res);
    const films = withExtractedYear(data.results || []);
    localStorage.setItem(CURATED_COUNTRY_KEY_PREFIX + code, JSON.stringify({ films, fetchedAt: Date.now() }));
    return films;
  } catch {
    return [];
  }
}

// ── Pourcentage déjà vu (même principe que pour un réalisateur/acteur) ──
function computeCuratedSeenPercentage(films) {
  const history = loadHistory();
  const seenIds = new Set(history.map(h => String(h.tmdbId)).filter(Boolean));
  const withSeen = films.map(f => ({ ...f, isSeen: seenIds.has(String(f.id)) }));
  const seenCount = withSeen.filter(f => f.isSeen).length;
  const pct = withSeen.length > 0 ? Math.round((seenCount / withSeen.length) * 100) : 0;
  return { films: withSeen, seenCount, total: withSeen.length, pct };
}

// ── Carte Profil : liste des listes disponibles ──
function renderCuratedListsCard() {
  const container = document.getElementById('curated-lists-container');
  if (!container) return;

  // "Tous les temps" reste toujours visible (la liste principale, compilée
  // à la main) — les 11 décennies partent dans un accordéon natif
  // <details>/<summary> replié par défaut (gratuit en accessibilité
  // clavier, pas besoin de JS pour le toggle) : les montrer toutes dépliées
  // d'un coup rendait la carte bien trop longue à faire défiler.
  const rowHtml = (e) => `
    <button type="button" class="curated-list-row" data-list-id="${e.id}">
      <div class="curated-list-row-text">
        <div class="curated-list-row-label">${escAttr(e.label)}</div>
        <div class="curated-list-row-sub">${escAttr(e.sub)}</div>
      </div>
      <div class="curated-list-row-pct" id="curated-pct-${e.id}">…</div>
    </button>`;

  const decadeEntries = CURATED_DECADES.map(y => ({ id: `decade-${y}`, label: curatedDecadeLabel(y), sub: 'Mieux notés sur TMDb (500 votes min.)' }));
  const studioEntries = CURATED_STUDIOS.map(s => ({ id: `studio-${s.id}`, label: s.name, sub: s.sub }));

  // Carte du monde stylisée — pas de vraies frontières géographiques (voir
  // la discussion sur l'ergonomie tactile : des pays comme la Corée du Sud
  // seraient minuscules sur une carte précise à l'échelle d'un téléphone).
  // Juste un fond abstrait + des pastilles pays largement dimensionnées,
  // positionnées approximativement à la bonne région du monde.
  const mapPinsHtml = CURATED_COUNTRIES.map(c => `
    <button type="button" class="curated-map-pin" data-list-id="country-${c.code}" style="top:${c.top}%; left:${c.left}%;">
      <span class="curated-map-pin-flag" aria-hidden="true">${c.flag}</span>
      <span class="curated-map-pin-name">${escAttr(c.name)}</span>
      <span class="curated-map-pin-pct" id="curated-pct-country-${c.code}">…</span>
    </button>
  `).join('');

  container.innerHTML = `
    ${rowHtml({ id: 'alltime', label: 'Tous les temps', sub: 'Classement Sight & Sound 2022' })}
    <details class="curated-decades-accordion">
      <summary>Par décennie (${CURATED_DECADES.length})</summary>
      <div class="curated-decades-list">${decadeEntries.map(rowHtml).join('')}</div>
    </details>
    <details class="curated-decades-accordion">
      <summary>Par studio (${CURATED_STUDIOS.length})</summary>
      <div class="curated-decades-list">${studioEntries.map(rowHtml).join('')}</div>
    </details>
    <details class="curated-decades-accordion">
      <summary>Par pays (${CURATED_COUNTRIES.length})</summary>
      <div class="curated-map"><div class="curated-map-inner">${mapPinsHtml}</div></div>
    </details>
  `;

  container.querySelectorAll('.curated-list-row, .curated-map-pin').forEach(btn => {
    btn.addEventListener('click', () => openCuratedListSheet(btn.dataset.listId));
  });

  // Décennies : rapide, direct depuis le cache serveur/local — pas besoin
  // d'attendre pour afficher un pourcentage. Calculé même repliées (léger,
  // et évite un "…" qui traîne si l'utilisateur déplie plus tard).
  CURATED_DECADES.forEach(async (y) => {
    const films = await fetchDecadeList(y);
    const { pct, total } = computeCuratedSeenPercentage(films);
    const el = document.getElementById(`curated-pct-decade-${y}`);
    if (el) el.textContent = total > 0 ? `${pct}%` : '—';
  });

  // Studios : même principe.
  CURATED_STUDIOS.forEach(async (s) => {
    const films = await fetchStudioList(s.id);
    const { pct, total } = computeCuratedSeenPercentage(films);
    const el = document.getElementById(`curated-pct-studio-${s.id}`);
    if (el) el.textContent = total > 0 ? `${pct}%` : '—';
  });

  // Pays : même principe.
  CURATED_COUNTRIES.forEach(async (c) => {
    const films = await fetchCountryList(c.code);
    const { pct, total } = computeCuratedSeenPercentage(films);
    const el = document.getElementById(`curated-pct-country-${c.code}`);
    if (el) el.textContent = total > 0 ? `${pct}%` : '—';
  });

  // "Tous les temps" : peut demander une résolution en tâche de fond la
  // toute première fois (jamais ensuite, résultat mis en cache
  // définitivement) — affiche le pourcentage progressivement plutôt que de
  // bloquer le reste de la carte en l'attendant.
  const alreadyResolved = getAllTimeFilmsFromCache();
  if (alreadyResolved.length === CURATED_ALL_TIME.length) {
    const { pct } = computeCuratedSeenPercentage(alreadyResolved);
    const el = document.getElementById('curated-pct-alltime');
    if (el) el.textContent = `${pct}%`;
  } else {
    ensureAllTimeResolved((done, totalCount) => {
      const el = document.getElementById('curated-pct-alltime');
      if (!el) return;
      if (done < totalCount) { el.textContent = `${done}/${totalCount}`; return; }
      const { pct } = computeCuratedSeenPercentage(getAllTimeFilmsFromCache());
      el.textContent = `${pct}%`;
    });
  }
}

// ── Feuille détail : grille des films, vus/manquants, ajout en masse ──
const clsEl = document.getElementById('curated-list-sheet');
const clsContentEl = document.getElementById('cls-content');
const clsCloseBtn = document.getElementById('cls-close-btn');

async function openCuratedListSheet(listId) {
  lastFocusedBeforeModal = document.activeElement;
  clsContentEl.innerHTML = `<div class="mds-header"><div class="mds-title">Chargement…</div></div>`;
  clsEl.classList.add('open');
  clsCloseBtn.focus();

  let label, films;
  if (listId === 'alltime') {
    label = 'Tous les temps';
    films = getAllTimeFilmsFromCache();
  } else if (listId.startsWith('studio-')) {
    const studioId = parseInt(listId.replace('studio-', ''), 10);
    const studio = CURATED_STUDIOS.find(s => s.id === studioId);
    label = studio ? studio.name : 'Studio';
    films = await fetchStudioList(studioId);
  } else if (listId.startsWith('country-')) {
    const code = listId.replace('country-', '');
    const country = CURATED_COUNTRIES.find(c => c.code === code);
    label = country ? `Cinéma ${country.flag} ${country.name}` : 'Cinéma';
    films = await fetchCountryList(code);
  } else {
    const startYear = parseInt(listId.replace('decade-', ''), 10);
    label = curatedDecadeLabel(startYear);
    films = await fetchDecadeList(startYear);
  }
  renderFilmGridSheet(label, films);
}

// Fiche saga (belongs_to_collection TMDb) — même mise en page que les
// listes prédéfinies (grille, % vu, ajout des manquants), juste une source
// de films différente. Réutilise la même feuille plutôt que d'en construire
// une nouvelle, à l'image de la fiche réalisateur.
async function openSagaSheet(collectionId, collectionName) {
  lastFocusedBeforeModal = document.activeElement;
  clsContentEl.innerHTML = `<div class="mds-header"><div class="mds-title">Chargement…</div></div>`;
  clsEl.classList.add('open');
  clsCloseBtn.focus();

  try {
    const res = await fetch(`/api/search?collectionId=${collectionId}`);
    const data = await readApiJson(res);
    const films = (data.parts || [])
      .filter(f => f.poster_path)
      .sort((a, b) => (a.release_date || '9999').localeCompare(b.release_date || '9999'))
      .map(f => ({ id: f.id, title: f.title, poster_path: f.poster_path, year: f.release_date ? f.release_date.slice(0, 4) : '' }));
    renderFilmGridSheet(data.name || collectionName, films);
  } catch {
    clsContentEl.innerHTML = `<div class="mds-error">Impossible de charger la saga. Vérifie ta connexion.</div>`;
  }
}

// Rendu partagé : grille de films avec pourcentage vu et ajout des
// manquants à la watchlist — utilisé par les listes prédéfinies ET les
// sagas, seule la provenance des films diffère.
function renderFilmGridSheet(label, films) {
  const { films: withSeen, seenCount, total, pct } = computeCuratedSeenPercentage(films);
  const missingCount = total - seenCount;

  clsContentEl.innerHTML = `
    <div class="mds-header" style="animation-delay:0s">
      <div class="mds-header-info">
        <div class="mds-title" id="cls-title">${escAttr(label)}</div>
        <div class="mds-meta">${total} film${total > 1 ? 's' : ''}</div>
      </div>
    </div>
    <div class="mds-section pds-completion" style="animation-delay:.05s">
      <div class="mds-section-title">Films vus dans cette liste</div>
      <div class="pds-completion-bar"><div class="pds-completion-fill" style="width:${pct}%"></div></div>
      <div class="pds-completion-label">${seenCount} / ${total} déjà vus (${pct}%)</div>
      ${missingCount > 0 ? `<button type="button" class="icon-btn" id="cls-add-missing-btn" style="margin-top:8px;">Ajouter les ${missingCount} manquant${missingCount > 1 ? 's' : ''} à ma watchlist</button>` : ''}
    </div>
    <div class="mds-section pds-filmography" style="animation-delay:.1s">
      ${withSeen.map(f => `
        <div class="pds-film-item${f.isSeen ? ' seen' : ''}" data-movie-id="${f.id}" title="${f.isSeen ? 'Déjà vu' : ''}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(f.title)}${f.isSeen ? ', déjà vu' : ''}">
          ${f.poster_path
            ? `<img class="pds-film-poster" src="https://image.tmdb.org/t/p/w185${f.poster_path}" alt="" loading="lazy">`
            : `<div class="pds-film-poster pds-film-poster-ph">${ICONS.clapper}</div>`}
          <div class="pds-film-title">${escAttr(f.title)}</div>
          <div class="pds-film-year">${f.year || ''}</div>
        </div>
      `).join('')}
    </div>
  `;

  const addBtn = document.getElementById('cls-add-missing-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      addBtn.disabled = true;
      addBtn.textContent = 'Ajout en cours…';
      const activeListId = getActiveWatchlistId();
      const missing = withSeen.filter(f => !f.isSeen);
      for (const f of missing) {
        await addToSpecificWatchlist({ id: f.id, title: f.title, poster_path: f.poster_path }, f.year, activeListId);
      }
      showToast(`${missing.length} film${missing.length > 1 ? 's' : ''} ajouté${missing.length > 1 ? 's' : ''} à ta watchlist.`);
      addBtn.textContent = 'Ajouté !';
    });
  }
}

function closeCuratedListSheet() {
  closeModal(clsEl);
}
clsCloseBtn.addEventListener('click', closeCuratedListSheet);
clsEl.addEventListener('click', (e) => {
  if (e.target === clsEl) { closeCuratedListSheet(); return; }
  const filmItem = e.target.closest('.pds-film-item');
  if (filmItem) {
    closeCuratedListSheet();
    openMovieDetailSheet(filmItem.dataset.movieId);
  }
});

// Raccourci depuis Découvrir : bascule vers Profil et fait défiler jusqu'à
// la carte, plutôt que de dupliquer la fonctionnalité à deux endroits.
document.getElementById('curated-lists-shortcut-btn')?.addEventListener('click', () => {
  switchMobileNav('profile');
  setTimeout(() => {
    document.getElementById('curated-lists-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
});

// ═══════════════════════════════════════════
//  EXPLORATION PAR THÈME (Découvrir)
// ═══════════════════════════════════════════
// Contrairement aux décennies/studios/pays (Profil, un vrai "canon" à
// suivre avec % vu), un mot-clé n'a pas de nombre canonique de films — vit
// ici comme un outil de navigation/suggestion. Cache plus court que les
// autres listes (5 jours, pas 30) : trié par popularité, qui évolue plus
// vite qu'un classement par note.
const CURATED_THEME_KEY_PREFIX = 'lbx_curated_theme_';
const CURATED_THEME_CACHE_DAYS = 5;
function loadThemeCache(id) {
  try {
    const raw = JSON.parse(localStorage.getItem(CURATED_THEME_KEY_PREFIX + id) || 'null');
    if (!raw) return null;
    const ageDays = (Date.now() - raw.fetchedAt) / 86400000;
    if (ageDays > CURATED_THEME_CACHE_DAYS) return null;
    return raw.films;
  } catch { return null; }
}
async function fetchThemeList(id) {
  const cached = loadThemeCache(id);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/search?keywordId=${id}`);
    const data = await readApiJson(res);
    const films = withExtractedYear(data.results || []);
    localStorage.setItem(CURATED_THEME_KEY_PREFIX + id, JSON.stringify({ films, fetchedAt: Date.now() }));
    return films;
  } catch {
    return [];
  }
}

function renderThemeChips() {
  const row = document.getElementById('theme-chips-row');
  if (!row) return;
  row.innerHTML = CURATED_THEMES.map(t => `
    <button type="button" class="theme-chip" data-theme-id="${t.id}" data-theme-name="${escAttr(t.name)}">
      <span aria-hidden="true">${t.emoji}</span> ${escAttr(t.name)}
    </button>
  `).join('');
  row.querySelectorAll('.theme-chip').forEach(chip => {
    chip.addEventListener('click', () => openThemeSheet(chip.dataset.themeId, chip.dataset.themeName));
  });
}

// Feuille thème : réutilise la même modale que les listes prédéfinies/sagas
// (#curated-list-sheet), mais un rendu plus simple — pas de barre de
// complétion ni de bouton d'ajout en masse, juste une grille à parcourir
// (esprit "suggestion", pas "collection à cocher"). L'ajout à la watchlist
// se fait film par film en ouvrant sa fiche, comme partout ailleurs.
async function openThemeSheet(themeId, themeName) {
  lastFocusedBeforeModal = document.activeElement;
  clsContentEl.innerHTML = `<div class="mds-header"><div class="mds-title">Chargement…</div></div>`;
  clsEl.classList.add('open');
  clsCloseBtn.focus();

  const films = await fetchThemeList(themeId);
  clsContentEl.innerHTML = `
    <div class="mds-header" style="animation-delay:0s">
      <div class="mds-header-info">
        <div class="mds-title" id="cls-title">${escAttr(themeName)}</div>
        <div class="mds-meta">${films.length} film${films.length > 1 ? 's' : ''}</div>
      </div>
    </div>
    <div class="mds-section pds-filmography" style="animation-delay:.05s">
      ${films.map(f => `
        <div class="pds-film-item" data-movie-id="${f.id}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(f.title)}">
          ${f.poster_path
            ? `<img class="pds-film-poster" src="https://image.tmdb.org/t/p/w185${f.poster_path}" alt="" loading="lazy">`
            : `<div class="pds-film-poster pds-film-poster-ph">${ICONS.clapper}</div>`}
          <div class="pds-film-title">${escAttr(f.title)}</div>
          <div class="pds-film-year">${f.year || ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

renderThemeChips();

