/* exported switchHistoryMediaFilter, switchStatsMediaFilter */
// Ces fonctions sont appelees depuis des attributs onclick d'index.html,
// pas depuis le JS : ESLint ne peut pas voir cet usage. La directive
// `exported` le lui declare, et documente au passage ce couplage
// HTML -> JS (a resorber le jour ou on retirera les onclick en ligne,
// ce qui permettra aussi de durcir la CSP en retirant 'unsafe-inline').
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
let tvRatingFormBaseline = null;
let tvFormRevision = 0;

// Ludex 2.0 : cœur "coup de cœur" du formulaire Noter séries — même
// principe visuel que #heart-btn côté film, mais écrit directement sur
// show.liked dès le clic (pas au moment de sauvegarder une note) : la
// série entière est la donnée concernée, indépendante de la saison en
// cours de notation, donc pas de sens à la faire attendre un
// enregistrement de saison pour prendre effet. Migré depuis la fiche
// détail (#tds-heart-btn, 19-tv-detail.js) — même comportement, juste
// déplacé pour être au même endroit que côté film.
document.getElementById('tv-heart-btn')?.addEventListener('click', tvAction(async () => {
  const btn = document.getElementById('tv-heart-btn');
  if (!selectedShow) { showToast('Choisis une série avant de la marquer comme coup de cœur.'); return; }
  const showId = selectedShow.id;
  const liked = await mutateTvShows(shows => {
    const show = shows.find(s => String(s.tmdbTvId) === String(showId));
    if (!show) return undefined; // signale "série pas encore suivie" à l'appelant, sans rien modifier
    show.liked = !show.liked;
    // Ludex 2.0 : horodatage du dernier changement — bug corrigé (signalé
    // par l'utilisateur : "je décoche un coup de cœur, ça revient tout
    // seul quelques instants après"). La fusion cloud (mergeTvShows,
    // 03b-pure-logic.js) appliquait jusqu'ici "un true de n'importe quel
    // côté l'emporte", en l'absence de tout horodatage pour trancher —
    // un choix qui semblait sans conséquence en le posant, mais qui
    // ressuscitait le coup de cœur depuis une copie cloud pas encore à
    // jour dès que la synchro automatique (toutes les 45s) tombait juste
    // après un décochage. Avec cette date, la fusion peut désormais
    // garder le changement le plus RÉCENT plutôt qu'un true aveugle.
    show.likedAt = new Date().toISOString();
    return show.liked;
  });
  if (liked === undefined) { showToast('Commence à suivre cette série avant de la marquer comme coup de cœur.'); return; }
  if (String(selectedShow?.id) !== String(showId)) return;
  btn.classList.toggle('active', liked);
  btn.setAttribute('aria-pressed', String(liked));
  hapticPulse(btn, 'medium');
  if (typeof statsDirty !== 'undefined') statsDirty = true;
}));

// Reflète l'état liked de la série actuelle sur le bouton — appelé chaque
// fois qu'une série est sélectionnée ou qu'une saison est chargée (voir
// selectShow()/loadAndDisplaySeason() plus bas), pour que le cœur affiche
// toujours le bon état au lieu de rester figé sur la série précédente.
function refreshTvHeartBtnState() {
  const btn = document.getElementById('tv-heart-btn');
  if (!btn) return;
  const shows = loadTvShows();
  const show = selectedShow ? shows.find(s => String(s.tmdbTvId) === String(selectedShow.id)) : null;
  const liked = !!show?.liked;
  btn.classList.toggle('active', liked);
  btn.setAttribute('aria-pressed', String(liked));
}

