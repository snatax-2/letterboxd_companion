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
