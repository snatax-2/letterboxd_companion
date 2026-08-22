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

// Ludex 2.0 : "à regarder ensuite" dans la fiche elle-même — même
// résolution que le widget de l'écran Noter (resolveNextTvEpisode(),
// 18-tv-shows.js), reconstruit ici pour UNE SEULE série connue au lieu
// d'itérer sur toutes celles en cours. Même construction de candidat
// (saison partielle la plus récente, ou la plus récente saison complète
// avec vérification de la saison suivante) que ce que fait déjà
// buildTvContinueList() pour le widget — gardé volontairement identique
// plutôt que réinventé, pour que les deux se comportent pareil.
async function populateTdsUpNext(localShow) {
  const container = document.getElementById('tds-up-next');
  if (!container || !localShow) { if (container) container.style.display = 'none'; return; }

  const entries = Object.entries(localShow.seasons || {});
  const partial = entries
    .filter(([, s]) => s.totalEpisodes > 0 && s.watchedEpisodes.length < s.totalEpisodes && !s.paused)
    .sort((a, b) => Number(b[0]) - Number(a[0]))[0];
  let cand = null;
  if (partial) {
    cand = { show: localShow, seasonKey: partial[0], seasonEntry: partial[1] };
  } else {
    const complete = entries
      .filter(([, s]) => s.totalEpisodes > 0 && s.watchedEpisodes.length >= s.totalEpisodes)
      .sort((a, b) => Number(b[0]) - Number(a[0]))[0];
    if (complete) cand = { show: localShow, seasonKey: complete[0], seasonEntry: complete[1], needsNextSeasonCheck: true };
  }
  if (!cand) { container.style.display = 'none'; return; }

  const resolved = await resolveNextTvEpisode(cand);
  if (!resolved) { container.style.display = 'none'; return; }

  const { seasonKey, seasonEntry, episode } = resolved;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const airDate = episode.air_date ? new Date(episode.air_date + 'T00:00:00') : null;
  const isLocked = !airDate || airDate > today;

  if (isLocked) {
    const countdown = episode.air_date ? formatAirCountdown(episode.air_date) : 'Date de diffusion inconnue';
    container.innerHTML = `
      <div class="tds-upnext tds-upnext-locked">
        <div class="tds-upnext-label">À venir</div>
        <div class="tds-upnext-title"><span class="tds-upnext-masked">Épisode à venir</span></div>
        <div class="tds-upnext-meta">${escAttr(countdown)}</div>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="tds-upnext">
        <div>
          <div class="tds-upnext-label">À regarder</div>
          <div class="tds-upnext-title">S${String(seasonKey).padStart(2, '0')}E${String(episode.episode_number).padStart(2, '0')} — ${escAttr(episode.name || 'Sans titre')}</div>
        </div>
        <button type="button" class="tds-upnext-check" data-show-id="${localShow.tmdbTvId}" data-season-key="${seasonKey}" data-episode="${episode.episode_number}" data-season-name="${escAttr(seasonEntry.seasonName)}" data-episode-count="${seasonEntry.totalEpisodes}" aria-label="Marquer l'épisode ${episode.episode_number} comme vu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>
        </button>
      </div>`;
  }
  container.style.display = 'block';
}