function setMediaType(type, { restore = true } = {}) {
  const changed = currentMediaType !== type;
  if (changed) saveDraft();
  currentMediaType = type;
  document.getElementById('tab-media-movie').classList.toggle('active', type === 'movie');
  document.getElementById('tab-media-tv').classList.toggle('active', type === 'tv');
  const movieFields = document.getElementById('movie-only-fields');
  const tvFields = document.getElementById('tv-only-fields');
  if (type === 'movie') fadeSwitchDisplay(tvFields, movieFields); else fadeSwitchDisplay(movieFields, tvFields);
  document.getElementById('film-card-title').textContent = type === 'movie' ? 'Film' : 'Série';
  applyCriteriaLabelsForMediaType(type);
  // Pour un film, la carte Notation est toujours visible (on peut ajuster
  // les curseurs avant même d'avoir cherché un titre). Pour une série, il
  // faut d'abord qu'une saison soit sélectionnée pour que noter ait un
  // sens — selectSeason() la révèle elle-même le moment venu.
  document.getElementById('notation-card').style.display = type === 'movie' || selectedSeasonNumber != null ? '' : 'none';
  if (type === 'tv' && typeof renderTvContinueList === 'function') renderTvContinueList();
  if (changed && restore) {
    if (type === 'movie') loadDraft();
    else withRatingDraftRestore(resumeLastTvDraft);
  }
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
        <img class="suggestion-poster" src="${tmdbImage(s.poster_path, 'w92')}" alt="" loading="lazy">
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

function resetTvRatingTarget() {
  tvFormRevision++;
  tvRatingFormBaseline = null;
  tvRatingSource = null;
  tvDraftInitial = '';
  selectedShow = null;
  selectedSeasonNumber = null;
  selectedSeasonName = null;
  selectedSeasonEpisodeCount = 0;
  document.getElementById('tv-search').value = '';
  for (const id of ['tv-season-strip', 'tv-season-picker', 'tv-season-start-prompt', 'tv-season-in-progress-msg', 'tv-season-complete-banner']) document.getElementById(id).style.display = 'none';
  if (currentMediaType === 'tv') document.getElementById('notation-card').style.display = 'none';
}

async function selectShow(show) {
  saveDraft();
  resetTvRatingTarget();
  selectedShow = show;
  if (currentMediaType === 'tv') document.getElementById('notation-card').style.display = 'none';
  refreshTvHeartBtnState();
  tvSuggestEl.style.display = 'none';
  tvSearchEl.value = show.name;
  document.getElementById('tv-season-strip').style.display = 'none';
  document.getElementById('tv-season-picker').style.display = 'none';
  openTvDetailSheet(show.id);
}

function selectSeason(season, { capture = true } = {}) {
  if (capture) saveDraft();
  tvFormRevision++;
  tvRatingFormBaseline = null;
  const stripEl = document.getElementById('tv-season-strip');
  stripEl.style.display = 'flex';
  const posterImg = document.getElementById('tv-strip-poster');
  posterImg.src = tmdbImage(season.poster, 'w200');
  document.getElementById('tv-strip-title').textContent = `${selectedShow.name} — ${season.name}`;
  document.getElementById('tv-strip-genre').textContent = `${season.episodeCount} épisode${season.episodeCount > 1 ? 's' : ''}`;
  selectedSeasonNumber = Number(season.number);
  selectedSeasonName = season.name;
  selectedSeasonEpisodeCount = Number(season.episodeCount);
  document.getElementById('tv-season-complete-banner').style.display = 'none';
  refreshShowAverageDisplay();

  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(selectedShow?.id));
  const localSeason = showEntry?.seasons?.[String(selectedSeasonNumber)];
  const episodesComplete = getTvSeasonProgress(selectedShow.id, selectedSeasonNumber, localSeason, { episode_count: season.episodeCount }).complete;
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

async function startTrackingSeason() {
  if (!selectedShow || selectedSeasonNumber == null) return;
  const target = { show: { ...selectedShow }, number: selectedSeasonNumber, name: selectedSeasonName, count: selectedSeasonEpisodeCount, revision: tvFormRevision };
  await mutateTvShows(shows => {
    const showEntry = getOrCreateTvShow(shows, target.show);
    showEntry.paused = false;
    showEntry.continueHidden = false;
    Object.values(showEntry.seasons).forEach(s => { s.paused = false; });
    const seasonKey = String(target.number);
    if (!showEntry.seasons[seasonKey]) {
      showEntry.seasons[seasonKey] = { seasonName: target.name, watchedEpisodes: [], totalEpisodes: target.count };
    }
  });
  if (target.revision !== tvFormRevision) return;
  document.getElementById('tv-season-start-prompt').style.display = 'none';
  document.getElementById('tv-season-in-progress-msg').style.display = 'flex';
  document.getElementById('tv-in-progress-text').textContent =
    `0/${selectedSeasonEpisodeCount} épisodes vus — continue depuis le widget "En cours" en haut de cet onglet.`;
  showToast(`"${selectedShow.name} — ${selectedSeasonName}" ajoutée à En cours`);
}
document.getElementById('tv-start-season-btn').addEventListener('click', tvAction(startTrackingSeason));

// ═══════════════════════════════════════════
//  SÉRIES — Phase 2 : suivi épisode par épisode
// ═══════════════════════════════════════════
// Stockage : une entrée par SÉRIE (lbx_tv_shows), avec ses saisons
// imbriquées — chaque saison garde la liste des épisodes vus et son
// total. Aucune note stockée ici (Phase 3) : la note de saison viendra
// plus tard, la note globale de série ne sera jamais stockée du tout,
// toujours recalculée à la volée à partir des saisons notées.
let selectedSeasonNumber = null;
let selectedSeasonName = null;
let selectedSeasonEpisodeCount = 0;

function loadTvShows() {
  return readTvState().shows;
}
function saveTvShows(shows, state) {
  return persistTvState(shows, state);
}

// Tous les producteurs (fiche, widget, note, import, cloud) partagent la
// même transaction. Le verrou Web Locks l'étend aux autres onglets.
let _tvShowsWriteQueue = Promise.resolve();
function mutateTvShows(mutator, { remote = false, recordWatching = false } = {}) {
  const transaction = async () => {
    const state = readTvState();
    const before = normalizeTvShows(state.shows);
    let shows = JSON.parse(JSON.stringify(before));
    const result = await mutator(shows, state);
    if (Array.isArray(result)) shows = result;
    if (!remote) {
      const at = nextTvChangeTime(state);
      shows = stampTvChanges(before, shows, at, recordWatching ? new Date().toISOString() : '');
      recordTvDeletions(before, shows, state, at);
    }
    if (!saveTvShows(shows, state)) {
      throw new Error('Modification non enregistrée : stockage local indisponible.');
    }
    return Array.isArray(result) ? shows : result;
  };
  const resultPromise = _tvShowsWriteQueue.then(() =>
    navigator.locks?.request ? navigator.locks.request('ludex-tv-state', transaction) : transaction()
  );
  _tvShowsWriteQueue = resultPromise.catch(error => {
    console.warn('[Ludex séries]', error.message);
    showToast(error.message);
  });
  return resultPromise;
}

function getOrCreateTvShow(shows, target) {
  let entry = shows.find(s => String(s.tmdbTvId) === String(target.id));
  if (!entry) {
    entry = { tmdbTvId: target.id, title: target.name, poster_path: target.poster_path, genre: target.genres || '', seasons: {} };
    shows.push(entry);
  }
  return entry;
}
function loadSeasonRatingIntoForm() {
  return withRatingDraftRestore(loadTvRatingForm);
}
function loadTvRatingForm() {
  tvRatingFormBaseline = null;
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
  const seasonEntry = showEntry && showEntry.seasons[String(selectedSeasonNumber)];
  const rating = seasonEntry && seasonEntry.rating;
  tvRatingSource = tvRatingSourceOf(showEntry, seasonEntry);
  CRITERIA.forEach(c => { document.getElementById(`w-${c}`).value = rating?.weights?.[c] ?? 1; });
  updateWeightBadges();
  quickRating = 2.5;
  document.querySelectorAll('#quick-stars-container input').forEach(input => { input.checked = false; });
  document.getElementById('s5').checked = true;

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
  document.getElementById('tv-view-date').value = rating?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  if (rating) tvRatingFormBaseline = { fingerprint: tvStableJson(readTvRatingInputs()), rating: JSON.parse(JSON.stringify(rating)) };
  calculateScore();
  updateQuickLabel();
  updateAllSliders();
  tvDraftInitial = tvStableJson(tvDraftForm());
  restoreTvRatingDraft();
}

function readTvRatingInputs() {
  return {
    mode: currentMode,
    values: currentMode === 'detail'
      ? Object.fromEntries(CRITERIA.map(c => [c, document.getElementById(c).value]))
      : { quick: quickRating },
    weights: currentMode === 'detail' ? getWeights() : null,
  };
}

function unchangedTvRating() {
  return tvRatingFormBaseline && tvRatingFormBaseline.fingerprint === tvStableJson(readTvRatingInputs())
    ? tvRatingFormBaseline.rating : null;
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
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(selectedShow?.id));
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

async function saveTvSeasonRating() {
  if (!selectedShow || selectedSeasonNumber == null) {
    showToast('Sélectionne une série et une saison avant de noter.');
    return;
  }
  const score = calculateScore();
  const target = { show: { ...selectedShow }, name: selectedSeasonName, count: selectedSeasonEpisodeCount, revision: tvFormRevision };
  const seasonKey = String(selectedSeasonNumber);
  const draftKey = tvDraftKey(target.show.id, seasonKey);
  const submitted = tvStableJson(tvDraftForm());
  const submittedInputs = tvStableJson(readTvRatingInputs());
  const source = tvRatingSource;
  const ratingPayload = {
    // Sans retouche des curseurs, conserver aussi les anciennes notes dont
    // les poids historiques sont inconnus. Ne jamais inventer ces poids.
    ...(unchangedTvRating() || { ...readTvRatingInputs(), score: score.toFixed(1), stars: document.getElementById('stars-display').textContent }),
    review: document.getElementById('review-text').value.trim(),
    // Ludex 2.0 : date choisie par l'utilisateur (voir #tv-view-date,
    // index.html) plutôt que l'instant de sauvegarde imposé — même format
    // "YYYY-MM-DD" que le film (#view-date), pas un horodatage complet.
    date: document.getElementById('tv-view-date')?.value || new Date().toISOString().slice(0, 10),
  };
  await mutateTvShows(shows => {
    const currentShow = shows.find(show => String(show.tmdbTvId) === String(target.show.id));
    const currentSeason = currentShow?.seasons[seasonKey];
    const currentSource = tvRatingSourceOf(currentShow, currentSeason);
    if (!currentSeason || (source && (source.show !== currentSource.show || source.season !== currentSource.season))) throw new Error('Cette saison a été retirée ou recommencée : rouvre-la avant de noter.');
    if (source && source.rating !== tvStableJson(currentSeason?.rating)) throw new Error('Note modifiée ailleurs : brouillon conservé. Rouvre une nouvelle critique pour repartir de la note actuelle.');
    if (!currentSeason.rating && !getTvSeasonProgress(target.show.id, seasonKey, currentSeason).complete) throw new Error('Termine le suivi de cette saison avant sa première note.');
    currentSeason.rating = ratingPayload;
  });
  showToast(`"${target.show.name} — ${target.name}" notée`);
  if (typeof statsDirty !== 'undefined') statsDirty = true;
  const savedShow = loadTvShows().find(s => String(s.tmdbTvId) === String(target.show.id));
  const savedSource = tvRatingSourceOf(savedShow, savedShow?.seasons[seasonKey]);
  const pendingDraft = readJsonStorage(TV_DRAFT_PREFIX + draftKey, null);
  if (pendingDraft?.form && tvStableJson(pendingDraft.form) !== submitted) {
    writeJsonStorage(TV_DRAFT_PREFIX + draftKey, { ...pendingDraft, source: savedSource,
      baseline: { fingerprint: submittedInputs, rating: ratingPayload }, initial: submitted });
  } else clearTvRatingDraft(draftKey);
  if (target.revision !== tvFormRevision) return;
  document.getElementById('tv-season-complete-banner').style.display = 'none';
  tvRatingFormBaseline = { fingerprint: submittedInputs, rating: ratingPayload };
  tvRatingSource = savedSource;
  tvDraftInitial = submitted;
  if (submitted !== tvStableJson(tvDraftForm())) saveTvRatingDraft();
  if (typeof playSaveConfirmation === 'function') playSaveConfirmation();
  refreshShowAverageDisplay();
}

function maybeShowSeasonCompleteBanner(showTmdbId, seasonKey, seasonEntry) {
  if (!getTvSeasonProgress(showTmdbId, seasonKey, seasonEntry).complete) return;
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
  reopenTvSeason(showId, seasonKey);
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
  const movieList = document.getElementById('history-list');
  const tvList = document.getElementById('tv-history-list');
  if (type === 'movie') fadeSwitchDisplay(tvList, movieList); else fadeSwitchDisplay(movieList, tvList);
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
      if (!genreStr) continue;
      await mutateTvShows(current => {
        const entry = current.find(s => String(s.tmdbTvId) === String(show.tmdbTvId));
        if (entry) entry.genre = genreStr;
      });
    } catch { /* silencieux — retentera au prochain passage sur l'onglet */ }
  }
  if (historyMediaFilter === 'tv') renderTvHistory();
}

