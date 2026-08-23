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

// Ludex 2.0 : cœur "coup de cœur" du formulaire Noter séries — même
// principe visuel que #heart-btn côté film, mais écrit directement sur
// show.liked dès le clic (pas au moment de sauvegarder une note) : la
// série entière est la donnée concernée, indépendante de la saison en
// cours de notation, donc pas de sens à la faire attendre un
// enregistrement de saison pour prendre effet. Migré depuis la fiche
// détail (#tds-heart-btn, 19-tv-detail.js) — même comportement, juste
// déplacé pour être au même endroit que côté film.
document.getElementById('tv-heart-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('tv-heart-btn');
  if (!selectedShow) { showToast('Choisis une série avant de la marquer comme coup de cœur.'); return; }
  const liked = await mutateTvShows(shows => {
    const show = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
    if (!show) return undefined; // signale "série pas encore suivie" à l'appelant, sans rien modifier
    show.liked = !show.liked;
    return show.liked;
  });
  if (liked === undefined) { showToast('Commence à suivre cette série avant de la marquer comme coup de cœur.'); return; }
  btn.classList.toggle('active', liked);
  btn.setAttribute('aria-pressed', String(liked));
  hapticPulse(btn, 'medium');
  if (typeof statsDirty !== 'undefined') statsDirty = true;
});

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