function buildSeasonProgressionSection(data, localShow) {
  const tmdbSeasons = (data.seasons || []).filter(s => s.season_number > 0 && s.episode_count > 0);
  if (tmdbSeasons.length === 0) return '';

  const avg = localShow ? computeShowAverageScore(localShow) : null;
  const avgHtml = avg != null
    ? `<div class="mds-personal-score">${avg.toFixed(1)}/10 <span class="mds-personal-stars">note globale</span></div>`
    : `<div class="mds-row"><span class="mds-label">—</span><span>Pas encore notée</span></div>`;

  // Ludex 2.0 : onglets horizontaux au lieu d'une liste de <details> empilés
  // (voir Ludex_Audit_Fiches.pdf — "un scroll interminable, surtout pour
  // une série de 10 saisons"). Un seul conteneur d'épisodes en dessous,
  // rechargé au clic (voir wireSeasonTabs()) plutôt qu'un par saison.
  // Onglet actif par défaut : la saison la plus avancée déjà suivie, sinon
  // la première — cohérent avec "à regarder ensuite" juste au-dessus.
  const trackedKeys = Object.keys(localShow?.seasons || {}).map(Number);
  const defaultSeasonNum = trackedKeys.length > 0 ? Math.max(...trackedKeys) : tmdbSeasons[0].season_number;

  const tabsHtml = tmdbSeasons.map(ts => `
    <button type="button" class="tds-season-tab${ts.season_number === defaultSeasonNum ? ' active' : ''}" data-season-number="${ts.season_number}" data-episode-count="${ts.episode_count}" data-season-name="${escAttr(ts.name)}" data-season-poster="${escAttr(ts.poster_path || data.poster_path || '')}">S${ts.season_number}</button>
  `).join('');

  const activeSeasonMeta = tmdbSeasons.find(ts => ts.season_number === defaultSeasonNum);
  const activeKey = String(defaultSeasonNum);
  const activeLocalSeason = localShow?.seasons?.[activeKey];
  const statusRowHtml = buildSeasonStatusRow(localShow, activeSeasonMeta, activeLocalSeason);

  return `
    <div class="mds-section mds-personal" style="animation-delay:.05s">
      <div class="mds-section-title">Progression</div>
      ${avgHtml}
    </div>
    <div class="mds-section" style="animation-delay:.08s">
      <div class="mds-section-title">Détail par saison</div>
      <div class="tds-season-tabs" id="tds-season-tabs">${tabsHtml}</div>
      <div class="tds-season-status-row" id="tds-season-status-row">${statusRowHtml}</div>
      <div class="tds-season-episodes" id="tds-season-episodes" data-loaded-season="">Chargement…</div>
    </div>
  `;
}

// Ligne d'état + actions pour la saison actuellement sélectionnée dans les
// onglets — extrait dans sa propre fonction pour être régénéré au clic sur
// un onglet SANS reconstruire toute la section (voir wireSeasonTabs()).
function buildSeasonStatusRow(localShow, seasonMeta, localSeason) {
  if (!seasonMeta) return '';
  const key = String(seasonMeta.season_number);
  let statusHtml;
  if (localSeason?.rating) {
    statusHtml = `<span class="tds-season-status tds-season-rated">${localSeason.rating.score}/10</span>`;
  } else if (localSeason) {
    statusHtml = `<span class="tds-season-status">${localSeason.watchedEpisodes.length}/${localSeason.totalEpisodes} ép.</span>`;
  } else {
    statusHtml = `<span class="tds-season-status tds-season-untracked">Non suivie</span>`;
  }
  return `
    <span>${escAttr(seasonMeta.name)}</span>
    <span class="tds-season-progress-right">
      ${statusHtml}
      ${localSeason ? `<button type="button" class="tds-season-reopen-btn" data-show-id="${escAttr(String(localShow.tmdbTvId))}" data-season-key="${key}" title="Rouvrir pour noter" aria-label="Rouvrir ${escAttr(seasonMeta.name)} pour la noter">${ICONS.star}</button>` : ''}
      ${localSeason ? `<button type="button" class="tds-season-delete-btn" data-show-id="${escAttr(String(localShow.tmdbTvId))}" data-season-key="${key}" title="Retirer cette saison" aria-label="Retirer ${escAttr(seasonMeta.name)}">${ICONS.trash}</button>` : ''}
    </span>
  `;
}