// Récents = dernière activité confirmée : date choisie pour une note, ou
// date réelle d'une coche encore présente. Jamais une horloge de fusion,
// un import, une pause, une affiche ou une date inventée pour l'ancien suivi.
function tvLatestActivity(show) {
  let latest = { time: -Infinity, date: '' };
  const include = value => {
    if (typeof value !== 'string') return;
    const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsed = new Date(dayOnly ? value + 'T00:00:00' : value);
    if (!Number.isFinite(parsed.getTime())) return;
    const date = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    if (dayOnly ? date !== value : parsed.toISOString() !== value) return;
    if (parsed.getTime() > latest.time) latest = { time: parsed.getTime(), date };
  };
  Object.values(show.seasons || {}).forEach(season => {
    include(season.rating?.date);
    (season.watchedEpisodes || []).forEach(n => {
      const event = season._sync?.episodes?.[n];
      if (event?.watched) include(event.watchedAt);
    });
  });
  return latest;
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
  if (activeLikedFilter) {
    s = s.filter(sh => sh.liked);
  }
  const avg = (sh) => computeShowAverageScore(sh);
  if (sortOrder === 'score-desc') return [...s].sort((a, b) => (avg(b) ?? -1) - (avg(a) ?? -1));
  if (sortOrder === 'score-asc')  return [...s].sort((a, b) => (avg(a) ?? 11) - (avg(b) ?? 11));
  if (sortOrder === 'title')      return [...s].sort((a, b) => a.title.localeCompare(b.title));
  // Tri stable même après fusion : les dates inconnues restent à la fin.
  const activity = new Map(s.map(show => [show, tvLatestActivity(show).time]));
  return [...s].sort((a, b) => activity.get(b) - activity.get(a)
    || String(a.tmdbTvId).localeCompare(String(b.tmdbTvId)));
}

