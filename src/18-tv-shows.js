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

let currentMediaType = 'movie';
let selectedShow = null; // { id, name, poster_path } une fois une serie choisie

function setMediaType(type) {
  currentMediaType = type;
  document.getElementById('tab-media-movie').classList.toggle('active', type === 'movie');
  document.getElementById('tab-media-tv').classList.toggle('active', type === 'tv');
  document.getElementById('movie-only-fields').style.display = type === 'movie' ? '' : 'none';
  document.getElementById('tv-only-fields').style.display = type === 'tv' ? '' : 'none';
  document.getElementById('film-card-title').textContent = type === 'movie' ? 'Film' : 'Série';
  // La carte Notation (critères, mode Détaillé/Rapide) n'a pas encore
  // d'équivalent série (Phase 3) — masquée plutôt que de laisser un
  // formulaire de notation film sans rapport avec une saison sélectionnée.
  document.getElementById('notation-card').style.display = type === 'movie' ? '' : 'none';
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
}
