// ═══════════════════════════════════════════
//  SÉRIES — Phase 1 : recherche + sélection de saison
// ═══════════════════════════════════════════
// Bascule Film/Série dans l'onglet Noter, recherche d'une série (TMDb
// /search/tv), puis choix d'une saison (TMDb /tv/{id} pour la liste des
// saisons). S'arrête volontairement là : le suivi épisode par épisode et
// la notation de saison sont les Phases 2 et 3, pas encore construites —
// on avance point par point plutôt que tout d'un coup, comme convenu.
//
// Stockage à venir en Phase 2+ (lbx_tv_shows, une entrée par SÉRIE avec
// ses saisons imbriquées) — rien n'est encore sauvegardé à ce stade,
// cette phase se limite à la sélection.

// currentMediaType est déclarée dans 03-foundation.js (pas ici) — voir le
// commentaire à cet endroit pour la raison exacte (calculateScore() y
// accède dès l'initialisation, avant que ce fichier-ci ne soit atteint).
let selectedShow = null; // { id, name, poster_path } une fois une serie choisie

function setMediaType(type) {
  currentMediaType = type;
  document.getElementById('tab-media-movie').classList.toggle('active', type === 'movie');
  document.getElementById('tab-media-tv').classList.toggle('active', type === 'tv');
  document.getElementById('movie-only-fields').style.display = type === 'movie' ? '' : 'none';
  document.getElementById('tv-only-fields').style.display = type === 'tv' ? '' : 'none';
  document.getElementById('film-card-title').textContent = type === 'movie' ? 'Film' : 'Série';
  applyCriteriaLabelsForMediaType(type);
  // Pour un film, la carte Notation est toujours visible (on peut ajuster
  // les curseurs avant même d'avoir cherché un titre). Pour une série, il
  // faut d'abord qu'une saison soit sélectionnée pour que noter ait un
  // sens — selectSeason() la révèle elle-même le moment venu.
  document.getElementById('notation-card').style.display = type === 'movie' || selectedSeasonNumber != null ? '' : 'none';
  if (type === 'tv' && typeof renderTvContinueList === 'function') renderTvContinueList();
}

// Les deux critères reformulés pour une saison — les 5 autres (scenario,
// realisation, acteurs, ambiance, affect) restent identiques au film,
// donc pas dans cette table.
const TV_CRITERIA_LABELS = { photo: 'Qualité du final', rythme: 'Rythme & Cohérence de la saison' };
const _originalCriteriaLabels = {};

function applyCriteriaLabelsForMediaType(type) {
  Object.keys(TV_CRITERIA_LABELS).forEach(c => {
    const labelEl = document.getElementById(`crit-label-${c}`);
    if (!labelEl || !labelEl.firstChild) return;
    // Le badge de pondération (<span class="weight-badge">) est un enfant
    // du label — on ne modifie QUE le nœud de texte qui le précède, pour
    // ne jamais l'écraser (même classe de bug déjà rencontrée ailleurs
    // dans ce projet : cibler le bon élément, pas tout le conteneur).
    if (!(c in _originalCriteriaLabels)) _originalCriteriaLabels[c] = labelEl.firstChild.nodeValue;
    const newText = (type === 'tv' ? TV_CRITERIA_LABELS[c] : _originalCriteriaLabels[c].trim()) + ' ';
    labelEl.firstChild.nodeValue = newText;
    const trimmed = newText.trim();
    document.querySelectorAll(`.criterion-step-btn[data-target="${c}"]`).forEach(btn => {
      const sign = btn.dataset.step.startsWith('-') ? 'Diminuer' : 'Augmenter';
      btn.setAttribute('aria-label', `${sign} ${trimmed} de 0,5`);
    });
  });
}

const tvSearchEl = document.getElementById('tv-search');
const tvSuggestEl = document.getElementById('tv-suggestions');
const tvSearchStatus = document.getElementById('tv-search-status');
const tvSearchClearBtn = document.getElementById('tv-search-clear-btn');
let tvSearchTimer;

tvSearchEl.addEventListener('input', () => {
  clearTimeout(tvSearchTimer);
  tvSearchClearBtn.style.display = tvSearchEl.value ? 'flex' : 'none';
  const q = tvSearchEl.value.trim();
  if (q.length < 2) {
    tvSuggestEl.style.display = 'none';
    tvSearchStatus.style.display = 'none';
    return;
  }
  tvSearchStatus.style.display = 'none';
  tvSuggestEl.style.display = 'block';
  tvSuggestEl.innerHTML = `
    <div class="skeleton-item"><div class="skeleton-poster skeleton-bg"></div><div style="flex:1"><div class="skeleton-text long skeleton-bg"></div><div class="skeleton-text short skeleton-bg"></div></div></div>
    <div class="skeleton-item"><div class="skeleton-poster skeleton-bg"></div><div style="flex:1"><div class="skeleton-text long skeleton-bg"></div><div class="skeleton-text short skeleton-bg"></div></div></div>
  `;
  tvSearchTimer = setTimeout(() => fetchTvSuggestions(q), 280);
});
tvSearchClearBtn.addEventListener('click', () => {
  tvSearchEl.value = '';
  tvSearchEl.dispatchEvent(new Event('input'));
  tvSearchEl.focus();
});