// Ludex 2.0 : vedette "dernière série notée" côté Séries — même
// emplacement (#history-hero) que "dernier film noté" côté Films, mais
// jamais alimenté pour les séries jusqu'ici : en basculant sur l'onglet
// Séries, l'ancien film restait affiché en haut, même invisible logiquement
// (repéré par l'utilisateur). Basé sur la date de la dernière NOTE de
// saison (pas la dernière case cochée) — cohérent avec le choix déjà fait
// côté film. Cette vedette reste distincte du tri par activité de la grille.
function renderTvHistoryHero(shows) {
  const hero = document.getElementById('history-hero');
  if (!hero) return;
  if (!isDefaultComposition() || sortOrder !== 'date') { hero.innerHTML = ''; return; }

  let latest = null; // { show, seasonKey, season }
  shows.forEach(show => {
    Object.entries(show.seasons || {}).forEach(([seasonKey, season]) => {
      if (!season.rating?.date) return;
      if (!latest || season.rating.date > latest.season.rating.date) latest = { show, seasonKey, season };
    });
  });
  if (!latest) { hero.innerHTML = ''; return; }

  const posterUrl = tmdbImage(latest.show.poster_path, 'w185');
  const imgHtml = posterUrl
    ? `<img class="hero-entry-poster" src="${posterUrl}" alt="Affiche de ${escAttr(latest.show.title)}" loading="lazy" decoding="async">`
    : `<div class="hero-entry-poster"></div>`;
  hero.innerHTML = `
    <div class="hero-entry">
      ${imgHtml}
      <div class="hero-entry-body">
        <div class="hero-entry-eyebrow">Dernière série notée</div>
        <div class="hero-entry-title">${escAttr(latest.show.title)} <span style="opacity:.7;font-weight:600;">— ${escAttr(latest.season.seasonName)}</span></div>
        <div class="hero-entry-score">${latest.season.rating.score}<small>/10</small></div>
      </div>
    </div>`;
}

const tvHistoryTotalFetches = new Set();

// L'historique ne possède localement que les saisons que l'on a ouvertes.
// On enrichit donc discrètement chaque série avec son total TMDb pour que la
// barre sur l'affiche exprime la progression de la série entière.
function enrichTvHistoryEpisodeTotals(shows) {
  shows.filter(show => show?.tmdbTvId && !tvHistoryTotalFetches.has(String(show.tmdbTvId)))
    .forEach(show => {
      const id = String(show.tmdbTvId);
      tvHistoryTotalFetches.add(id);
      const before = JSON.stringify(getTvProgress(show));
      loadTvCatalogue(show)
        .then(() => {
          const current = loadTvShows().find(s => String(s.tmdbTvId) === id);
          if (current && JSON.stringify(getTvProgress(current)) !== before) notifyTvViewsChanged([id], 'catalogue');
        })
        .catch(() => {})
        .finally(() => tvHistoryTotalFetches.delete(id));
    });
}

function renderTvHistory() {
  return withTvViewState(document.getElementById('tv-history-list'), renderTvHistoryContent);
}

