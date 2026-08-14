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
  document.getElementById('tv-season-complete-banner').style.display = 'none';
  document.getElementById('notation-card').style.display = '';
  loadSeasonRatingIntoForm();
  refreshShowAverageDisplay();

  const wrapEl = document.getElementById('tv-episodes-wrap');
  const listEl = document.getElementById('tv-episode-list');
  wrapEl.style.display = 'block';
  listEl.innerHTML = '<div class="search-status" style="display:block;">Chargement des épisodes…</div>';

  fetch(`/api/search?tvSeasonShowId=${selectedShow.id}&tvSeasonNumber=${season.number}`)
    .then(readApiJson)
    .then(data => {
      const episodes = data.episodes || [];
      if (episodes.length === 0) {
        listEl.innerHTML = '<div class="search-status" style="display:block;">Aucun épisode trouvé pour cette saison.</div>';
        return;
      }
      renderEpisodeList(episodes);
    })
    .catch(err => {
      listEl.innerHTML = `<div class="search-status" style="display:block;">${escAttr(describeApiFailure(err))}</div>`;
    });
}

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
let currentSeasonEpisodes = []; // liste brute TMDb de la saison affichee

function loadTvShows() {
  try { return JSON.parse(localStorage.getItem(TV_SHOWS_KEY)) || []; } catch { return []; }
}
function saveTvShows(shows) {
  localStorage.setItem(TV_SHOWS_KEY, JSON.stringify(shows));
}
function getOrCreateTvShow(shows) {
  let entry = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
  if (!entry) {
    entry = { tmdbTvId: selectedShow.id, title: selectedShow.name, poster_path: selectedShow.poster_path, seasons: {} };
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

function renderEpisodeList(episodes) {
  currentSeasonEpisodes = episodes;
  const shows = loadTvShows();
  const showEntry = getOrCreateTvShow(shows);
  const seasonEntry = getOrCreateTvSeason(showEntry, selectedSeasonName, episodes.length);
  saveTvShows(shows); // cree l'entree tout de suite, meme a 0 episode coche

  const listEl = document.getElementById('tv-episode-list');
  listEl.innerHTML = episodes.map(ep => {
    const watched = seasonEntry.watchedEpisodes.includes(ep.episode_number);
    const meta = [
      ep.air_date ? new Date(ep.air_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      ep.runtime ? `${ep.runtime} min` : '',
    ].filter(Boolean).join(' · ');
    return `
      <div class="tv-episode-row" data-episode="${ep.episode_number}">
        <button type="button" class="tv-episode-check${watched ? ' watched' : ''}" data-episode="${ep.episode_number}" aria-pressed="${watched}" aria-label="Marquer l'épisode ${ep.episode_number} comme ${watched ? 'non vu' : 'vu'}">
          <svg class="tv-episode-checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>
        </button>
        <div class="tv-episode-info">
          <div class="tv-episode-title">${ep.episode_number}. ${escAttr(ep.name || 'Sans titre')}</div>
          ${meta ? `<div class="tv-episode-meta">${escAttr(meta)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.tv-episode-check').forEach(btn => {
    btn.addEventListener('click', () => onEpisodeCheckClick(Number(btn.dataset.episode)));
  });

  updateTvProgressUI(seasonEntry);
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
  // La saison existe deja forcement (creee des la selection, voir
  // renderEpisodeList) — on y ajoute juste la note, sans repasser par
  // getOrCreateTvSeason pour ne pas risquer d'ecraser totalEpisodes avec
  // une valeur perimee.
  if (!showEntry.seasons[seasonKey]) {
    showEntry.seasons[seasonKey] = { seasonName: selectedSeasonName, watchedEpisodes: [], totalEpisodes: currentSeasonEpisodes.length };
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


function onEpisodeCheckClick(episodeNumber) {
  const shows = loadTvShows();
  const showEntry = getOrCreateTvShow(shows);
  const seasonEntry = getOrCreateTvSeason(showEntry, selectedSeasonName, currentSeasonEpisodes.length);
  const already = seasonEntry.watchedEpisodes.includes(episodeNumber);

  if (already) {
    // Decoche simple, jamais de question posee pour un retrait.
    seasonEntry.watchedEpisodes = seasonEntry.watchedEpisodes.filter(n => n !== episodeNumber);
    saveTvShows(shows);
    applyEpisodeWatchedState(episodeNumber, false, false);
    updateTvProgressUI(seasonEntry);
    document.getElementById('tv-season-complete-banner').style.display = 'none';
    return;
  }

  const maxWatched = seasonEntry.watchedEpisodes.length ? Math.max(...seasonEntry.watchedEpisodes) : 0;
  const skipsAhead = episodeNumber > maxWatched + 1;

  const markWatched = (numbers) => {
    for (const n of numbers) {
      if (!seasonEntry.watchedEpisodes.includes(n)) seasonEntry.watchedEpisodes.push(n);
    }
    saveTvShows(shows);
    for (const n of numbers) applyEpisodeWatchedState(n, true, true);
    updateTvProgressUI(seasonEntry);
    maybeShowSeasonCompleteBanner(seasonEntry);
  };

  if (skipsAhead) {
    const from = maxWatched + 1;
    const proposeAll = confirm(`Marquer aussi les épisodes ${from} à ${episodeNumber - 1} comme vus ?`);
    const toMark = [];
    if (proposeAll) { for (let n = from; n <= episodeNumber; n++) toMark.push(n); }
    else toMark.push(episodeNumber);
    markWatched(toMark);
  } else {
    markWatched([episodeNumber]);
  }
}

function applyEpisodeWatchedState(episodeNumber, watched, animate) {
  const btn = document.querySelector(`.tv-episode-check[data-episode="${episodeNumber}"]`);
  if (!btn) return;
  btn.classList.toggle('watched', watched);
  btn.setAttribute('aria-pressed', String(watched));
  btn.setAttribute('aria-label', `Marquer l'épisode ${episodeNumber} comme ${watched ? 'non vu' : 'vu'}`);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (watched && animate && !reduceMotion) {
    btn.classList.add('just-checked');
    btn.addEventListener('animationend', () => btn.classList.remove('just-checked'), { once: true });
  }
}

function updateTvProgressUI(seasonEntry) {
  const n = seasonEntry.watchedEpisodes.length;
  const total = seasonEntry.totalEpisodes;
  document.getElementById('tv-progress-label').textContent = `${n}/${total} épisode${total > 1 ? 's' : ''} vu${n > 1 ? 's' : ''}`;
  document.getElementById('tv-progress-fill').style.width = total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';
}

function maybeShowSeasonCompleteBanner(seasonEntry) {
  if (seasonEntry.watchedEpisodes.length < seasonEntry.totalEpisodes) return;
  document.getElementById('tv-season-complete-banner').style.display = 'flex';
}

document.getElementById('tv-season-complete-dismiss').addEventListener('click', () => {
  document.getElementById('tv-season-complete-banner').style.display = 'none';
});
document.getElementById('tv-rate-season-btn').addEventListener('click', () => {
  document.getElementById('tv-season-complete-banner').style.display = 'none';
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
  // Le filtre par genre n'a pas d'équivalent série pour l'instant (pas de
  // données de genre récupérées côté séries) — replié en mode Séries.
  if (type === 'tv') document.getElementById('genre-fold').style.display = 'none';
  renderActiveHistoryView();
  updateHistoryCountBadge();
}

function updateHistoryCountBadge() {
  const badge = document.getElementById('hist-count-badge');
  const filmCount = loadHistory().length;
  const showCount = loadTvShows().length;
  badge.textContent = `${filmCount} film${filmCount > 1 ? 's' : ''} · ${showCount} série${showCount > 1 ? 's' : ''}`;
}

function getSortedTvShows() {
  const shows = loadTvShows();
  let s = shows;
  if (historySearchQuery) {
    s = s.filter(sh => sh.title && sh.title.toLowerCase().includes(historySearchQuery));
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
  const shows = getSortedTvShows();
  const container = document.getElementById('tv-history-list');

  if (loadTvShows().length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.clapper}</div>Aucune série suivie pour l'instant — cherche-en une dans l'onglet Noter.</div>`;
    return;
  }
  if (shows.length === 0) {
    container.innerHTML = `<div class="empty-state">Aucun résultat pour cette recherche.</div>`;
    return;
  }

  container.innerHTML = shows.map(renderTvShowCard).join('');

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
          updateHistoryCountBadge();
          showToast(`"${show.title}" retirée`);
          if (typeof statsDirty !== 'undefined') statsDirty = true;
        }
      );
    });
  });

  container.querySelectorAll('.tv-season-row').forEach(row => {
    row.addEventListener('click', () => reopenTvSeason(row.dataset.showId, row.dataset.seasonKey));
  });
}

function renderTvShowCard(show) {
  const avg = computeShowAverageScore(show);
  const seasons = Object.entries(show.seasons || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
  const ratedCount = seasons.filter(([, s]) => s.rating).length;
  const posterUrl = show.poster_path ? `https://image.tmdb.org/t/p/w154${show.poster_path}` : '';

  return `
    <div class="tv-show-card">
      <div class="tv-show-card-header">
        ${posterUrl ? `<img class="tv-show-card-poster" src="${posterUrl}" alt="">` : `<div class="tv-show-card-poster tv-show-card-poster-ph">${ICONS.tv || '📺'}</div>`}
        <div class="tv-show-card-info">
          <div class="tv-show-card-title">${escAttr(show.title)}</div>
          <div class="tv-show-card-score">${avg != null ? `${avg.toFixed(1)}/10` : 'Pas encore notée'} <span class="tv-show-card-count">(${ratedCount}/${seasons.length} saison${seasons.length > 1 ? 's' : ''} notée${ratedCount > 1 ? 's' : ''})</span></div>
        </div>
        <button type="button" class="tv-show-delete-btn" data-show-id="${show.tmdbTvId}" aria-label="Retirer ${escAttr(show.title)}">${ICONS.trash}</button>
      </div>
      <details class="tv-show-seasons-fold">
        <summary>Voir les ${seasons.length} saison${seasons.length > 1 ? 's' : ''}</summary>
        <div class="tv-show-seasons-list">
          ${seasons.map(([key, s]) => `
            <div class="tv-season-row" data-show-id="${show.tmdbTvId}" data-season-key="${key}" role="button" tabindex="0">
              <span>${escAttr(s.seasonName)}</span>
              <span>${s.rating ? `${s.rating.score}/10` : `${s.watchedEpisodes.length}/${s.totalEpisodes} ép.`}</span>
            </div>
          `).join('')}
        </div>
      </details>
    </div>
  `;
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
      .filter(([, s]) => s.watchedEpisodes.length > 0 && s.watchedEpisodes.length < s.totalEpisodes)
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