async function fetchTvSuggestions(q) {
  try {
    const res = await fetch(`/api/search?tvQuery=${encodeURIComponent(q)}`);
    const data = await readApiJson(res);
    const results = (data.results || []).filter(s => s.poster_path).slice(0, 8);
    if (results.length === 0) {
      tvSuggestEl.style.display = 'none';
      tvSearchStatus.textContent = 'Aucune série trouvée.';
      tvSearchStatus.style.display = 'block';
      return;
    }
    tvSuggestEl.innerHTML = results.map(s => `
      <div class="suggestion-item" data-show-id="${s.id}" data-show-name="${escAttr(s.name)}" data-show-poster="${escAttr(s.poster_path || '')}">
        <img class="suggestion-poster" src="https://image.tmdb.org/t/p/w92${s.poster_path}" alt="" loading="lazy">
        <div class="suggestion-info">
          <div class="suggestion-title">${escAttr(s.name)}</div>
          <div class="suggestion-year">${s.first_air_date ? s.first_air_date.slice(0, 4) : ''}</div>
        </div>
      </div>
    `).join('');
    tvSuggestEl.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => selectShow({
        id: item.dataset.showId, name: item.dataset.showName, poster_path: item.dataset.showPoster,
      }));
    });
  } catch (err) {
    tvSuggestEl.style.display = 'none';
    tvSearchStatus.textContent = describeApiFailure(err);
    tvSearchStatus.style.display = 'block';
  }
}

async function selectShow(show) {
  selectedShow = show;
  tvSuggestEl.style.display = 'none';
  tvSearchEl.value = show.name;
  const pickerEl = document.getElementById('tv-season-picker');
  pickerEl.style.display = 'block';
  pickerEl.innerHTML = '<div class="search-status" style="display:block;">Chargement des saisons…</div>';
  document.getElementById('tv-season-strip').style.display = 'none';

  try {
    const res = await fetch(`/api/search?tvId=${show.id}`);
    const data = await readApiJson(res);
    selectedShow.genres = (data.genres || []).map(g => g.name).join(', ');
    const seasons = (data.seasons || []).filter(s => s.season_number > 0 && s.episode_count > 0);
    if (seasons.length === 0) {
      pickerEl.innerHTML = '<div class="search-status" style="display:block;">Aucune saison trouvée pour cette série.</div>';
      return;
    }
    pickerEl.innerHTML = `
      <div class="context-row-label">Choisir une saison</div>
      <div class="context-row">
        ${seasons.map(s => `
          <button type="button" class="ctx-tag" data-season-number="${s.season_number}" data-season-name="${escAttr(s.name)}" data-episode-count="${s.episode_count}" data-season-poster="${escAttr(s.poster_path || show.poster_path || '')}">
            ${escAttr(s.name)} (${s.episode_count} ép.)
          </button>
        `).join('')}
      </div>
    `;
    pickerEl.querySelectorAll('[data-season-number]').forEach(btn => {
      btn.addEventListener('click', () => selectSeason({
        number: btn.dataset.seasonNumber, name: btn.dataset.seasonName,
        episodeCount: btn.dataset.episodeCount, poster: btn.dataset.seasonPoster,
      }));
    });
  } catch (err) {
    pickerEl.innerHTML = `<div class="search-status" style="display:block;">${escAttr(describeApiFailure(err))}</div>`;
  }
}

function selectSeason(season) {
  const stripEl = document.getElementById('tv-season-strip');
  stripEl.style.display = 'flex';
  const posterImg = document.getElementById('tv-strip-poster');
  posterImg.src = season.poster ? `https://image.tmdb.org/t/p/w200${season.poster}` : '';
  document.getElementById('tv-strip-title').textContent = `${selectedShow.name} — ${season.name}`;
  document.getElementById('tv-strip-genre').textContent = `${season.episodeCount} épisode${season.episodeCount > 1 ? 's' : ''}`;
  selectedSeasonNumber = Number(season.number);
  selectedSeasonName = season.name;
  selectedSeasonEpisodeCount = Number(season.episodeCount);
  document.getElementById('tv-season-complete-banner').style.display = 'none';
  refreshShowAverageDisplay();

  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
  const localSeason = showEntry?.seasons?.[String(selectedSeasonNumber)];
  const episodesComplete = localSeason && localSeason.totalEpisodes > 0 && localSeason.watchedEpisodes.length >= localSeason.totalEpisodes;
  const isComplete = localSeason && (episodesComplete || localSeason.rating);

  const startPromptEl = document.getElementById('tv-season-start-prompt');
  const inProgressEl = document.getElementById('tv-season-in-progress-msg');
  const notationEl = document.getElementById('notation-card');

  if (isComplete) {
    // Saison terminée : plus rien à cocher, on passe directement à la note
    // — pré-remplie si déjà notée, exactement le même geste que rouvrir
    // depuis l'Historique.
    startPromptEl.style.display = 'none';
    inProgressEl.style.display = 'none';
    notationEl.style.display = '';
    loadSeasonRatingIntoForm();
  } else if (localSeason) {
    // Déjà entamée (via le widget En cours) mais pas finie : pas de second
    // suivi ici, juste un rappel de où continuer plutôt qu'un doublon.
    notationEl.style.display = 'none';
    startPromptEl.style.display = 'none';
    inProgressEl.style.display = 'flex';
    document.getElementById('tv-in-progress-text').textContent =
      `${localSeason.watchedEpisodes.length}/${localSeason.totalEpisodes} épisodes déjà vus — continue depuis le widget "En cours" en haut de cet onglet.`;
  } else {
    // Jamais touchée : propose de commencer plutôt que d'ouvrir directement
    // un suivi épisode par épisode ici.
    notationEl.style.display = 'none';
    inProgressEl.style.display = 'none';
    startPromptEl.style.display = 'flex';
    document.getElementById('tv-start-prompt-text').textContent = `Commencer "${selectedShow.name} — ${season.name}" ?`;
  }
}

