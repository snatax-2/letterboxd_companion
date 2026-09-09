// Normalise .year depuis .release_date : les résultats bruts de l'API
// discover TMDb (décennies, studios) n'ont qu'une date complète, pas une
// année pré-extraite — sans ça, l'année s'affichait vide dans la grille
// (vrai bug trouvé en vérifiant le texte réellement affiché, pas juste le
// nombre de films).
function withExtractedYear(films) {
  return films.map(f => ({ ...f, year: f.year || (f.release_date ? f.release_date.slice(0, 4) : '') }));
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

// ── Feuille détail : grille des films, vus/manquants, ajout en masse ──
const clsEl = document.getElementById('curated-list-sheet');
const clsContentEl = document.getElementById('cls-content');
const clsCloseBtn = document.getElementById('cls-close-btn');

// Fiche saga (belongs_to_collection TMDb) — même mise en page que les
// listes prédéfinies (grille, % vu, ajout des manquants), juste une source
// de films différente. Réutilise la même feuille plutôt que d'en construire
// une nouvelle, à l'image de la fiche réalisateur.
async function openSagaSheet(collectionId, collectionName) {
  clsContentEl.innerHTML = `<div class="mds-header"><div class="mds-title">Chargement…</div></div>`;
  openModalElement(clsEl, { initialFocus: clsCloseBtn });

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
        <button type="button" class="pds-film-item${f.isSeen ? ' seen' : ''}" data-movie-id="${f.id}" title="${f.isSeen ? 'Déjà vu' : ''}" aria-label="Voir la fiche de ${escAttr(f.title)}${f.isSeen ? ', déjà vu' : ''}">
          ${f.poster_path
            ? `<img class="pds-film-poster" src="${tmdbImage(f.poster_path, 'w185')}" alt="" loading="lazy">`
            : `<span class="pds-film-poster pds-film-poster-ph">${ICONS.clapper}</span>`}
          <span class="pds-film-title">${escAttr(f.title)}</span>
          <span class="pds-film-year">${f.year || ''}</span>
        </button>
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
      ${ICONS[t.icon] || ''} ${escAttr(t.name)}
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
  clsContentEl.innerHTML = `<div class="mds-header"><div class="mds-title">Chargement…</div></div>`;
  openModalElement(clsEl, { initialFocus: clsCloseBtn });

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
        <button type="button" class="pds-film-item" data-movie-id="${f.id}" aria-label="Voir la fiche de ${escAttr(f.title)}">
          ${f.poster_path
            ? `<img class="pds-film-poster" src="${tmdbImage(f.poster_path, 'w185')}" alt="" loading="lazy">`
            : `<span class="pds-film-poster pds-film-poster-ph">${ICONS.clapper}</span>`}
          <span class="pds-film-title">${escAttr(f.title)}</span>
          <span class="pds-film-year">${f.year || ''}</span>
        </button>
      `).join('')}
    </div>
  `;
}

renderThemeChips();

