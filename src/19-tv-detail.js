// ═══════════════════════════════════════════
//  FICHE SÉRIE DÉTAILLÉE
// ═══════════════════════════════════════════
// Ouverte au tap sur une série (carte dans l'Historique). Même structure et
// mécanique que la fiche film (voir 12-movie-detail.js) : squelette de
// chargement, récupération à la demande, sections qui apparaissent en
// cascade. Adaptée où le format série le demande — la vraie différence :
// pas de "Ta note" unique, mais la progression par saison + note globale.

const tdsEl = document.getElementById('tv-detail-sheet');
const tdsContentEl = document.getElementById('tds-content');
const tdsCloseBtn = document.getElementById('tds-close-btn');

tdsContentEl.addEventListener('click', (e) => {
  const trailerWrap = e.target.closest('.mds-trailer-wrap');
  if (!trailerWrap || trailerWrap.querySelector('iframe')) return;
  const key = trailerWrap.dataset.videoKey;
  trailerWrap.innerHTML = `<iframe class="mds-trailer" src="https://www.youtube.com/embed/${key}?autoplay=1" title="Bande-annonce" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
});

function buildTdsSkeleton() {
  return `
    <div class="mds-skeleton">
      <div class="mds-skeleton-poster skeleton-bg"></div>
      <div class="mds-skeleton-lines">
        <div class="skeleton-text long skeleton-bg" style="height:18px;"></div>
        <div class="skeleton-text short skeleton-bg"></div>
      </div>
    </div>
    <div class="skeleton-text long skeleton-bg" style="margin-top:18px;"></div>
    <div class="skeleton-text long skeleton-bg"></div>
    <div class="skeleton-text short skeleton-bg"></div>
  `;
}

function buildSeasonProgressionSection(data, localShow) {
  const tmdbSeasons = (data.seasons || []).filter(s => s.season_number > 0 && s.episode_count > 0);
  if (tmdbSeasons.length === 0) return '';

  const avg = localShow ? computeShowAverageScore(localShow) : null;
  const avgHtml = avg != null
    ? `<div class="mds-personal-score">${avg.toFixed(1)}/10 <span class="mds-personal-stars">note globale</span></div>`
    : `<div class="mds-row"><span class="mds-label">—</span><span>Pas encore notée</span></div>`;

  const rowsHtml = tmdbSeasons.map(ts => {
    const key = String(ts.season_number);
    const localSeason = localShow?.seasons?.[key];
    let statusHtml;
    if (localSeason?.rating) {
      statusHtml = `<span class="tds-season-status tds-season-rated">${localSeason.rating.score}/10</span>`;
    } else if (localSeason) {
      statusHtml = `<span class="tds-season-status">${localSeason.watchedEpisodes.length}/${localSeason.totalEpisodes} ép.</span>`;
    } else {
      statusHtml = `<span class="tds-season-status tds-season-untracked">Non suivie</span>`;
    }
    return `
      <div class="tds-season-progress-row" data-season-number="${ts.season_number}" data-episode-count="${ts.episode_count}" data-season-name="${escAttr(ts.name)}" data-season-poster="${escAttr(ts.poster_path || data.poster_path || '')}">
        <span>${escAttr(ts.name)}</span>
        ${statusHtml}
      </div>
    `;
  }).join('');

  return `
    <div class="mds-section mds-personal" style="animation-delay:.05s">
      <div class="mds-section-title">Progression</div>
      ${avgHtml}
    </div>
    <div class="mds-section" style="animation-delay:.08s">
      <div class="mds-section-title">Détail par saison</div>
      <div class="tds-season-progress-list">${rowsHtml}</div>
    </div>
  `;
}

function buildTdsContent(data, localShow) {
  const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : '';
  const year = data.first_air_date ? data.first_air_date.slice(0, 4) : '';
  const genres = (data.genres || []).map(g => g.name).join(', ');
  function personLink(p) {
    return `<span class="mds-person-link" data-person-id="${p.id}" data-person-name="${escAttr(p.name)}">${escAttr(p.name)}</span>`;
  }
  const creators = (data.created_by || []).map(personLink).join(', ');
  const castList = (data.credits?.cast || []).slice(0, 5);
  const castHtml = castList.map(c => escAttr(c.name)).join(', ');
  const firstAirStr = data.first_air_date
    ? new Date(data.first_air_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Inconnue';
  const statusLabels = { 'Returning Series': 'En cours', 'Ended': 'Terminée', 'Canceled': 'Annulée' };
  const statusStr = statusLabels[data.status] || data.status || 'Inconnu';
  const seasonCount = (data.seasons || []).filter(s => s.season_number > 0).length;

  return `
    <div class="mds-header" style="animation-delay:0s">
      <div class="mds-header-left">
        <div class="mds-poster-wrap">
          ${posterUrl
            ? `<img class="mds-poster" src="${posterUrl}" alt="Affiche de ${escAttr(data.name)}" loading="lazy">`
            : `<div class="mds-poster mds-poster-ph">${ICONS.clapper}</div>`}
          ${data.vote_average ? `<div class="mds-score-stamp"><span class="mds-score-stamp-val">${data.vote_average.toFixed(1)}</span><span class="mds-score-stamp-label">TMDb</span></div>` : ''}
        </div>
        ${localShow ? `<button type="button" class="mds-poster-change-btn" data-tv-poster-picker="${escAttr(String(data.id))}">Changer l'affiche</button>` : ''}
      </div>
      <div class="mds-header-info">
        <div class="mds-title" id="tds-title">${escAttr(data.name)}</div>
        <div class="mds-meta">${[year, `${seasonCount} saison${seasonCount > 1 ? 's' : ''}`, genres].filter(Boolean).map(s => `<span>${s}</span>`).join('')}</div>
        <div class="mds-external-ratings" id="tds-external-ratings"></div>
        ${creators ? `<div class="mds-header-director"><span class="mds-director-label">Créée par</span> <b>${creators}</b></div>` : ''}
      </div>
    </div>

    <div class="mds-actions" style="animation-delay:.02s">
      <button type="button" class="mds-action-btn primary" id="tds-rate-btn" title="Noter cette série">${ICONS.star} Noter / Suivre</button>
    </div>

    ${buildSeasonProgressionSection(data, localShow)}

    ${(() => {
      const trailer = pickBestTrailer(data.videos?.results || []);
      if (!trailer) return '';
      return `
      <div class="mds-section" style="animation-delay:.12s">
        <div class="mds-section-title">Bande-annonce</div>
        <div class="mds-trailer-wrap" data-video-key="${trailer.key}" role="button" tabindex="0" aria-label="Lire la bande-annonce de ${escAttr(data.name)}">
          <img class="mds-trailer-thumb" src="https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg" alt="" loading="lazy">
          <div class="mds-trailer-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
      </div>`;
    })()}

    ${data.overview ? `
      <div class="mds-section" style="animation-delay:.15s">
        <div class="mds-section-title">Synopsis</div>
        <div class="mds-overview" id="tds-overview">${escAttr(data.overview)}</div>
        <button type="button" class="mds-overview-toggle" id="tds-overview-toggle">Lire la suite ▾</button>
      </div>` : ''}

    <div class="mds-section" style="animation-delay:.18s">
      <div class="mds-section-title">Détails</div>
      <div class="mds-row"><span class="mds-label">Première diffusion</span><span>${firstAirStr}</span></div>
      <div class="mds-row"><span class="mds-label">Statut</span><span>${escAttr(statusStr)}</span></div>
      ${castHtml ? `<div class="mds-row"><span class="mds-label">Avec</span><span>${castHtml}</span></div>` : ''}
    </div>

    ${(data.credits?.cast || []).length > 0 ? `
      <div class="mds-section" style="animation-delay:.22s">
        <div class="mds-section-title">Casting</div>
        <div class="mds-cast-carousel" id="tds-cast-carousel"></div>
      </div>` : ''}
  `;
}

async function populateTdsExternalRatings(imdbId) {
  const el = document.getElementById('tds-external-ratings');
  if (!el || !imdbId) return;
  try {
    const res = await fetch(`/api/search?imdbId=${imdbId}`);
    const data = await readApiJson(res);
    const ratings = data.ratings || [];
    if (ratings.length === 0) return;
    const labels = { 'Internet Movie Database': 'IMDb', 'Rotten Tomatoes': 'RT', 'Metacritic': 'Metacritic' };
    el.innerHTML = ratings
      .filter(r => labels[r.Source])
      .map(r => `<span class="mds-external-rating"><b>${labels[r.Source]}</b> ${escAttr(r.Value)}</span>`)
      .join('');
  } catch { /* silencieux : la note TMDb deja affichee suffit */ }
}

function setupTdsOverviewToggle() {
  const overview = document.getElementById('tds-overview');
  const toggle = document.getElementById('tds-overview-toggle');
  if (!overview || !toggle) return;
  requestAnimationFrame(() => {
    if (overview.scrollHeight <= overview.clientHeight + 2) toggle.style.display = 'none';
  });
}

function renderTdsCastCarousel(castArray) {
  const outer = document.getElementById('tds-cast-carousel');
  if (!outer) return;
  const cast = castArray.filter(c => c.id).slice(0, 20);
  if (cast.length === 0) return;

  const itemsHtml = cast.map(actor => {
    const photoUrl = actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : '';
    return `
      <div class="mds-cast-item" data-person-id="${actor.id}" data-person-name="${escAttr(actor.name)}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(actor.name)}">
        ${photoUrl
          ? `<img class="mds-cast-photo" src="${photoUrl}" alt="Photo de ${escAttr(actor.name)}" loading="lazy">`
          : `<div class="mds-cast-photo mds-cast-photo-ph">${ICONS.clapper}</div>`}
        <div class="mds-cast-name">${escAttr(actor.name)}</div>
        ${actor.character ? `<div class="mds-cast-character">${escAttr(actor.character)}</div>` : ''}
      </div>`;
  }).join('');

  // Duplique la liste une fois : le défilement peut boucler sans à-coup dès
  // qu'il a parcouru l'équivalent d'une copie complète — même technique que
  // la fiche film (voir renderCastCarousel).
  outer.innerHTML = `<div class="mds-cast-track">${itemsHtml}${itemsHtml}</div>`;
  const track = outer.querySelector('.mds-cast-track');

  outer.addEventListener('click', (e) => {
    const item = e.target.closest('.mds-cast-item');
    if (item) openPersonDetailSheet(item.dataset.personId, item.dataset.personName);
  });

  const AUTO_SCROLL_SPEED = 0.3;
  const RESUME_DELAY_MS = 3000;
  let autoScrollPaused = false;
  let resumeTimer = null;

  function pauseThenScheduleResume() {
    autoScrollPaused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { autoScrollPaused = false; }, RESUME_DELAY_MS);
  }

  function tick() {
    if (!autoScrollPaused && tdsEl.classList.contains('open')) {
      outer.scrollLeft += AUTO_SCROLL_SPEED;
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0 && outer.scrollLeft >= halfWidth) outer.scrollLeft -= halfWidth;
    }
    if (tdsEl.classList.contains('open')) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  outer.addEventListener('touchstart', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('touchmove', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('wheel', pauseThenScheduleResume, { passive: true });
  outer.addEventListener('scroll', pauseThenScheduleResume, { passive: true });
}

// Sauvegarde l'affiche choisie sur la série suivie localement — même geste
// que applyChosenPoster côté film, mais écrit directement le fragment TMDb
// brut (poster_path), déjà le format utilisé partout côté séries, plutôt
// que de construire une URL complète comme les films en ont besoin.
function applyChosenTvPoster(tmdbTvId, posterPath) {
  const shows = loadTvShows();
  const show = shows.find(s => String(s.tmdbTvId) === String(tmdbTvId));
  if (!show) return 0;
  show.poster_path = posterPath;
  saveTvShows(shows);
  return 1;
}

let tdsCurrentData = null;

async function openTvDetailSheet(tmdbTvId) {
  if (!tmdbTvId) return;
  lastFocusedBeforeModal = document.activeElement;
  tdsContentEl.innerHTML = buildTdsSkeleton();
  tdsEl.classList.add('open');
  tdsCloseBtn.focus();
  const tdsBoxEl = tdsEl.querySelector('.mds-box');
  if (tdsBoxEl) tdsBoxEl.scrollTop = 0;

  try {
    const res = await fetch(`/api/search?tvId=${tmdbTvId}`);
    if (!res.ok) throw new Error('bad status');
    const data = await readApiJson(res);
    if (!data || !data.name) throw new Error('no data');

    const localShow = loadTvShows().find(s => String(s.tmdbTvId) === String(tmdbTvId));
    tdsContentEl.innerHTML = buildTdsContent(data, localShow);
    tdsCurrentData = data;
    renderTdsCastCarousel(data.credits?.cast || []);
    const tdsPosterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : '';
    applyPosterAccent(tdsPosterUrl, tdsEl.querySelector('.mds-box'));
    setupTdsOverviewToggle();
    setupStickyHeader(tdsEl);
    if (data.external_ids?.imdb_id) populateTdsExternalRatings(data.external_ids.imdb_id);
  } catch (e) {
    tdsCurrentData = null;
    tdsContentEl.innerHTML = `
      <div class="error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        <div class="error-state-msg">Impossible de charger les détails de la série. Vérifie ta connexion.</div>
        <button type="button" class="error-retry-btn" data-retry-tv-id="${escAttr(String(tmdbTvId))}">Réessayer</button>
      </div>`;
  }
}

function closeTvDetailSheet() {
  closeModal(tdsEl);
}

tdsCloseBtn.addEventListener('click', closeTvDetailSheet);
tdsEl.addEventListener('click', (e) => {
  if (e.target === tdsEl) { closeTvDetailSheet(); return; }

  const personLinkEl = e.target.closest('.mds-person-link');
  if (personLinkEl) {
    openPersonDetailSheet(personLinkEl.dataset.personId, personLinkEl.dataset.personName);
    return;
  }

  const retryBtn = e.target.closest('[data-retry-tv-id]');
  if (retryBtn) { openTvDetailSheet(retryBtn.dataset.retryTvId); return; }

  const posterChangeBtn = e.target.closest('.mds-poster-change-btn[data-tv-poster-picker]');
  if (posterChangeBtn) { openPosterPicker(posterChangeBtn.dataset.tvPosterPicker, 'tv'); return; }

  // "Noter / Suivre" : ferme la fiche, bascule vers Noter en mode Série,
  // pré-remplit la recherche avec cette série — reprend le flux normal de
  // sélection plutôt que de dupliquer la logique de recherche/sélection.
  if (e.target.closest('#tds-rate-btn')) {
    const data = tdsCurrentData;
    if (!data) return;
    closeTvDetailSheet();
    switchMobileNav('rating');
    setMediaType('tv');
    document.getElementById('tv-search').value = data.name;
    document.getElementById('tv-search').dispatchEvent(new Event('input'));
    return;
  }

  // Clic sur une ligne de saison dans la progression : ouvre directement le
  // suivi/notation de CETTE saison (même mécanique que reopenTvSeason,
  // réutilisée depuis des données fraîches TMDb plutôt que forcément déjà
  // suivies localement).
  const seasonRow = e.target.closest('.tds-season-progress-row');
  if (seasonRow && tdsCurrentData) {
    closeTvDetailSheet();
    switchMobileNav('rating');
    setMediaType('tv');
    selectedShow = { id: tdsCurrentData.id, name: tdsCurrentData.name, poster_path: tdsCurrentData.poster_path };
    document.getElementById('tv-search').value = tdsCurrentData.name;
    document.getElementById('tv-season-picker').style.display = 'none';
    selectSeason({
      number: seasonRow.dataset.seasonNumber,
      name: seasonRow.dataset.seasonName,
      episodeCount: seasonRow.dataset.episodeCount,
      poster: seasonRow.dataset.seasonPoster,
    });
  }
});

initSwipeToClose(tdsEl, closeTvDetailSheet);