function startTrackingSeason() {
  const shows = loadTvShows();
  const showEntry = getOrCreateTvShow(shows);
  const seasonKey = String(selectedSeasonNumber);
  if (!showEntry.seasons[seasonKey]) {
    showEntry.seasons[seasonKey] = { seasonName: selectedSeasonName, watchedEpisodes: [], totalEpisodes: selectedSeasonEpisodeCount };
  }
  saveTvShows(shows);
  document.getElementById('tv-season-start-prompt').style.display = 'none';
  document.getElementById('tv-season-in-progress-msg').style.display = 'flex';
  document.getElementById('tv-in-progress-text').textContent =
    `0/${selectedSeasonEpisodeCount} épisodes vus — continue depuis le widget "En cours" en haut de cet onglet.`;
  if (typeof renderTvContinueList === 'function') renderTvContinueList();
  showToast(`"${selectedShow.name} — ${selectedSeasonName}" ajoutée à En cours`);
}
document.getElementById('tv-start-season-btn').addEventListener('click', startTrackingSeason);

// ═══════════════════════════════════════════
//  SÉRIES — Phase 2 : suivi épisode par épisode
// ═══════════════════════════════════════════
// Stockage : une entrée par SÉRIE (lbx_tv_shows), avec ses saisons
// imbriquées — chaque saison garde la liste des épisodes vus et son
// total. Aucune note stockée ici (Phase 3) : la note de saison viendra
// plus tard, la note globale de série ne sera jamais stockée du tout,
// toujours recalculée à la volée à partir des saisons notées.
const TV_SHOWS_KEY = 'lbx_tv_shows';
let selectedSeasonNumber = null;
let selectedSeasonName = null;
let selectedSeasonEpisodeCount = 0;

function loadTvShows() {
  try { return JSON.parse(localStorage.getItem(TV_SHOWS_KEY)) || []; } catch { return []; }
}
function saveTvShows(shows) {
  localStorage.setItem(TV_SHOWS_KEY, JSON.stringify(shows));
}
function getOrCreateTvShow(shows) {
  let entry = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
  if (!entry) {
    entry = { tmdbTvId: selectedShow.id, title: selectedShow.name, poster_path: selectedShow.poster_path, genre: selectedShow.genres || '', seasons: {} };
    shows.push(entry);
  }
  return entry;
}
function getOrCreateTvSeason(showEntry, seasonName, totalEpisodes) {
  const key = String(selectedSeasonNumber);
  if (!showEntry.seasons[key]) {
    showEntry.seasons[key] = { seasonName, watchedEpisodes: [], totalEpisodes };
  }
  // Le total peut differer de ce qu'on avait stocke si TMDb ajoute un
  // episode entre deux visites (saison en cours de diffusion) — on le
  // reajuste plutot que de garder une valeur perimee.
  showEntry.seasons[key].totalEpisodes = totalEpisodes;
  return showEntry.seasons[key];
}

function loadSeasonRatingIntoForm() {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
  const seasonEntry = showEntry && showEntry.seasons[String(selectedSeasonNumber)];
  const rating = seasonEntry && seasonEntry.rating;

  if (rating && rating.mode === 'quick' && rating.values?.quick !== undefined) {
    setMode('quick');
    quickRating = parseFloat(rating.values.quick);
    const radioEl = document.getElementById('s' + (quickRating * 2));
    if (radioEl) radioEl.checked = true;
  } else {
    setMode('detail');
    CRITERIA.forEach(c => {
      document.getElementById(c).value = rating && rating.values && rating.values[c] !== undefined ? rating.values[c] : 5;
    });
  }
  document.getElementById('review-text').value = rating ? (rating.review || '') : '';
  calculateScore();
}

// Toutes les notes de saison, toutes séries confondues, à plat — réutilisé
// pour le radar (moyennes par critère, même fonction pure que les films)
// et pour fusionner l'activité films+séries dans le graphique 6 mois (voir
// 06-history.js) : la heatmap ET ce graphique restent uniques, décidé
// ensemble, contrairement au reste des statistiques qui bascule.
function getAllTvSeasonRatings() {
  return loadTvShows().flatMap(show =>
    Object.values(show.seasons || {}).filter(s => s.rating).map(s => s.rating)
  );
}

function refreshShowAverageDisplay() {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
  const avg = computeShowAverageScore(showEntry);
  const el = document.getElementById('tv-show-average');
  if (avg == null) {
    el.style.display = 'none';
    return;
  }
  const ratedCount = Object.values(showEntry.seasons).filter(s => s.rating).length;
  el.textContent = `Note globale : ${avg.toFixed(1)}/10 (moyenne de ${ratedCount} saison${ratedCount > 1 ? 's' : ''} notée${ratedCount > 1 ? 's' : ''})`;
  el.style.display = 'block';
}

function saveTvSeasonRating() {
  if (!selectedShow || selectedSeasonNumber == null) {
    showToast('Sélectionne une série et une saison avant de noter.');
    return;
  }
  const score = calculateScore();
  const shows = loadTvShows();
  const showEntry = getOrCreateTvShow(shows);
  const seasonKey = String(selectedSeasonNumber);
  // La saison existe déjà forcément (créée dès qu'on "Commence" à la suivre,
  // voir startTrackingSeason) — on y ajoute juste la note, sans repasser par
  // getOrCreateTvSeason pour ne pas risquer d'écraser totalEpisodes avec
  // une valeur périmée.
  if (!showEntry.seasons[seasonKey]) {
    showEntry.seasons[seasonKey] = { seasonName: selectedSeasonName, watchedEpisodes: [], totalEpisodes: selectedSeasonEpisodeCount };
  }
  showEntry.seasons[seasonKey].rating = {
    mode: currentMode,
    values: currentMode === 'detail'
      ? CRITERIA.reduce((acc, c) => { acc[c] = document.getElementById(c).value; return acc; }, {})
      : { quick: quickRating },
    score: score.toFixed(1),
    stars: document.getElementById('stars-display').textContent,
    review: document.getElementById('review-text').value.trim(),
    date: new Date().toISOString(),
  };
  saveTvShows(shows);
  document.getElementById('tv-season-complete-banner').style.display = 'none';
  showToast(`"${selectedShow.name} — ${selectedSeasonName}" notée`);
  if (typeof playSaveConfirmation === 'function') playSaveConfirmation();
  refreshShowAverageDisplay();
  if (typeof statsDirty !== 'undefined') statsDirty = true;
}