function renderTvHistoryContent() {
  const allShows = loadTvShows();
  const shows = getSortedTvShows();
  const container = document.getElementById('tv-history-list');
  renderGenreChips(allShows, renderTvHistory);
  document.getElementById('filter-row').style.display = allShows.length === 0 ? 'none' : '';

  renderTvHistoryHero(allShows);

  const badge = document.getElementById('hist-count-badge');
  const filmCount = loadHistory().length;
  const filmFragment = `${filmCount} film${filmCount > 1 ? 's' : ''}`;
  if (historySearchQuery || activeScoreFilter || activeLikedFilter) {
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
  enrichTvHistoryEpisodeTotals(allShows);
  if (shows.length === 0) {
    container.innerHTML = `<div class="empty-state">Aucun résultat pour ce filtre.</div>`;
    return;
  }

  // Même composition Pinterest, une série une seule fois dans son mois
  // d'activité. Notées ou non, toutes passent par le même regroupement.
  const groupByMonth = isDefaultComposition() && sortOrder === 'date';
  const groups = [];
  if (groupByMonth) {
    const byKey = new Map();
    const undatedItems = [];
    shows.forEach(show => {
      const d = tvLatestActivity(show).date;
      if (!d) {
        // Seules les dates réellement inconnues restent à la fin.
        undatedItems.push(show);
        return;
      }
      const key = monthKeyOf({ date: d });
      if (!byKey.has(key)) { const g = { key, items: [] }; byKey.set(key, g); groups.push(g); }
      byKey.get(key).items.push(show);
    });
    if (undatedItems.length) groups.push({ key: null, items: undatedItems });
  } else {
    groups.push({ key: null, items: shows });
  }

  const isFeaturedFn = sh => {
    const avg = computeShowAverageScore(sh);
    return !!sh.liked || (avg != null && avg >= 8.5);
  };

  container.innerHTML = '';
  groups.forEach(group => {
    if (groupByMonth && group.key) {
      const sep = document.createElement('div');
      sep.className = 'hist-month-sep';
      const rated = group.items.map(sh => computeShowAverageScore(sh)).filter(v => v != null);
      const avg = rated.length > 0 ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : null;
      const label = escAttr(monthLabelOf(group.key));
      sep.innerHTML = `<span class="hist-month-label">${label}</span><span class="hist-month-recap">${group.items.length} s\u00e9rie${group.items.length > 1 ? 's' : ''}${avg !== null ? ` \u00b7 moy. ${avg}` : ''}</span>`;
      container.appendChild(sep);
    }
    const gridEl = document.createElement('div');
    gridEl.className = 'hist-grid';
    container.appendChild(gridEl);

    const tiers = computeFeaturedTiers(group.items, isFeaturedFn);
    gridEl.innerHTML = group.items.map((sh, i) => renderTvShowCard(sh, tiers[i])).join('');
  });

  container.querySelectorAll('.hist-grid-card[data-show-id]').forEach((cardEl) => {
    const show = shows.find(s => String(s.tmdbTvId) === cardEl.dataset.showId);
    applyPosterAccent(tmdbImage(show?.poster_path, 'w154'), cardEl);
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
        async () => {
          await mutateTvShows(shows => shows.filter(s => String(s.tmdbTvId) !== String(id)));
          showToast(`"${show.title}" retirée`);
          if (typeof statsDirty !== 'undefined') statsDirty = true;
        },
        true
      );
    });
  });
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
    async () => {
      await mutateTvShows(shows => {
        const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
        if (!showEntry) return shows;
        delete showEntry.seasons[seasonKey];
        if (Object.keys(showEntry.seasons).length === 0) {
          return shows.filter(s => String(s.tmdbTvId) !== String(showId));
        }
        return shows;
      });
      // Une suppression explicite de la dernière saison ferme la fiche comme
      // auparavant. Sinon, le rafraîchissement conserve la pastille ouverte.
      if (!loadTvShows().some(s => String(s.tmdbTvId) === String(showId)) && String(tdsCurrentData?.id) === String(showId)) {
        closeTvDetailSheet(); // la série entière vient de disparaître avec sa dernière saison
      }
      showToast(`"${seasonName}" retirée`);
      if (typeof statsDirty !== 'undefined') statsDirty = true;
    },
    true
  );
}

// Ludex 2.0 : la carte devient une cellule de grille (poster + badges) —
// la liste extensible par saison (Voir les X saisons, avec rouvrir/
// supprimer) a migré dans la fiche détail (voir buildSeasonProgressionSection,
// 19-tv-detail.js), qui affichait déjà la progression par saison mais sans
// ces deux actions avant ce changement. Un tap ouvre directement la fiche —
// plus de repli "tout gérer depuis la grille".
function renderTvShowCard(show, tier) {
  const avg = computeShowAverageScore(show);
  const progress = getTvProgress(show);
  const { total: totalEpisodes, watched: watchedEpisodes, percent: progressPct } = progress;
  const scoreColor = avg == null ? 'var(--text-mid)' : avg >= 7.5 ? 'var(--green)' : avg >= 5.0 ? 'var(--gold)' : 'var(--red)';
  const isFeatured = tier !== 'normal';
  // Bleu électrique tant que le total de la série n'est pas atteint ; or
  // une fois tous les épisodes de son catalogue vus.
  const isInProgress = progress.state === 'in_progress';
  // Ludex 2.0 : contrairement aux films, le chemin brut est stocké (pas une
  // URL déjà dimensionnée) — demander une taille plus grande pour les
  // paliers vedette ne demande donc qu'un paramètre différent ici, pas de
  // substitution de chaîne comme côté films. Même correspondance palier→
  // taille que renderHistory() (06a-history-list.js), gardée cohérente.
  // Ludex 2.0 : palier "normal" passé à w342 (au lieu de w154, le repli
  // implicite avant) — même raisonnement que côté films.
  const POSTER_SIZE_BY_TIER = { normal: 'w342', pair: 'w342', isolated: 'w342', banner: 'w500' };
  const posterUrl = tmdbImage(show.poster_path, POSTER_SIZE_BY_TIER[tier] || 'w342');

  const imgHtml = posterUrl
    ? `<img class="hist-grid-poster" src="${posterUrl}" alt="Affiche de ${escAttr(show.title)}" loading="lazy" decoding="async">`
    : `<div class="hist-grid-poster-ph">${ICONS.tv || ICONS.clapper}</div>`;

  return `
    <div class="hist-item hist-grid-card${isFeatured ? ` hist-grid-card-${tier}` : ''}" data-show-id="${show.tmdbTvId}">
      <button type="button" class="tv-show-card-open-btn hist-item-open" data-show-id="${show.tmdbTvId}" aria-label="Voir la fiche de ${escAttr(show.title)}">
        ${imgHtml}
      </button>
      <div class="hist-grid-badge" style="color:${scoreColor}">${avg != null ? avg.toFixed(1) : '—'}</div>
      ${isFeatured ? `<div class="hist-grid-featured-badge">${show.liked ? `${ICONS.heart} Coup de cœur` : `★ ${avg.toFixed(1)}`}</div>` : ''}
      ${totalEpisodes > 0 ? `
        <div class="hist-grid-progress" data-progress-state="${progress.state}" title="${watchedEpisodes}/${totalEpisodes} épisodes vus · ${tvProgressLabel(progress)}" aria-hidden="true">
          <div class="hist-grid-progress-fill${isInProgress ? ' is-following' : ''}" style="width:${progressPct}%;${progress.state === 'unknown' ? 'background:var(--text-mid)' : ''}"></div>
        </div>
      ` : ''}
      <div class="hist-actions">
        <button type="button" class="hist-action-btn del tv-show-delete-btn" data-show-id="${show.tmdbTvId}" title="Retirer" aria-label="Retirer ${escAttr(show.title)}">${ICONS.trash}</button>
      </div>
    </div>
  `;
}