function buildTdsContent(data, localShow) {
  const posterUrl = tmdbImage(data.poster_path, 'w342');
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
  // Vert = en cours (nouveaux épisodes à venir), rouge = arrêtée (terminée
  // ou annulée) — même distinction, deux raisons différentes, mais aucune
  // des deux ne dit "reviens régulièrement", contrairement à "En cours".
  const TDS_STATUS_CLASS = { 'Returning Series': 'ongoing', 'Ended': 'ended', 'Canceled': 'ended' };
  const seasonCount = (data.seasons || []).filter(s => s.season_number > 0).length;

  return `
    <div class="mds-header" style="animation-delay:0s; --mds-backdrop: ${data.backdrop_path ? `url('${tmdbImage(data.backdrop_path, 'w780')}')` : 'none'}">
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
        <!-- Ludex 2.0 : badge de statut coloré (voir Ludex_Audit_Fiches.pdf)
             — remplace le texte brut qui vivait jusqu'ici dans une simple
             ligne d'info plus bas dans la fiche. -->
        <div class="tds-status-badge ${TDS_STATUS_CLASS[data.status] || 'neutral'}"><span class="tds-status-dot"></span>${escAttr(statusStr)}</div>
        <div class="mds-meta">${[year, `${seasonCount} saison${seasonCount > 1 ? 's' : ''}`, genres].filter(Boolean).map(s => `<span>${s}</span>`).join('')}</div>
        <div class="mds-external-ratings" id="tds-external-ratings"></div>
        ${creators ? `<div class="mds-header-director"><span class="mds-director-label">Créée par</span> <b>${creators}</b></div>` : ''}
      </div>
      <!-- Ludex 2.0 : le bouton "coup de cœur" a migré vers le formulaire
           Noter (voir #tv-heart-btn, 18-tv-shows.js) — harmonisé avec le
           film, dont le cœur vit dans Noter, jamais dans la fiche détail.
           Reste par SÉRIE entière (confirmé), juste déplacé d'endroit. -->
    </div>

    ${!localShow ? `
    <div class="mds-actions" style="animation-delay:.02s">
      <button type="button" class="mds-action-btn primary" id="tds-start-btn" title="Commencer cette série">${ICONS.play} Commencer la série</button>
    </div>
    ` : ''}

    <div class="mds-providers" id="tds-providers" style="display:none;"></div>

    <!-- Ludex 2.0 : "à regarder ensuite" directement dans la fiche (voir
         Ludex_Audit_Fiches_Suggestions.pdf — "il n'y a pas d'appel à
         l'action immédiat pour continuer sa série") — jusqu'ici cette info
         n'existait que sur le widget de l'écran Noter, séparément. Peuplé
         de façon asynchrone juste après l'insertion (voir
         populateTdsUpNext() plus bas), masqué tant qu'il n'y a rien à
         montrer (série pas commencée, ou totalement à jour). -->
    <div id="tds-up-next" style="display:none;"></div>

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
    const photoUrl = tmdbImage(actor.profile_path, 'w185');
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
    const tdsPosterUrl = tmdbImage(data.poster_path, 'w342');
    applyPosterAccent(tdsPosterUrl, tdsEl.querySelector('.mds-box'));
    setupTdsOverviewToggle();
    setupStickyHeader(tdsEl);
    if (data.external_ids?.imdb_id) populateTdsExternalRatings(data.external_ids.imdb_id);
    fetchAndRenderProviders(data.id, 'tds-providers', 'tv');
    populateTdsUpNext(localShow);
    wireSeasonTabs();
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

// ── Grille d'épisodes, uniquement dans la fiche série ──
// Chargée à la demande au premier dépliage d'une saison (pas toutes en même
// temps à l'ouverture de la fiche) — même mécanique de coche/rattrapage que
// ce qui existait avant dans Noter, juste déplacée ici.

function wireSeasonTabs() {
  const tabsEl = document.getElementById('tds-season-tabs');
  if (!tabsEl) return;
  tabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.tds-season-tab');
    if (!tab || tab.classList.contains('active')) return;
    tabsEl.querySelectorAll('.tds-season-tab').forEach(t => t.classList.toggle('active', t === tab));

    const localShow = loadTvShows().find(s => String(s.tmdbTvId) === String(tdsCurrentData?.id));
    const key = tab.dataset.seasonNumber;
    const seasonMeta = { season_number: Number(key), name: tab.dataset.seasonName, episode_count: Number(tab.dataset.episodeCount) };
    const statusRowEl = document.getElementById('tds-season-status-row');
    if (statusRowEl) statusRowEl.innerHTML = buildSeasonStatusRow(localShow, seasonMeta, localShow?.seasons?.[key]);

    loadAndRenderSeasonEpisodes(tab.dataset.seasonNumber, tab.dataset.seasonName);
  });
  // Charge la saison active par défaut au premier affichage — pas besoin
  // d'attendre un clic sur un onglet pour voir apparaître des épisodes.
  const activeTab = tabsEl.querySelector('.tds-season-tab.active');
  if (activeTab) loadAndRenderSeasonEpisodes(activeTab.dataset.seasonNumber, activeTab.dataset.seasonName);
}

async function loadAndRenderSeasonEpisodes(seasonNumber, seasonName) {
  const container = document.getElementById('tds-season-episodes');
  if (!container || !tdsCurrentData) return;
  if (container.dataset.loadedSeason === String(seasonNumber)) return; // déjà affichée, pas de re-fetch
  const showId = tdsCurrentData.id;
  container.innerHTML = '<div class="search-status" style="display:block;">Chargement des épisodes…</div>';
  try {
    const data = await fetch(`/api/search?tvSeasonShowId=${showId}&tvSeasonNumber=${seasonNumber}`).then(readApiJson);
    const episodes = data.episodes || [];
    if (episodes.length === 0) {
      container.innerHTML = '<div class="search-status" style="display:block;">Aucun épisode trouvé pour cette saison.</div>';
      return;
    }
    renderTdsEpisodeChecklist(container, showId, String(seasonNumber), seasonName, episodes);
    container.dataset.loadedSeason = String(seasonNumber);
  } catch (err) {
    container.innerHTML = `<div class="search-status" style="display:block;">${escAttr(describeApiFailure(err))}</div>`;
  }
}

function renderTdsEpisodeChecklist(container, showId, seasonKey, seasonName, episodes) {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
  const seasonEntry = showEntry?.seasons?.[seasonKey];
  const watched = seasonEntry ? seasonEntry.watchedEpisodes : [];

  const rowsHtml = episodes.map(ep => {
    const isWatched = watched.includes(ep.episode_number);
    const meta = [
      ep.air_date ? new Date(ep.air_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      ep.runtime ? `${ep.runtime} min` : '',
    ].filter(Boolean).join(' · ');
    return `
      <div class="tv-episode-row" data-episode="${ep.episode_number}">
        <button type="button" class="tv-episode-check${isWatched ? ' watched' : ''}" data-episode="${ep.episode_number}" aria-pressed="${isWatched}" aria-label="Marquer l'épisode ${ep.episode_number} comme ${isWatched ? 'non vu' : 'vu'}">
          <svg class="tv-episode-checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>
        </button>
        <div class="tv-episode-info">
          <div class="tv-episode-title">${ep.episode_number}. ${escAttr(ep.name || 'Sans titre')}</div>
          ${meta ? `<div class="tv-episode-meta">${escAttr(meta)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="tds-episode-list">${rowsHtml}</div>
    <button type="button" class="mds-action-btn primary tds-rate-now-btn" style="display:none;" data-show-id="${showId}" data-season-key="${seasonKey}">Noter cette saison</button>
  `;

  container.querySelectorAll('.tv-episode-check').forEach(btn => {
    btn.addEventListener('click', () => onTdsEpisodeCheckClick(showId, seasonKey, seasonName, episodes.length, Number(btn.dataset.episode), container));
  });

  updateTdsRateButtonVisibility(container, showId, seasonKey);
}

function onTdsEpisodeCheckClick(showId, seasonKey, seasonName, totalEpisodes, episodeNumber, container) {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
  if (!showEntry) return;
  if (!showEntry.seasons[seasonKey]) {
    // Ne devrait normalement pas arriver (la saison est censée déjà exister
    // dès qu'elle a été "commencée" depuis Noter), créée quand même par
    // sécurité plutôt que de planter.
    showEntry.seasons[seasonKey] = { seasonName, watchedEpisodes: [], totalEpisodes };
  }
  const seasonEntry = showEntry.seasons[seasonKey];
  const already = seasonEntry.watchedEpisodes.includes(episodeNumber);

  const applyState = (num, watched) => {
    const btn = container.querySelector(`.tv-episode-check[data-episode="${num}"]`);
    if (!btn) return;
    btn.classList.toggle('watched', watched);
    btn.setAttribute('aria-pressed', String(watched));
  };

  if (already) {
    seasonEntry.watchedEpisodes = seasonEntry.watchedEpisodes.filter(n => n !== episodeNumber);
    saveTvShows(shows);
    applyState(episodeNumber, false);
    updateTdsRateButtonVisibility(container, showId, seasonKey);
    updateSeasonProgressRowStatus(showId, seasonKey);
    if (typeof statsDirty !== 'undefined') statsDirty = true;
    return;
  }

  const maxWatched = seasonEntry.watchedEpisodes.length ? Math.max(...seasonEntry.watchedEpisodes) : 0;
  const skipsAhead = episodeNumber > maxWatched + 1;
  const markWatched = (numbers) => {
    for (const n of numbers) if (!seasonEntry.watchedEpisodes.includes(n)) seasonEntry.watchedEpisodes.push(n);
    saveTvShows(shows);
    for (const n of numbers) applyState(n, true);
    updateTdsRateButtonVisibility(container, showId, seasonKey);
    updateSeasonProgressRowStatus(showId, seasonKey);
    if (typeof statsDirty !== 'undefined') statsDirty = true;
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

function updateTdsRateButtonVisibility(container, showId, seasonKey) {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
  const seasonEntry = showEntry?.seasons?.[seasonKey];
  const btn = container.querySelector('.tds-rate-now-btn');
  if (!btn || !seasonEntry) return;
  const isComplete = seasonEntry.totalEpisodes > 0 && seasonEntry.watchedEpisodes.length >= seasonEntry.totalEpisodes;
  btn.style.display = isComplete ? 'block' : 'none';
}

// Met à jour le badge visible dans le <summary> (X/Y ép.) sans reconstruire
// toute la fiche — seulement si la saison n'est pas déjà notée (une note
// existante prime toujours sur le décompte d'épisodes dans l'affichage).
function updateSeasonProgressRowStatus(showId, seasonKey) {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
  const seasonEntry = showEntry?.seasons?.[seasonKey];
  if (!seasonEntry || seasonEntry.rating) return;
  // Ludex 2.0 : une seule ligne de statut pour la saison ACTIVE des onglets
  // (voir buildSeasonStatusRow(), plus haut) — ne met à jour que si c'est
  // bien la saison affichée qui vient de changer, sinon rien à faire ici
  // (la mise à jour se refera d'elle-même au clic sur cet onglet).
  const activeTab = document.getElementById('tds-season-tabs')?.querySelector('.tds-season-tab.active');
  if (!activeTab || activeTab.dataset.seasonNumber !== String(seasonKey)) return;
  const statusEl = document.getElementById('tds-season-status-row')?.querySelector('.tds-season-status');
  if (statusEl) statusEl.textContent = `${seasonEntry.watchedEpisodes.length}/${seasonEntry.totalEpisodes} ép.`;
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

  // Ludex 2.0 : le bouton supprimer d'une saison a migré ici depuis
  // l'ancienne carte extensible de l'Historique (retirée avec le passage en
  // grille) — même fonction (deleteTvSeasonWithConfirm, 18-tv-shows.js),
  // juste un point d'entrée différent. preventDefault+stopPropagation
  // impératifs : ce bouton vit DANS un <summary>, sans ça le clic
  // déclencherait aussi l'ouverture/fermeture du <details> parent.
  const seasonDeleteBtn = e.target.closest('.tds-season-delete-btn[data-show-id]');
  if (seasonDeleteBtn) {
    e.preventDefault();
    e.stopPropagation();
    deleteTvSeasonWithConfirm(seasonDeleteBtn.dataset.showId, seasonDeleteBtn.dataset.seasonKey);
    return;
  }

  const seasonReopenBtn = e.target.closest('.tds-season-reopen-btn[data-show-id]');
  if (seasonReopenBtn) {
    e.preventDefault();
    e.stopPropagation();
    reopenTvSeason(seasonReopenBtn.dataset.showId, seasonReopenBtn.dataset.seasonKey);
    return;
  }

  // Ludex 2.0 : bouton "vu" du bloc "à regarder ensuite" — marque
  // l'épisode, puis rafraîchit à la fois ce bloc (pour révéler le suivant)
  // et la section "Détail par saison" (le compte d'épisodes vus y change
  // aussi). Mutation directe plutôt que onTdsEpisodeCheckClick() : cette
  // fonction est pensée pour la liste d'épisodes dépliée, avec ses propres
  // mises à jour DOM ciblées — pas le contexte ici.
  const upNextCheckBtn = e.target.closest('.tds-upnext-check[data-show-id]');
  if (upNextCheckBtn) {
    const { showId, seasonKey, episode: epNum } = upNextCheckBtn.dataset;
    const shows = loadTvShows();
    const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
    if (showEntry?.seasons?.[seasonKey]) {
      const seasonEntry = showEntry.seasons[seasonKey];
      const num = Number(epNum);
      if (!seasonEntry.watchedEpisodes.includes(num)) seasonEntry.watchedEpisodes.push(num);
      saveTvShows(shows);
      if (typeof statsDirty !== 'undefined') statsDirty = true;
      hapticPulse(upNextCheckBtn, 'medium');
      populateTdsUpNext(showEntry);
      // Réutilise la même fonction que le reste des mises à jour de statut
      // (voir plus haut) — elle sait déjà ne rafraîchir que si la saison
      // concernée est celle actuellement affichée dans les onglets.
      updateSeasonProgressRowStatus(showId, seasonKey);
    }
    return;
  }

  // "Commencer la série" : crée le suivi de la première saison directement
  // (sans passer par Noter), l'ajoute au widget "En cours", puis recharge
  // la fiche sur place pour montrer la progression qui vient de démarrer.
  if (e.target.closest('#tds-start-btn')) {
    const data = tdsCurrentData;
    if (!data) return;
    const seasons = (data.seasons || [])
      .filter(s => s.season_number > 0 && s.episode_count > 0)
      .sort((a, b) => a.season_number - b.season_number);
    const first = seasons[0];
    if (!first) return;
    const shows = loadTvShows();
    let showEntry = shows.find(s => String(s.tmdbTvId) === String(data.id));
    if (!showEntry) {
      const genreStr = (data.genres || []).map(g => g.name).join(', ');
      showEntry = { tmdbTvId: data.id, title: data.name, poster_path: data.poster_path, genre: genreStr, seasons: {} };
      shows.push(showEntry);
    }
    const seasonKey = String(first.season_number);
    if (!showEntry.seasons[seasonKey]) {
      showEntry.seasons[seasonKey] = { seasonName: first.name, watchedEpisodes: [], totalEpisodes: first.episode_count };
    }
    saveTvShows(shows);
    showToast(`"${data.name} — ${first.name}" ajoutée à En cours`);
    if (typeof renderTvContinueList === 'function') renderTvContinueList();
    openTvDetailSheet(data.id);
    return;
  }

  // Bouton "Noter cette saison", affiché une fois tous les épisodes cochés
  // dans la grille — même navigation que rouvrir depuis l'Historique.
  const rateNowBtn = e.target.closest('.tds-rate-now-btn');
  if (rateNowBtn && tdsCurrentData) {
    const showId = rateNowBtn.dataset.showId;
    const seasonKey = rateNowBtn.dataset.seasonKey;
    const show = loadTvShows().find(s => String(s.tmdbTvId) === String(showId));
    if (show && show.seasons[seasonKey]) {
      const seasonData = show.seasons[seasonKey];
      closeTvDetailSheet();
      switchMobileNav('rating');
      setMediaType('tv');
      selectedShow = { id: show.tmdbTvId, name: show.title, poster_path: show.poster_path };
      document.getElementById('tv-search').value = show.title;
      document.getElementById('tv-season-picker').style.display = 'none';
      selectSeason({
        number: seasonKey, name: seasonData.seasonName,
        episodeCount: seasonData.totalEpisodes, poster: show.poster_path,
      });
    }
    return;
  }
});

initSwipeToClose(tdsEl, closeTvDetailSheet);