function maybeShowSeasonCompleteBanner(showTmdbId, seasonKey, seasonEntry) {
  if (seasonEntry.watchedEpisodes.length < seasonEntry.totalEpisodes) return;
  const banner = document.getElementById('tv-season-complete-banner');
  banner.dataset.showId = showTmdbId;
  banner.dataset.seasonKey = seasonKey;
  banner.style.display = 'flex';
}

document.getElementById('tv-season-complete-dismiss').addEventListener('click', () => {
  document.getElementById('tv-season-complete-banner').style.display = 'none';
});
document.getElementById('tv-rate-season-btn').addEventListener('click', () => {
  const banner = document.getElementById('tv-season-complete-banner');
  const showId = banner.dataset.showId;
  const seasonKey = banner.dataset.seasonKey;
  banner.style.display = 'none';

  const show = loadTvShows().find(s => String(s.tmdbTvId) === String(showId));
  if (show) {
    switchMobileNav('rating');
    setMediaType('tv');
    selectedShow = { id: show.tmdbTvId, name: show.title, poster_path: show.poster_path };
    document.getElementById('tv-search').value = show.title;
    document.getElementById('tv-season-picker').style.display = 'none';
    const seasonData = show.seasons[seasonKey];
    selectedSeasonNumber = Number(seasonKey);
    selectedSeasonName = seasonData.seasonName;
    document.getElementById('tv-season-strip').style.display = 'flex';
    document.getElementById('tv-strip-poster').src = show.poster_path ? `https://image.tmdb.org/t/p/w200${show.poster_path}` : '';
    document.getElementById('tv-strip-title').textContent = `${show.title} — ${seasonData.seasonName}`;
    document.getElementById('tv-strip-genre').textContent = `${seasonData.totalEpisodes} épisodes`;
    document.getElementById('tv-season-start-prompt').style.display = 'none';
    document.getElementById('tv-season-in-progress-msg').style.display = 'none';
    refreshShowAverageDisplay();
    loadSeasonRatingIntoForm();
  }
  const card = document.getElementById('notation-card');
  card.style.display = '';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ═══════════════════════════════════════════
//  SÉRIES — Phase 4 : Historique scindé Films/Séries
// ═══════════════════════════════════════════
// Bascule façon Détaillé/Rapide (pas un simple filtre dans une liste
// mélangée) : une carte de saison et une carte de film n'ont pas le même
// contenu à afficher, les mélanger aurait rendu chaque carte confuse.
// Comptage par SÉRIE, pas par saison — noter 3 saisons de la même série
// compte pour 1, pas 3, comme convenu.

function switchHistoryMediaFilter(type) {
  historyMediaFilter = type;
  document.getElementById('hist-tab-movie').classList.toggle('active', type === 'movie');
  document.getElementById('hist-tab-tv').classList.toggle('active', type === 'tv');
  document.getElementById('history-list').style.display = type === 'movie' ? '' : 'none';
  document.getElementById('tv-history-list').style.display = type === 'tv' ? '' : 'none';
  renderActiveHistoryView();
  if (type === 'tv') retrofitMissingTvGenres();
}

// Récupère silencieusement le genre des séries suivies avant l'ajout de ce
// filtre (donc sans genre stocké) — une seule fois par série, en arrière-
// plan, sans bloquer l'affichage déjà rendu avec les genres déjà connus.
async function retrofitMissingTvGenres() {
  const missing = loadTvShows().filter(s => !s.genre);
  if (missing.length === 0) return;
  for (const show of missing) {
    try {
      const data = await fetch(`/api/search?tvId=${show.tmdbTvId}`).then(readApiJson);
      const genreStr = (data.genres || []).map(g => g.name).join(', ');
      const current = loadTvShows();
      const entry = current.find(s => String(s.tmdbTvId) === String(show.tmdbTvId));
      if (entry && genreStr) { entry.genre = genreStr; saveTvShows(current); }
    } catch { /* silencieux — retentera au prochain passage sur l'onglet */ }
  }
  if (historyMediaFilter === 'tv') renderTvHistory();
}

function getSortedTvShows() {
  const shows = loadTvShows();
  let s = shows;
  if (historySearchQuery) {
    s = s.filter(sh => sh.title && sh.title.toLowerCase().includes(historySearchQuery));
  }
  if (activeScoreFilter !== null) {
    s = s.filter(sh => isScoreInActiveRange(computeShowAverageScore(sh)));
  }
  if (activeGenre) {
    s = s.filter(sh => sh.genre && sh.genre.split(',').map(g => g.trim()).includes(activeGenre));
  }
  const avg = (sh) => computeShowAverageScore(sh);
  if (sortOrder === 'score-desc') return [...s].sort((a, b) => (avg(b) ?? -1) - (avg(a) ?? -1));
  if (sortOrder === 'score-asc')  return [...s].sort((a, b) => (avg(a) ?? 11) - (avg(b) ?? 11));
  if (sortOrder === 'title')      return [...s].sort((a, b) => a.title.localeCompare(b.title));
  // "Récents" : dernière saison mise à jour (notée ou suivie), la plus
  // récente d'abord — même esprit que le tri "Récents" des films.
  const lastUpdate = (sh) => Object.values(sh.seasons || {}).reduce((max, se) => {
    const d = se.rating?.date || '';
    return d > max ? d : max;
  }, '');
  return [...s].sort((a, b) => lastUpdate(b).localeCompare(lastUpdate(a)));
}

function renderTvHistory() {
  const allShows = loadTvShows();
  const shows = getSortedTvShows();
  const container = document.getElementById('tv-history-list');
  renderGenreChips(allShows, renderTvHistory);

  const badge = document.getElementById('hist-count-badge');
  const filmCount = loadHistory().length;
  const filmFragment = `${filmCount} film${filmCount > 1 ? 's' : ''}`;
  if (historySearchQuery || activeScoreFilter) {
    badge.textContent = `${filmFragment} · ${shows.length} / ${allShows.length} série${allShows.length > 1 ? 's' : ''}`;
    badge.style.color = 'var(--orange)';
  } else {
    badge.textContent = `${filmFragment} · ${allShows.length} série${allShows.length > 1 ? 's' : ''}`;
    badge.style.color = '';
  }

  if (allShows.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.clapper}</div>Aucune série suivie pour l'instant — cherche-en une dans l'onglet Noter.</div>`;
    return;
  }
  if (shows.length === 0) {
    container.innerHTML = `<div class="empty-state">Aucun résultat pour ce filtre.</div>`;
    return;
  }

  container.innerHTML = shows.map(renderTvShowCard).join('');

  container.querySelectorAll('.tv-show-card').forEach((cardEl, i) => {
    const posterUrl = shows[i]?.poster_path ? `https://image.tmdb.org/t/p/w154${shows[i].poster_path}` : '';
    applyPosterAccent(posterUrl, cardEl);
  });

  container.querySelectorAll('.tv-show-card-open-btn').forEach(btn => {
    btn.addEventListener('click', () => openTvDetailSheet(btn.dataset.showId));
  });

  container.querySelectorAll('.tv-show-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.showId;
      const show = loadTvShows().find(s => String(s.tmdbTvId) === String(id));
      if (!show) return;
      openModal(
        'Retirer cette série',
        `"${show.title}" et toutes ses saisons suivies/notées seront définitivement retirées. Continuer ?`,
        () => {
          const remaining = loadTvShows().filter(s => String(s.tmdbTvId) !== String(id));
          saveTvShows(remaining);
          renderTvHistory();
          showToast(`"${show.title}" retirée`);
          if (typeof statsDirty !== 'undefined') statsDirty = true;
        },
        true
      );
    });
  });

  container.querySelectorAll('.tv-season-reopen-btn').forEach(btn => {
    btn.addEventListener('click', () => reopenTvSeason(btn.dataset.showId, btn.dataset.seasonKey));
  });

  container.querySelectorAll('.tv-season-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTvSeasonWithConfirm(btn.dataset.showId, btn.dataset.seasonKey);
    });
  });

  initTvSeasonSwipeGestures(container);
}