function reopenTvSeason(showId, seasonKey) {
  const show = loadTvShows().find(s => String(s.tmdbTvId) === String(showId));
  if (!show?.seasons[seasonKey]) return;
  saveDraft();
  closeTvDetailSheet();
  tvRatingFormBaseline = null;
  switchMobileNav('rating');
  setMediaType('tv', { restore: false });
  selectedShow = { id: show.tmdbTvId, name: show.title, poster_path: show.poster_path };
  refreshTvHeartBtnState();
  document.getElementById('tv-search').value = show.title;
  document.getElementById('tv-season-picker').style.display = 'none';
  const seasonData = show.seasons[seasonKey];
  // Ludex 2.0 : pré-remplit la date au format attendu par <input type="date">
  // (YYYY-MM-DD) si cette saison a déjà été notée — même principe que
  // loadItem() côté film (05-rating-form.js). Repart sur aujourd'hui sinon.
  const dateInput = document.getElementById('tv-view-date');
  if (dateInput) {
    dateInput.value = seasonData.rating?.date ? seasonData.rating.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  }
  selectSeason({ number: seasonKey, name: seasonData.seasonName, episodeCount: seasonData.totalEpisodes, poster: show.poster_path }, { capture: false });
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
  const dashboard = document.querySelector('.dashboard-grid');
  const applyChange = () => {
    document.getElementById('kpi-total-label').textContent = type === 'movie' ? 'Films notés' : 'Séries suivies';
    if (type === 'tv') renderTvStats(); else renderStats();
  };
  if (!dashboard) { applyChange(); return; }
  dashboard.style.transition = 'opacity var(--dur-fast) var(--ease-out)';
  dashboard.style.opacity = '0';
  setTimeout(() => {
    applyChange();
    requestAnimationFrame(() => {
      dashboard.style.opacity = '1';
      setTimeout(() => { dashboard.style.removeProperty('opacity'); dashboard.style.removeProperty('transition'); }, 150);
    });
  }, 140);
}

function renderTvStats() {
  const shows = loadTvShows();
  const history = loadHistory();
  renderMonthlyActivityChart(history, shows);
  renderProfileExtras(history);
  stopCountUp(document.getElementById('kpi-avg'));
  // renderProfileExtras actualise aussi le temps contextualisé et le cumul.
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
  // Ludex 2.0 : #kpi-year a disparu (voir le même correctif côté films dans
  // 06c-profile-stats.js) — sous-texte du Hero Header à la place.
  const heroYearSubEl = document.getElementById('profile-hero-year-sub');
  if (heroYearSubEl) heroYearSubEl.textContent = `+${yearShowsCount} en ${currentYear}`;

  const allRatings = getAllTvSeasonRatings();
  if (typeof renderRecentRatings === 'function') renderRecentRatings('tv');

  if (allRatings.length === 0) {
    document.getElementById('radar-chart-container').innerHTML = '';
    document.getElementById('radar-chart-container').style.minHeight = '0';
    document.getElementById('radar-empty').style.display = 'block';
  } else {
    const avgsByCriterion = computeCriteriaAverages(allRatings, CRITERIA);
    const avgs = CRITERIA.map(c => avgsByCriterion[c] || 0);
    const radarSvg = createRadarSVG(avgs, 'tv');
    if (radarSvg) {
      document.getElementById('radar-chart-container').innerHTML = radarSvg;
      document.getElementById('radar-chart-container').style.minHeight = '160px';
      document.getElementById('radar-empty').style.display = 'none';
    } else {
      document.getElementById('radar-chart-container').innerHTML = '';
      document.getElementById('radar-chart-container').style.minHeight = '0';
      document.getElementById('radar-empty').style.display = 'block';
    }
  }

  // Ludex 2.0 : timeline retirée (voir index.html) — la heatmap couvre déjà
  // ce rôle, films et séries confondus. "Distribution des notes" retirée
  // aussi (voir renderStats(), 06c-profile-stats.js) — remplacée par
  // renderMonthlyActivityChart(), qui n'est PAS repeinte par ce bascule
  // Films/Séries : elle montre déjà les deux côte à côte en permanence.
}