function setMediaType(type) {
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

async function selectShow(show) {
  selectedShow = show;
  refreshTvHeartBtnState();
  tvSuggestEl.style.display = 'none';
  tvSearchEl.value = show.name;
  document.getElementById('tv-season-strip').style.display = 'none';
  document.getElementById('tv-season-picker').style.display = 'none';
  openTvDetailSheet(show.id);
}

function selectSeason(season) {
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

async function startTrackingSeason() {
  await mutateTvShows(shows => {
    const showEntry = getOrCreateTvShow(shows);
    const seasonKey = String(selectedSeasonNumber);
    if (!showEntry.seasons[seasonKey]) {
      showEntry.seasons[seasonKey] = { seasonName: selectedSeasonName, watchedEpisodes: [], totalEpisodes: selectedSeasonEpisodeCount };
    }
  });
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

// ═══════════════════════════════════════════
//  FILE D'ÉCRITURE SÉQUENTIELLE (Ludex 2.0)
// ═══════════════════════════════════════════
// Cause racine des données perdues en notant les séries (signalé par
// l'utilisateur, plusieurs fois, sous des formes différentes) : 17 endroits
// différents faisaient chacun leur propre charger→modifier→sauvegarder sur
// lbx_tv_shows, sans AUCUNE coordination entre eux. Deux opérations qui se
// chevauchent (widget "En cours" qui résout une saison suivante pendant
// qu'on coche un épisode depuis la fiche détail, par exemple) peuvent
// silencieusement s'écraser l'une l'autre : la seconde sauvegarde avec une
// copie chargée AVANT que la première n'ait fini d'écrire, effaçant son
// changement sans jamais lever d'erreur. Un correctif ponctuel (widget
// résolu séquentiellement en interne) n'a réglé qu'UN des 17 points —
// toujours cassé dès qu'un AUTRE point entrait en jeu en même temps.
//
// mutateTvShows() est désormais le SEUL chemin autorisé pour modifier ce
// stockage : chaque appel s'enfile après le précédent dans une chaîne de
// promesses, jamais deux mutations en vol simultanément, peu importe
// combien de choses se déclenchent au même instant. Le mutateur reçoit le
// tableau FRAIS (rechargé juste avant lui, jamais une copie périmée),
// peut être async (nécessaire pour needsNextSeasonCheck, qui doit
// interroger TMDb avant de savoir quoi écrire), et peut renvoyer une
// valeur récupérée par l'appelant.
let _tvShowsWriteQueue = Promise.resolve();
function mutateTvShows(mutator) {
  const resultPromise = _tvShowsWriteQueue.then(async () => {
    let shows = loadTvShows();
    const result = await mutator(shows);
    // Un mutateur peut modifier `shows` sur place (cas le plus courant :
    // trouver une entrée, changer un champ) OU renvoyer un tableau de
    // remplacement complet (ex: filter() pour une suppression) — les deux
    // sont acceptés plutôt que d'imposer un seul style à tous les appelants.
    if (Array.isArray(result)) shows = result;
    saveTvShows(shows);
    return result;
  });
  // Une mutation qui échoue ne doit jamais bloquer la file pour toujours —
  // l'erreur reste quand même visible pour CET appelant précis (resultPromise
  // n'est pas affectée par ce .catch, posé sur la branche interne de la file).
  _tvShowsWriteQueue = resultPromise.catch(() => {});
  return resultPromise;
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

async function saveTvSeasonRating() {
  if (!selectedShow || selectedSeasonNumber == null) {
    showToast('Sélectionne une série et une saison avant de noter.');
    return;
  }
  const score = calculateScore();
  const seasonKey = String(selectedSeasonNumber);
  const ratingPayload = {
    mode: currentMode,
    values: currentMode === 'detail'
      ? CRITERIA.reduce((acc, c) => { acc[c] = document.getElementById(c).value; return acc; }, {})
      : { quick: quickRating },
    score: score.toFixed(1),
    stars: document.getElementById('stars-display').textContent,
    review: document.getElementById('review-text').value.trim(),
    // Ludex 2.0 : date choisie par l'utilisateur (voir #tv-view-date,
    // index.html) plutôt que l'instant de sauvegarde imposé — même format
    // "YYYY-MM-DD" que le film (#view-date), pas un horodatage complet.
    date: document.getElementById('tv-view-date')?.value || new Date().toISOString().slice(0, 10),
  };
  await mutateTvShows(shows => {
    const showEntry = getOrCreateTvShow(shows);
    // La saison existe déjà forcément (créée dès qu'on "Commence" à la suivre,
    // voir startTrackingSeason) — on y ajoute juste la note, sans repasser par
    // getOrCreateTvSeason pour ne pas risquer d'écraser totalEpisodes avec
    // une valeur périmée.
    if (!showEntry.seasons[seasonKey]) {
      showEntry.seasons[seasonKey] = { seasonName: selectedSeasonName, watchedEpisodes: [], totalEpisodes: selectedSeasonEpisodeCount };
    }
    showEntry.seasons[seasonKey].rating = ratingPayload;
  });
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
    refreshTvHeartBtnState();
    document.getElementById('tv-search').value = show.title;
    document.getElementById('tv-season-picker').style.display = 'none';
    const seasonData = show.seasons[seasonKey];
    selectedSeasonNumber = Number(seasonKey);
    selectedSeasonName = seasonData.seasonName;
    document.getElementById('tv-season-strip').style.display = 'flex';
    document.getElementById('tv-strip-poster').src = tmdbImage(show.poster_path, 'w200');
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

// Ludex 2.0 : date la plus récente parmi les saisons NOTÉES d'une série —
// partagée entre le tri "Récents" et le regroupement mensuel de
// renderTvHistory() (même esprit que monthKeyOf() côté films,
// 06a-history-list.js), pour ne calculer cette logique qu'à un seul endroit.
function mostRecentRatingDate(show) {
  return Object.values(show.seasons || {}).reduce((max, se) => {
    const d = se.rating?.date || '';
    return d > max ? d : max;
  }, '');
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
  // "Récents" : dernière saison mise à jour (notée ou suivie), la plus
  // récente d'abord — même esprit que le tri "Récents" des films.
  return [...s].sort((a, b) => mostRecentRatingDate(b).localeCompare(mostRecentRatingDate(a)));
}

// Ludex 2.0 : vedette "dernière série notée" côté Séries — même
// emplacement (#history-hero) que "dernier film noté" côté Films, mais
// jamais alimenté pour les séries jusqu'ici : en basculant sur l'onglet
// Séries, l'ancien film restait affiché en haut, même invisible logiquement
// (repéré par l'utilisateur). Basé sur la date de la dernière NOTE de
// saison (pas la dernière case cochée) — cohérent avec le choix déjà fait
// côté film, et évite d'ajouter un nouvel horodatage par épisode.
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

function renderTvHistory() {
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
  if (shows.length === 0) {
    container.innerHTML = `<div class="empty-state">Aucun résultat pour ce filtre.</div>`;
    return;
  }

  // Ludex 2.0 : m\u00eame affichage que les films \u2014 s\u00e9paration par mois, note
  // moyenne et nombre de s\u00e9ries par mois (voir renderHistory(),
  // 06a-history-list.js). Une s\u00e9rie peut avoir des saisons not\u00e9es \u00e0 des
  // dates diff\u00e9rentes ; class\u00e9e selon la date de sa saison la PLUS
  // R\u00c9CEMMENT not\u00e9e (mostRecentRatingDate(), juste au-dessus \u2014 la m\u00eame
  // logique d\u00e9j\u00e0 utilis\u00e9e par le tri "R\u00e9cents"), jamais dupliqu\u00e9e entre
  // plusieurs mois. Les s\u00e9ries sans AUCUNE saison not\u00e9e (juste suivies) vont
  // dans un groupe \u00e0 part, en tout dernier \u2014 aucune date n'existe pour les
  // classer ailleurs.
  const groupByMonth = isDefaultComposition() && sortOrder === 'date';
  const groups = [];
  if (groupByMonth) {
    const byKey = new Map();
    let unratedGroup = null;
    shows.forEach(show => {
      const d = mostRecentRatingDate(show);
      if (!d) {
        if (!unratedGroup) { unratedGroup = { key: null, items: [] }; }
        unratedGroup.items.push(show);
        return;
      }
      const key = monthKeyOf({ date: d });
      if (!byKey.has(key)) { const g = { key, items: [] }; byKey.set(key, g); groups.push(g); }
      byKey.get(key).items.push(show);
    });
    if (unratedGroup) groups.push(unratedGroup);
  } else {
    groups.push({ key: null, items: shows });
  }

  const isFeaturedFn = sh => {
    const avg = computeShowAverageScore(sh);
    return !!sh.liked || (avg != null && avg >= 8.5);
  };

  container.innerHTML = '';
  groups.forEach(group => {
    if (groupByMonth) {
      const sep = document.createElement('div');
      sep.className = 'hist-month-sep';
      const rated = group.items.map(sh => computeShowAverageScore(sh)).filter(v => v != null);
      const avg = rated.length > 0 ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : null;
      const label = group.key ? escAttr(monthLabelOf(group.key)) : 'S\u00e9ries pas encore not\u00e9es';
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
          if (typeof recordTombstone === 'function') recordTombstone('lbx_tv_show_tombstones', String(id));
          renderTvHistory();
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
      const remaining = await mutateTvShows(shows => {
        const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
        if (!showEntry) return shows;
        delete showEntry.seasons[seasonKey];
        if (typeof recordTombstone === 'function') recordTombstone('lbx_tv_season_tombstones', `${showId}:${seasonKey}`);
        if (Object.keys(showEntry.seasons).length === 0) {
          if (typeof recordTombstone === 'function') recordTombstone('lbx_tv_show_tombstones', String(showId));
          return shows.filter(s => String(s.tmdbTvId) !== String(showId));
        }
        return shows;
      });
      renderTvHistory();
      // Ludex 2.0 : ce bouton est désormais accessible DEPUIS la fiche
      // détail (voir 19-tv-detail.js) — la rouvrir sur elle-même après
      // suppression pour que sa liste de saisons reflète le changement,
      // pas seulement la grille en arrière-plan. tdsCurrentData n'existe
      // que si ce fichier est chargé (toujours vrai ici) et qu'une fiche
      // série est actuellement ouverte.
      if (typeof tdsCurrentData !== 'undefined' && tdsCurrentData?.id && remaining.find(s => String(s.tmdbTvId) === String(showId))) {
        openTvDetailSheet(showId);
      } else if (typeof closeTvDetailSheet === 'function' && typeof tdsCurrentData !== 'undefined' && tdsCurrentData?.id === Number(showId)) {
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
  const seasons = Object.entries(show.seasons || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
  const seasonsWithProgress = seasons.filter(([, s]) => s.totalEpisodes > 0);
  const totalEpisodes = seasonsWithProgress.reduce((sum, [, s]) => sum + s.totalEpisodes, 0);
  const watchedEpisodes = seasonsWithProgress.reduce((sum, [, s]) => sum + s.watchedEpisodes.length, 0);
  const progressPct = totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0;
  const scoreColor = avg == null ? 'var(--text-mid)' : avg >= 7.5 ? 'var(--green)' : avg >= 5.0 ? 'var(--gold)' : 'var(--red)';
  const isFeatured = tier !== 'normal';
  // Ludex 2.0 : contrairement aux films, le chemin brut est stocké (pas une
  // URL déjà dimensionnée) — demander une taille plus grande pour les
  // paliers vedette ne demande donc qu'un paramètre différent ici, pas de
  // substitution de chaîne comme côté films. Même correspondance palier→
  // taille que renderHistory() (06a-history-list.js), gardée cohérente.
  const POSTER_SIZE_BY_TIER = { pair: 'w342', isolated: 'w342', banner: 'w500' };
  const posterUrl = tmdbImage(show.poster_path, POSTER_SIZE_BY_TIER[tier] || 'w154');

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
        <div class="hist-grid-progress" title="${watchedEpisodes}/${totalEpisodes} épisodes vus" aria-hidden="true">
          <div class="hist-grid-progress-fill" style="width:${progressPct}%"></div>
        </div>
      ` : ''}
      <div class="hist-actions">
        <button type="button" class="hist-action-btn del tv-show-delete-btn" data-show-id="${show.tmdbTvId}" title="Retirer" aria-label="Retirer ${escAttr(show.title)}">${ICONS.trash}</button>
      </div>
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

// Glissement sur la carte de série elle-même — supprime toute la série
// (pas juste une saison). Uniquement vers la gauche : contrairement à une
// saison, une série entière n'a pas d'action "Modifier" unique vers
// laquelle glisser à droite, donc pas de second sens ici. Contrôleur
// séparé plutôt que de généraliser initTvSeasonSwipeGestures : n'agit que
// sur l'en-tête de la carte (pas sur la liste de saisons dépliée juste en
// dessous), pour ne jamais entrer en conflit avec le glissement des
// lignes de saison qui vit dans une zone distincte du DOM.
function initTvShowCardSwipeGestures(container) {
  const MOVE_CANCEL_PX = 12;
  const SWIPE_THRESHOLD = 80;
  const MAX_DRAG = 130;

  let startX = 0, startY = 0;
  let pressedItem = null, pressedContent = null;
  let swipeMode = null;
  let dx = 0;
  let armedItem = null;

  function cancelArmed() {
    if (!armedItem) return;
    const content = armedItem.querySelector('.tv-show-card-header');
    if (content) { content.style.transition = 'transform var(--dur-base) var(--ease-out)'; content.style.transform = ''; }
    armedItem.classList.remove('hist-swipe-armed-left', 'hist-swipe-left');
    armedItem = null;
  }

  function confirmArmed() {
    if (!armedItem) return;
    const showId = armedItem.dataset.showId;
    armedItem = null;
    const btn = container.querySelector(`.tv-show-delete-btn[data-show-id="${showId}"]`);
    if (btn) btn.click(); // réutilise exactement la même confirmation/suppression que le bouton visible
  }

  function resetGesture() {
    if (pressedItem) pressedItem.classList.remove('hist-dragging');
    pressedItem = null;
    pressedContent = null;
    swipeMode = null;
    dx = 0;
  }

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.tv-show-card-header-wrap');
    if (!item || e.target.closest('.tv-show-card-open-btn') || e.target.closest('.tv-show-delete-btn')) { resetGesture(); return; }
    e.stopPropagation();
    pressedItem = item;
    pressedContent = item.querySelector('.tv-show-card-header');
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
    // Seulement vers la gauche : un glissement vers la droite ne fait rien
    // (pas de deuxième action), donc plafonné à 0 plutôt que de suivre le doigt.
    dx = Math.max(-MAX_DRAG, Math.min(0, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!pressedItem) return;
    if (swipeMode === 'swipe') {
      if (dx <= -SWIPE_THRESHOLD) {
        cancelArmed();
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = 'translateX(-120px)';
        pressedItem.classList.add('hist-swipe-armed-left');
        armedItem = pressedItem;
        hapticPulse(pressedItem, 'medium');
      } else {
        pressedContent.style.transform = '';
        pressedItem.classList.remove('hist-swipe-left');
      }
    }
    resetGesture();
  });
  container.addEventListener('touchcancel', () => {
    if (pressedItem && pressedContent) {
      pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
      pressedContent.style.transform = '';
      pressedItem.classList.remove('hist-swipe-left');
    }
    resetGesture();
  });

  container.addEventListener('click', (e) => {
    if (!armedItem) return;
    const hint = e.target.closest('.hist-swipe-hint');
    const clickedItem = e.target.closest('.tv-show-card-header-wrap');
    if (hint && clickedItem === armedItem) { confirmArmed(); return; }
    const wasArmedItself = clickedItem === armedItem;
    cancelArmed();
    if (wasArmedItself) return;
  }, true);

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
  const dashboard = document.querySelector('.dashboard-grid');
  const applyChange = () => {
    document.getElementById('kpi-total-label').textContent = type === 'movie' ? 'Films notés' : 'Séries suivies';
    document.getElementById('top-directors-box').style.display = type === 'movie' ? '' : 'none';
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
// Une carte par série ayant un épisode à regarder : soit une saison
// entamée mais pas finie, soit — si la dernière saison connue vient
// d'être terminée — la saison suivante si elle existe (détectée via TMDb,
// pas stockée d'avance puisque seules les saisons déjà sélectionnées sont
// connues localement). Si aucune suite n'existe, la série disparaît
// simplement du widget.

async function renderTvContinueList() {
  const container = document.getElementById('tv-continue-list');
  const sectionEl = document.getElementById('tv-continue-section');
  const shows = loadTvShows();
  const candidates = [];

  for (const show of shows) {
    const entries = Object.entries(show.seasons || {});
    const partial = entries
      .filter(([, s]) => s.totalEpisodes > 0 && s.watchedEpisodes.length < s.totalEpisodes && !s.paused)
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
    sectionEl.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  sectionEl.style.display = 'block';
  document.getElementById('tv-continue-count').textContent = `(${candidates.length})`;
  container.innerHTML = candidates.map((c, i) => `<div class="tv-continue-card tv-continue-loading" data-continue-idx="${i}">Chargement…</div>`).join('');

  // Bug corrigé (signalé par l'utilisateur : notes/coup de cœur qui
  // disparaissent en validant une saison depuis ce widget) : ce bloc
  // lançait toutes les résolutions EN PARALLÈLE (forEach + async, jamais
  // attendu). resolveNextTvEpisode() fait son propre load→modifie→save sur
  // localStorage — avec plusieurs séries "En cours" en même temps
  // (notamment celles qui déclenchent needsNextSeasonCheck), deux
  // résolutions pouvaient se chevaucher : la seconde lit l'état AVANT que
  // la première n'ait fini d'écrire, puis sauvegarde par-dessus une copie
  // périmée qui ne contient pas encore le changement de la première —
  // silencieusement perdu. Boucle séquentielle (une résolution complète
  // avant que la suivante ne démarre) plutôt que tout lancer d'un coup :
  // élimine structurellement le chevauchement, pas juste dans les cas où
  // j'ai réussi à le reproduire.
  for (let idx = 0; idx < candidates.length; idx++) {
    const cand = candidates[idx];
    const resolved = await resolveNextTvEpisode(cand);
    const placeholder = container.querySelector(`[data-continue-idx="${idx}"]`);
    if (!placeholder) continue; // le conteneur a pu être reconstruit entre-temps
    if (!resolved) {
      placeholder.remove();
      if (container.children.length === 0) document.getElementById('tv-continue-section').style.display = 'none';
      continue;
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderTvContinueCard(resolved);
    placeholder.replaceWith(wrapper.firstElementChild);
  }
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
      seasonKey = String(nextNum);
      seasonEntry = await mutateTvShows(shows => {
        const showEntry = shows.find(s => String(s.tmdbTvId) === String(show.tmdbTvId));
        if (!showEntry.seasons[seasonKey]) {
          showEntry.seasons[seasonKey] = { seasonName: nextMeta.name, watchedEpisodes: [], totalEpisodes: nextMeta.episode_count };
        }
        return showEntry.seasons[seasonKey];
      });
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

  // Ludex 2.0 : protection anti-spoilers — un épisode déjà présent dans la
  // liste de la saison (donc "next unwatched" au sens strict) mais dont la
  // date de diffusion n'est pas encore passée reste verrouillé : ni titre,
  // ni synopsis, ni action de notation. episode.air_date vient de la même
  // réponse saison déjà chargée (pas d'appel réseau supplémentaire) —
  // équivalent en pratique à next_episode_to_air pour cet usage précis :
  // le prochain épisode non vu ET pas encore diffusé est justement celui
  // que next_episode_to_air désignerait.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const airDate = episode.air_date ? new Date(episode.air_date + 'T00:00:00') : null;
  const isLocked = !airDate || airDate > today;

  if (isLocked) {
    const countdown = episode.air_date ? formatAirCountdown(episode.air_date) : 'Date de diffusion inconnue';
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

document.getElementById('tv-continue-list').addEventListener('click', async (e) => {
  const removeBtn = e.target.closest('.tv-continue-remove-btn');
  if (removeBtn) {
    // Retire uniquement de cette liste — aucune donnée touchée, la carte
    // peut revenir au prochain rendu si les conditions correspondent
    // encore (ex : un épisode coché ailleurs).
    const cardEl = removeBtn.closest('.tv-continue-card');
    cardEl.remove();
    const container = document.getElementById('tv-continue-list');
    if (container.children.length === 0) document.getElementById('tv-continue-section').style.display = 'none';
    return;
  }

  const pauseBtn = e.target.closest('.tv-continue-pause-btn');
  if (pauseBtn) {
    await mutateTvShows(shows => {
      const showEntry = shows.find(s => String(s.tmdbTvId) === String(pauseBtn.dataset.showId));
      const seasonEntry = showEntry?.seasons?.[pauseBtn.dataset.seasonKey];
      if (seasonEntry) seasonEntry.paused = true;
    });
    const cardEl = pauseBtn.closest('.tv-continue-card');
    cardEl.remove();
    const container = document.getElementById('tv-continue-list');
    if (container.children.length === 0) document.getElementById('tv-continue-section').style.display = 'none';
    showToast('Mise en pause — reprends-la depuis sa fiche');
    return;
  }

  const btn = e.target.closest('.tv-continue-check-btn');
  if (!btn) return;
  const showId = btn.dataset.showId;
  const seasonKey = btn.dataset.seasonKey;
  const episodeNumber = Number(btn.dataset.episode);

  const seasonEntry = await mutateTvShows(shows => {
    const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
    if (!showEntry) return null;
    const se = showEntry.seasons[seasonKey];
    if (!se.watchedEpisodes.includes(episodeNumber)) se.watchedEpisodes.push(episodeNumber);
    return se;
  });
  if (!seasonEntry) return;
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
    if (container.children.length === 0) document.getElementById('tv-continue-section').style.display = 'none';
  } else {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderTvContinueCard(resolved);
    cardEl.replaceWith(wrapper.firstElementChild);
  }
});

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