function deleteTvSeasonWithConfirm(showId, seasonKey) {
  const show = loadTvShows().find(s => String(s.tmdbTvId) === String(showId));
  if (!show) return;
  const seasonName = show.seasons[seasonKey]?.seasonName || `Saison ${seasonKey}`;
  const isLastSeason = Object.keys(show.seasons).length === 1;
  openModal(
    'Retirer cette saison',
    isLastSeason
      ? `"${seasonName}" est la dernière saison suivie de "${show.title}" — la retirer retire toute la série. Continuer ?`
      : `"${seasonName}" de "${show.title}" sera définitivement retirée. Continuer ?`,
    () => {
      const shows = loadTvShows();
      const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
      if (!showEntry) return;
      delete showEntry.seasons[seasonKey];
      const remaining = Object.keys(showEntry.seasons).length === 0
        ? shows.filter(s => String(s.tmdbTvId) !== String(showId))
        : shows;
      saveTvShows(remaining);
      renderTvHistory();
      showToast(`"${seasonName}" retirée`);
      if (typeof statsDirty !== 'undefined') statsDirty = true;
    },
    true
  );
}

function renderTvShowCard(show) {
  const avg = computeShowAverageScore(show);
  const seasons = Object.entries(show.seasons || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
  const ratedCount = seasons.filter(([, s]) => s.rating).length;
  const posterUrl = show.poster_path ? `https://image.tmdb.org/t/p/w154${show.poster_path}` : '';

  return `
    <div class="tv-show-card">
      <div class="tv-show-card-header">
        <button type="button" class="tv-show-card-open-btn" data-show-id="${show.tmdbTvId}" aria-label="Voir la fiche de ${escAttr(show.title)}">
          ${posterUrl ? `<img class="tv-show-card-poster" src="${posterUrl}" alt="">` : `<div class="tv-show-card-poster tv-show-card-poster-ph">${ICONS.tv || '📺'}</div>`}
          <div class="tv-show-card-info">
            <div class="tv-show-card-title">${escAttr(show.title)}</div>
            <div class="tv-show-card-score">${avg != null ? `${avg.toFixed(1)}/10` : 'Pas encore notée'} <span class="tv-show-card-count">(${ratedCount}/${seasons.length} saison${seasons.length > 1 ? 's' : ''} notée${ratedCount > 1 ? 's' : ''})</span></div>
          </div>
        </button>
        <button type="button" class="tv-show-delete-btn" data-show-id="${show.tmdbTvId}" aria-label="Retirer ${escAttr(show.title)}">${ICONS.trash}</button>
      </div>
      <details class="tv-show-seasons-fold">
        <summary>Voir les ${seasons.length} saison${seasons.length > 1 ? 's' : ''}</summary>
        <div class="tv-show-seasons-list">
          ${seasons.map(([key, s]) => `
            <div class="tv-season-row" data-show-id="${show.tmdbTvId}" data-season-key="${key}">
              <div class="hist-swipe-hint hist-swipe-hint-left" aria-hidden="true">${ICONS.trash} Supprimer</div>
              <div class="hist-swipe-hint hist-swipe-hint-right" aria-hidden="true">${ICONS.edit} Modifier</div>
              <div class="tv-season-row-content">
                <button type="button" class="tv-season-reopen-btn" data-show-id="${show.tmdbTvId}" data-season-key="${key}" aria-label="Rouvrir ${escAttr(s.seasonName)} pour la noter">
                  <span>${escAttr(s.seasonName)}</span>
                  <span>${s.rating ? `${s.rating.score}/10` : `${s.watchedEpisodes.length}/${s.totalEpisodes} ép.`}</span>
                </button>
                <button type="button" class="tv-season-delete-btn" data-show-id="${show.tmdbTvId}" data-season-key="${key}" aria-label="Retirer ${escAttr(s.seasonName)}">${ICONS.trash}</button>
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    </div>
  `;
}

// Glissement sur les lignes de saison — mêmes paramètres physiques déjà
// éprouvés que l'historique films (voir initHistoryGestures), mais
// contrôleur séparé plutôt qu'une généralisation complète : le système
// film est ancien, très affiné (de nombreux bugs corrigés un par un au
// fil de plusieurs sessions), le réécrire pour le rendre générique aurait
// un vrai risque de régression sur un comportement déjà fiable et testé.
// Version allégée ici : pas de menu d'appui long (pas d'équivalent série
// pour l'instant), pas de survie à un nouveau rendu complexe (un
// re-rendu annule simplement un geste armé, acceptable sur cette liste
// moins sollicitée que l'historique principal).
function initTvSeasonSwipeGestures(container) {
  const MOVE_CANCEL_PX = 12;
  const SWIPE_THRESHOLD = 80;
  const MAX_DRAG = 130;

  let startX = 0, startY = 0;
  let pressedItem = null, pressedContent = null;
  let wasSwipe = false;
  let swipeMode = null;
  let dx = 0;
  let armedItem = null, armedDirection = null;

  function cancelArmed() {
    if (!armedItem) return;
    const content = armedItem.querySelector('.tv-season-row-content');
    if (content) { content.style.transition = 'transform var(--dur-base) var(--ease-out)'; content.style.transform = ''; }
    armedItem.classList.remove('hist-swipe-armed-left', 'hist-swipe-armed-right', 'hist-swipe-left', 'hist-swipe-right');
    armedItem = null;
    armedDirection = null;
  }

  function confirmArmed() {
    if (!armedItem) return;
    const showId = armedItem.dataset.showId;
    const seasonKey = armedItem.dataset.seasonKey;
    const dir = armedDirection;
    armedItem = null;
    armedDirection = null;
    if (dir === 'left') {
      deleteTvSeasonWithConfirm(showId, seasonKey);
    } else {
      reopenTvSeason(showId, seasonKey);
    }
  }

  function resetGesture() {
    if (pressedItem) pressedItem.classList.remove('hist-dragging');
    pressedItem = null;
    pressedContent = null;
    swipeMode = null;
    dx = 0;
  }

  function cancelGestureFully() {
    if (pressedItem) {
      if (pressedContent) {
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = '';
      }
      pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
    }
    resetGesture();
  }

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.tv-season-row');
    if (!item || e.target.closest('.tv-season-reopen-btn') || e.target.closest('.tv-season-delete-btn')) { resetGesture(); return; }
    e.stopPropagation();
    pressedItem = item;
    pressedContent = item.querySelector('.tv-season-row-content');
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swipeMode = null;
    dx = 0;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!pressedItem) return;
    e.stopPropagation();
    const rawDx = e.touches[0].clientX - startX;
    const rawDy = e.touches[0].clientY - startY;
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll';
        if (swipeMode === 'swipe') {
          if (armedItem === pressedItem) cancelArmed();
          pressedItem.classList.add('hist-dragging');
        }
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;
    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
    pressedItem.classList.toggle('hist-swipe-right', dx > 10);
  }, { passive: true });

  function resolveGesture() {
    if (!pressedItem) return;
    if (swipeMode === 'swipe') {
      if (dx <= -SWIPE_THRESHOLD) {
        cancelArmed();
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = 'translateX(-120px)';
        pressedItem.classList.add('hist-swipe-armed-left');
        armedItem = pressedItem;
        armedDirection = 'left';
        hapticPulse(pressedItem, 'medium');
      } else if (dx >= SWIPE_THRESHOLD) {
        cancelArmed();
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = 'translateX(120px)';
        pressedItem.classList.add('hist-swipe-armed-right');
        armedItem = pressedItem;
        armedDirection = 'right';
        hapticPulse(pressedItem, 'medium');
      } else {
        pressedContent.style.transform = '';
        pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
      }
      wasSwipe = true;
      setTimeout(() => { wasSwipe = false; }, 300);
    }
    resetGesture();
  }
  container.addEventListener('touchend', resolveGesture);
  container.addEventListener('touchcancel', cancelGestureFully);

  // Souris (pratique pour tester sur desktop / vercel dev)
  let mouseActive = false;
  container.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.tv-season-row');
    if (!item || e.target.closest('.tv-season-reopen-btn') || e.target.closest('.tv-season-delete-btn')) return;
    mouseActive = true;
    pressedItem = item;
    pressedContent = item.querySelector('.tv-season-row-content');
    startX = e.clientX;
    startY = e.clientY;
    swipeMode = null;
    dx = 0;
  });
  document.addEventListener('mousemove', (e) => {
    if (!mouseActive || !pressedItem) return;
    const rawDx = e.clientX - startX;
    const rawDy = e.clientY - startY;
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll';
        if (swipeMode === 'swipe') {
          if (armedItem === pressedItem) cancelArmed();
          pressedItem.classList.add('hist-dragging');
        }
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;
    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
    pressedItem.classList.toggle('hist-swipe-right', dx > 10);
  });
  document.addEventListener('mouseup', () => {
    if (!mouseActive) return;
    mouseActive = false;
    resolveGesture();
  });

  container.addEventListener('click', (e) => {
    if (armedItem) {
      const hint = e.target.closest('.hist-swipe-hint');
      const clickedItem = e.target.closest('.tv-season-row');
      if (hint && clickedItem === armedItem) {
        confirmArmed();
        return;
      }
      const wasArmedItself = clickedItem === armedItem;
      cancelArmed();
      if (wasArmedItself) return;
    }
  }, true); // capture : s'exécute avant les listeners de clic sur les boutons internes (reopen/delete)

  document.addEventListener('click', (e) => {
    if (armedItem && !container.contains(e.target)) cancelArmed();
  }, true);
}

function reopenTvSeason(showId, seasonKey) {
  const show = loadTvShows().find(s => String(s.tmdbTvId) === String(showId));
  if (!show) return;
  switchMobileNav('rating');
  setMediaType('tv');
  selectedShow = { id: show.tmdbTvId, name: show.title, poster_path: show.poster_path };
  document.getElementById('tv-search').value = show.title;
  document.getElementById('tv-season-picker').style.display = 'none';
  const seasonData = show.seasons[seasonKey];
  selectSeason({ number: seasonKey, name: seasonData.seasonName, episodeCount: seasonData.totalEpisodes, poster: show.poster_path });
  document.getElementById('notation-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ═══════════════════════════════════════════
//  SÉRIES — Phase 5 : statistiques
// ═══════════════════════════════════════════
// Bascule sur le tableau de bord (KPI, radar, distribution des notes) —
// comptage par SÉRIE, pas par saison, comme partout ailleurs dans le
// module. La heatmap ET le graphique "Activité (6 derniers mois)" restent
// UNIQUES dans les deux modes (décidé ensemble) : ils montrent le rythme
// de visionnage global, films et séries confondus, pas de dédoublement.
// "Top Réalisateurs" n'a pas d'équivalent série pour l'instant (aucune
// donnée de showrunner récupérée) — replié plutôt que vide ou trompeur.

function switchStatsMediaFilter(type) {
  statsMediaFilter = type;
  document.getElementById('stats-tab-movie').classList.toggle('active', type === 'movie');
  document.getElementById('stats-tab-tv').classList.toggle('active', type === 'tv');
  document.getElementById('kpi-total-label').textContent = type === 'movie' ? 'Films notés' : 'Séries suivies';
  document.getElementById('top-directors-box').style.display = type === 'movie' ? '' : 'none';
  if (type === 'tv') renderTvStats(); else renderStats();
}

function renderTvStats() {
  const shows = loadTvShows();
  animateCountUp(document.getElementById('kpi-total'), shows.length);

  const showAverages = shows.map(computeShowAverageScore).filter(a => a != null);
  if (showAverages.length === 0) {
    document.getElementById('kpi-avg').textContent = '-';
  } else {
    const avg = showAverages.reduce((a, b) => a + b, 0) / showAverages.length;
    animateCountUp(document.getElementById('kpi-avg'), avg, { decimals: 1 });
  }

  // Compte les SÉRIES ayant au moins une saison notée cette année (pas le
  // nombre brut de saisons notées) — même logique de comptage par série.
  const currentYear = new Date().getFullYear().toString();
  const yearShowsCount = shows.filter(s =>
    Object.values(s.seasons || {}).some(se => se.rating?.date?.startsWith(currentYear))
  ).length;
  animateCountUp(document.getElementById('kpi-year'), yearShowsCount);

  const allRatings = getAllTvSeasonRatings();

  if (allRatings.length === 0) {
    document.getElementById('radar-chart-container').innerHTML = '';
    document.getElementById('radar-empty').style.display = 'block';
  } else {
    const avgsByCriterion = computeCriteriaAverages(allRatings, CRITERIA);
    const avgs = CRITERIA.map(c => avgsByCriterion[c] || 0);
    const radarSvg = createRadarSVG(avgs, 'tv');
    if (radarSvg) {
      document.getElementById('radar-chart-container').innerHTML = radarSvg;
      document.getElementById('radar-empty').style.display = 'none';
    } else {
      document.getElementById('radar-chart-container').innerHTML = '';
      document.getElementById('radar-empty').style.display = 'block';
    }
  }

  // Timeline fusionnée (films + séries), identique à ce qu'affiche le mode
  // Films — voir le commentaire en tête de section.
  document.getElementById('timeline-chart-container').innerHTML = createTimelineSVG(loadHistory().concat(allRatings));

  const dist = { '50': 0, '45': 0, '40': 0, '35': 0, '30': 0, '25': 0, '20': 0, '15': 0, '10': 0, '05': 0 };
  allRatings.forEach(r => {
    const stars = Math.round((parseFloat(r.score) / 2) * 2) / 2;
    const key = Math.round(stars * 10).toString().padStart(2, '0');
    if (dist[key] !== undefined) dist[key]++;
  });
  buildHistogram(dist);
}

// ═══════════════════════════════════════════
//  SÉRIES — Widget "En cours" (onglet Noter, mode Série uniquement)
// ═══════════════════════════════════════════
// Une carte par série ayant un épisode à regarder : soit une saison
// entamée mais pas finie, soit — si la dernière saison connue vient
// d'être terminée — la saison suivante si elle existe (détectée via TMDb,
// pas stockée d'avance puisque seules les saisons déjà sélectionnées sont
// connues localement). Si aucune suite n'existe, la série disparaît
// simplement du widget.

async function renderTvContinueList() {
  const container = document.getElementById('tv-continue-list');
  const shows = loadTvShows();
  const candidates = [];

  for (const show of shows) {
    const entries = Object.entries(show.seasons || {});
    const partial = entries
      .filter(([, s]) => s.totalEpisodes > 0 && s.watchedEpisodes.length < s.totalEpisodes)
      .sort((a, b) => Number(b[0]) - Number(a[0]))[0];
    if (partial) {
      candidates.push({ show, seasonKey: partial[0], seasonEntry: partial[1] });
      continue;
    }
    const complete = entries
      .filter(([, s]) => s.totalEpisodes > 0 && s.watchedEpisodes.length >= s.totalEpisodes)
      .sort((a, b) => Number(b[0]) - Number(a[0]))[0];
    if (complete) {
      candidates.push({ show, seasonKey: complete[0], seasonEntry: complete[1], needsNextSeasonCheck: true });
    }
  }

  if (candidates.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = candidates.map((c, i) => `<div class="tv-continue-card tv-continue-loading" data-continue-idx="${i}">Chargement…</div>`).join('');

  candidates.forEach(async (cand, idx) => {
    const resolved = await resolveNextTvEpisode(cand);
    const placeholder = container.querySelector(`[data-continue-idx="${idx}"]`);
    if (!placeholder) return; // le conteneur a pu être reconstruit entre-temps
    if (!resolved) {
      placeholder.remove();
      if (container.children.length === 0) container.style.display = 'none';
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderTvContinueCard(resolved);
    placeholder.replaceWith(wrapper.firstElementChild);
  });
}

async function resolveNextTvEpisode(cand) {
  const { show, needsNextSeasonCheck } = cand;
  let seasonKey = cand.seasonKey;
  let seasonEntry = cand.seasonEntry;

  if (needsNextSeasonCheck) {
    const nextNum = Number(seasonKey) + 1;
    try {
      const showDetail = await fetch(`/api/search?tvId=${show.tmdbTvId}`).then(readApiJson);
      const nextMeta = (showDetail.seasons || []).find(s => s.season_number === nextNum);
      if (!nextMeta) return null; // pas de saison suivante
      const shows = loadTvShows();
      const showEntry = shows.find(s => String(s.tmdbTvId) === String(show.tmdbTvId));
      seasonKey = String(nextNum);
      if (!showEntry.seasons[seasonKey]) {
        showEntry.seasons[seasonKey] = { seasonName: nextMeta.name, watchedEpisodes: [], totalEpisodes: nextMeta.episode_count };
        saveTvShows(shows);
      }
      seasonEntry = showEntry.seasons[seasonKey];
    } catch { return null; }
  }

  try {
    const seasonData = await fetch(`/api/search?tvSeasonShowId=${show.tmdbTvId}&tvSeasonNumber=${seasonKey}`).then(readApiJson);
    const episodes = seasonData.episodes || [];
    const nextEp = episodes.find(e => !seasonEntry.watchedEpisodes.includes(e.episode_number));
    if (!nextEp) return null;
    return { show, seasonKey, seasonEntry, episode: nextEp };
  } catch { return null; }
}

function renderTvContinueCard({ show, seasonKey, seasonEntry, episode }) {
  const posterUrl = show.poster_path ? `https://image.tmdb.org/t/p/w154${show.poster_path}` : '';
  const meta = [
    episode.air_date ? new Date(episode.air_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    episode.runtime ? `${episode.runtime} min` : '',
  ].filter(Boolean).join(' · ');
  return `
    <div class="tv-continue-card">
      ${posterUrl ? `<img class="tv-continue-poster" src="${posterUrl}" alt="">` : `<div class="tv-continue-poster tv-continue-poster-ph">${ICONS.clapper}</div>`}
      <div class="tv-continue-info">
        <div class="tv-continue-show-title">${escAttr(show.title)}</div>
        <div class="tv-continue-ep-title">${escAttr(seasonEntry.seasonName)} · Ép. ${episode.episode_number} — ${escAttr(episode.name || 'Sans titre')}</div>
        ${meta ? `<div class="tv-continue-meta">${escAttr(meta)}</div>` : ''}
        ${episode.overview ? `
          <details class="tv-continue-synopsis">
            <summary>Synopsis</summary>
            <p>${escAttr(episode.overview)}</p>
          </details>
        ` : ''}
        <button type="button" class="tv-continue-validate-btn" data-show-id="${show.tmdbTvId}" data-season-key="${seasonKey}" data-episode="${episode.episode_number}">Valider l'épisode</button>
      </div>
    </div>
  `;
}

document.getElementById('tv-continue-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('.tv-continue-validate-btn');
  if (!btn) return;
  const showId = btn.dataset.showId;
  const seasonKey = btn.dataset.seasonKey;
  const episodeNumber = Number(btn.dataset.episode);

  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
  if (!showEntry) return;
  const seasonEntry = showEntry.seasons[seasonKey];
  if (!seasonEntry.watchedEpisodes.includes(episodeNumber)) seasonEntry.watchedEpisodes.push(episodeNumber);
  saveTvShows(shows);
  if (typeof statsDirty !== 'undefined') statsDirty = true;
  maybeShowSeasonCompleteBanner(showId, seasonKey, seasonEntry);

  const cardEl = btn.closest('.tv-continue-card');
  cardEl.classList.add('tv-continue-loading');
  const resolved = await resolveNextTvEpisode({
    show: showEntry, seasonKey, seasonEntry,
    needsNextSeasonCheck: seasonEntry.watchedEpisodes.length >= seasonEntry.totalEpisodes,
  });
  const container = document.getElementById('tv-continue-list');
  if (!resolved) {
    cardEl.remove();
    if (container.children.length === 0) container.style.display = 'none';
  } else {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderTvContinueCard(resolved);
    cardEl.replaceWith(wrapper.firstElementChild);
  }
});