// ═══════════════════════════════════════════
//  SÉRIES — Widget "En cours" (onglet Noter, mode Série uniquement)
// ═══════════════════════════════════════════
// Une carte par suivi non suspendu/masqué ayant une suite disponible,
// future ou incertaine. Toutes les saisons régulières du catalogue sont
// consultées, sans créer de saison personnelle au simple affichage.
// Une panne réseau ne fait jamais passer une série pour terminée.

// Le compteur dérive des projections métier, jamais du nombre de nœuds DOM.
let tvContinueRenderVersion = 0;
let tvContinueProjections = new Map();
function updateTvContinueCount() {
  const count = [...tvContinueProjections.values()].filter(p => p.inContinue).length;
  document.getElementById('tv-continue-count').textContent = `(${count})`;
  document.getElementById('tv-continue-section').style.display = count ? 'block' : 'none';
}

async function renderTvContinueList() {
  const version = ++tvContinueRenderVersion;
  const container = document.getElementById('tv-continue-list');
  const shows = loadTvShows();
  tvContinueProjections = new Map(shows.map(show => [String(show.tmdbTvId), getTvProgress(show)]));
  const candidates = shows.filter(show => getTvProgress(show).inContinue);
  withTvViewState(container, () => {
    const ids = new Set(candidates.map(show => String(show.tmdbTvId)));
    [...container.children].forEach(card => { if (!ids.has(card.dataset.continueId)) card.remove(); });
    candidates.forEach((show, index) => {
      const id = String(show.tmdbTvId);
      let card = [...container.children].find(el => el.dataset.continueId === id);
      if (!card) {
        card = document.createElement('div');
        card.dataset.continueId = id;
      }
      if (container.children[index] !== card) container.insertBefore(card, container.children[index] || null);
      updateTvContinueCard(card, tvEpisodeProjection(show));
    });
  });
  updateTvContinueCount();
  // Les résolutions ne font aucune écriture personnelle et peuvent se chevaucher.
  await Promise.all(candidates.map(async show => {
    const resolved = await resolveNextTvEpisode({ show });
    if (version !== tvContinueRenderVersion) return;
    const id = String(show.tmdbTvId);
    const placeholder = container.querySelector(`[data-continue-id="${id}"]`);
    if (!placeholder) return;
    tvContinueProjections.set(id, resolved?.progress || { inContinue: false });
    withTvViewState(container, () => {
      if (!resolved?.progress.inContinue) placeholder.remove();
      else updateTvContinueCard(placeholder, resolved);
    });
    updateTvContinueCount();
  }));
}

async function resolveNextTvEpisode({ show }) {
  const { stale } = await loadTvCatalogue(show);
  // Le réseau a pu durer : relecture du suivi, notamment après pause/suppression.
  const current = loadTvShows().find(s => String(s.tmdbTvId) === String(show.tmdbTvId));
  if (!current) return null;
  return tvEpisodeProjection(current, stale);
}

function tvEpisodeProjection(current, stale = false) {
  const progress = getTvProgress(current);
  if (stale && !progress.next) {
    progress.state = 'unknown';
    progress.inContinue = !isTvPaused(current) && !current.continueHidden;
  }
  const next = progress.next;
  return { show: current, progress, stale, seasonKey: next?.seasonKey,
    seasonEntry: next ? { seasonName: next.seasonName, totalEpisodes: next.totalEpisodes, watchedEpisodes: current.seasons[next.seasonKey]?.watchedEpisodes || [] } : null,
    episode: next?.episode };
}

function updateTvContinueCard(card, resolved) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderTvContinueCard(resolved);
  const fresh = wrapper.firstElementChild;
  const nextKey = `${resolved.seasonKey}:${resolved.episode?.episode_number}`;
  const sameEpisode = card.dataset.nextEpisode === nextKey;
  const synopsisOpen = sameEpisode && !!card.querySelector('details')?.open;
  withTvViewState(card, () => {
    setTvViewHtml(card, fresh.innerHTML);
    card.className = fresh.className;
    card.dataset.nextEpisode = nextKey;
    const synopsis = card.querySelector('details');
    if (synopsis) synopsis.open = synopsisOpen;
  });
}

// Texte engageant selon la proximité de diffusion — "Demain", "J-3", ou la
// date complète au-delà d'une semaine (pas la peine d'un compte à rebours
// pour un épisode encore loin).
function formatAirCountdown(airDateStr) {
  const airDate = new Date(airDateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((airDate - today) / 86400000);
  if (diffDays <= 0) return 'Diffusion imminente';
  if (diffDays === 1) return 'Demain';
  if (diffDays <= 13) return `J-${diffDays}`;
  return `Diffusion le ${airDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

function renderTvContinueCard({ show, seasonKey, seasonEntry, episode }) {
  const posterUrl = tmdbImage(show.poster_path, 'w154');
  if (!episode) return `<div class="tv-continue-card"><div class="tv-continue-info"><div class="tv-continue-show-title">${escAttr(show.title)}</div><div class="tv-continue-meta">Progression à vérifier — catalogue indisponible</div><button type="button" class="error-retry-btn" data-retry-continue="${show.tmdbTvId}">Ouvrir la fiche</button></div></div>`;

  // Ludex 2.0 : protection anti-spoilers — un épisode déjà présent dans la
  // liste de la saison (donc "next unwatched" au sens strict) mais dont la
  // date de diffusion n'est pas encore passée reste verrouillé : ni titre,
  // ni synopsis, ni action de notation. episode.air_date vient de la même
  // réponse saison déjà chargée (pas d'appel réseau supplémentaire) —
  // équivalent en pratique à next_episode_to_air pour cet usage précis :
  // le prochain épisode non vu ET pas encore diffusé est justement celui
  // que next_episode_to_air désignerait.
  const isLocked = tvEpisodeAvailability(episode) !== 'available';

  if (isLocked) {
    const countdown = tvEpisodeAvailability(episode) === 'future' ? formatAirCountdown(episode.air_date) : 'Date de diffusion inconnue';
    return `
      <div class="tv-continue-card tv-continue-locked">
        ${posterUrl ? `<img class="tv-continue-poster" src="${posterUrl}" alt="" loading="lazy">` : `<div class="tv-continue-poster tv-continue-poster-ph">${ICONS.clapper}</div>`}
        <div class="tv-continue-info">
          <div class="tv-continue-show-title">${escAttr(show.title)}</div>
          <div class="tv-continue-ep-title"><span class="tv-continue-ep-masked">Épisode à venir</span></div>
          <div class="tv-continue-meta">${escAttr(countdown)}</div>
        </div>
        <div class="tv-continue-lock-badge" aria-label="Épisode pas encore diffusé, notation indisponible" title="Pas encore diffusé">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        </div>
      </div>
    `;
  }

  const meta = [
    episode.air_date ? new Date(episode.air_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    episode.runtime ? `${episode.runtime} min` : '',
  ].filter(Boolean).join(' · ');
  return `
    <div class="tv-continue-card">
      <div class="tv-continue-card-actions">
        <button type="button" class="tv-continue-pause-btn" data-show-id="${show.tmdbTvId}" data-season-key="${seasonKey}" aria-label="Mettre en pause" title="Mettre en pause — reprends-la depuis sa fiche">${ICONS.pause}</button>
        <button type="button" class="tv-continue-remove-btn" data-show-id="${show.tmdbTvId}" data-season-key="${seasonKey}" aria-label="Retirer ${escAttr(show.title)} de cette liste" title="Retirer de la liste">${ICONS.close || '✕'}</button>
      </div>
      ${posterUrl ? `<img class="tv-continue-poster" src="${posterUrl}" alt="" loading="lazy">` : `<div class="tv-continue-poster tv-continue-poster-ph">${ICONS.clapper}</div>`}
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
      </div>
      <button type="button" class="tv-continue-check-btn" data-show-id="${show.tmdbTvId}" data-season-key="${seasonKey}" data-episode="${episode.episode_number}" aria-label="Valider l'épisode ${episode.episode_number} de ${escAttr(show.title)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>
      </button>
    </div>
  `;
}

document.getElementById('tv-continue-list').addEventListener('click', tvAction(async (e) => {
  const retry = e.target.closest('[data-retry-continue]');
  if (retry) { openTvDetailSheet(retry.dataset.retryContinue); return; }
  const removeBtn = e.target.closest('.tv-continue-remove-btn');
  const pauseBtn = e.target.closest('.tv-continue-pause-btn');
  if (removeBtn || pauseBtn) {
    const button = removeBtn || pauseBtn;
    await setTvFollowingState(button.dataset.showId, removeBtn ? { hidden: true } : { paused: true });
    showToast(removeBtn ? 'Retirée du widget — réaffiche-la depuis sa fiche' : 'Mise en pause — reprends-la depuis sa fiche');
    return;
  }
  const btn = e.target.closest('.tv-continue-check-btn');
  if (!btn) return;
  btn.disabled = true;
  try {
    const { showId, seasonKey, episode } = btn.dataset;
    const show = await setTvEpisodesWatched(showId, seasonKey, [Number(episode)], true);
    if (typeof statsDirty !== 'undefined') statsDirty = true;
    maybeShowSeasonCompleteBanner(showId, seasonKey, show.seasons[seasonKey]);
  } finally { btn.disabled = false; }
}));

// Repli/dépliage de tout le widget — pour ne pas surcharger l'écran quand
// plusieurs séries sont en cours. Préférence mémorisée pour rester repliée
// d'une visite à l'autre si l'utilisateur le souhaite.
document.getElementById('tv-continue-toggle').addEventListener('click', () => {
  const list = document.getElementById('tv-continue-list');
  const toggle = document.getElementById('tv-continue-toggle');
  const collapsed = list.style.display === 'none';
  list.style.display = collapsed ? '' : 'none';
  toggle.setAttribute('aria-expanded', String(collapsed));
  toggle.classList.toggle('collapsed', !collapsed);
  localStorage.setItem('lbx_tv_continue_collapsed', collapsed ? '0' : '1');
});
if (localStorage.getItem('lbx_tv_continue_collapsed') === '1') {
  document.getElementById('tv-continue-list').style.display = 'none';
  document.getElementById('tv-continue-toggle').setAttribute('aria-expanded', 'false');
  document.getElementById('tv-continue-toggle').classList.add('collapsed');
}

// Gestionnaires externalisés : les boutons restent natifs et la CSP peut
// refuser le JavaScript inline sans désactiver les bascules Films/Séries.
document.getElementById('tab-media-movie')?.addEventListener('click', () => setMediaType('movie'));
document.getElementById('tab-media-tv')?.addEventListener('click', () => setMediaType('tv'));
document.getElementById('hist-tab-movie')?.addEventListener('click', () => switchHistoryMediaFilter('movie'));
document.getElementById('hist-tab-tv')?.addEventListener('click', () => switchHistoryMediaFilter('tv'));
document.getElementById('stats-tab-movie')?.addEventListener('click', () => switchStatsMediaFilter('movie'));
document.getElementById('stats-tab-tv')?.addEventListener('click', () => switchStatsMediaFilter('tv'));
