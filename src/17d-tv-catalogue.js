// Catalogue partagé, local et jetable. Il ne migre/crée jamais un suivi et
// n'est pas envoyé au cloud. Une panne conserve la dernière réponse connue.
const tvCatalogueMemory = new Map();
const tvCatalogueRequests = new Map();
const TV_CATALOGUE_TTL = 6 * 60 * 60 * 1000;
const TV_CATALOGUE_RETRY = 60 * 1000;

function isValidTvCataloguePart(data, id, seasonKey) {
  if (seasonKey == null) return typeof data?.name === 'string' && !!data.name
    && (data.id == null || String(data.id) === String(id))
    && Array.isArray(data.seasons) && data.seasons.every(s => s && Number.isInteger(s.season_number) && Number.isInteger(s.episode_count) && s.episode_count >= 0);
  return Array.isArray(data?.episodes) && data.episodes.every(ep => ep && Number.isInteger(ep.episode_number))
    && (data.season_number == null || String(data.season_number) === String(seasonKey));
}

function readTvCatalogueEntry(id) {
  const key = String(id);
  if (!tvCatalogueMemory.has(key)) {
    let entry = { version: 1, detail: null, seasons: {} };
    try {
      const saved = JSON.parse(localStorage.getItem('lbx_tv_catalogue_v1_' + key));
      if (saved?.version === 1 && saved.seasons && typeof saved.seasons === 'object' && !Array.isArray(saved.seasons)) {
        if (isValidTvCataloguePart(saved.detail?.data, id, null)) entry.detail = saved.detail;
        for (const [seasonKey, slot] of Object.entries(saved.seasons)) {
          if (/^[1-9]\d*$/.test(seasonKey) && isValidTvCataloguePart(slot?.data, id, seasonKey)) entry.seasons[seasonKey] = slot;
        }
      }
    } catch { /* cache jetable ; jamais les données personnelles */ }
    tvCatalogueMemory.set(key, entry);
  }
  return tvCatalogueMemory.get(key);
}

function tvCatalogueView(id, detailOverride) {
  const entry = readTvCatalogueEntry(id);
  const detail = detailOverride || entry.detail?.data;
  if (!detail) return null;
  return { ...detail, seasons: (detail.seasons || []).filter(s => s.season_number > 0).map(meta => ({
    ...meta, ...(entry.seasons[meta.season_number]?.data ? { episodes: entry.seasons[meta.season_number].data.episodes } : {}),
  })) };
}

function saveTvCatalogueCache(id) {
  try { localStorage.setItem('lbx_tv_catalogue_v1_' + id, JSON.stringify(readTvCatalogueEntry(id))); }
  catch { /* Le cache reste en mémoire si le quota est atteint. */ }
}

async function fetchTvCataloguePart(id, seasonKey, { force = false } = {}) {
  const entry = readTvCatalogueEntry(id);
  const part = seasonKey == null ? entry.detail : entry.seasons[seasonKey];
  const key = `${id}:${seasonKey ?? 'detail'}`;
  if (tvCatalogueRequests.has(key)) return tvCatalogueRequests.get(key);
  if (!force && part?.data && Date.now() - part.fetchedAt < TV_CATALOGUE_TTL) return { data: part.data, stale: false };
  if (!force && part?.retryAt > Date.now()) {
    if (part.data) return { data: part.data, stale: true };
    throw new Error('Catalogue temporairement indisponible. Réessaie dans un instant.');
  }
  const request = (async () => {
    const previous = part?.data;
    const wasStale = previous && Date.now() - part.fetchedAt >= TV_CATALOGUE_TTL;
    const slot = part || {};
    if (seasonKey == null) entry.detail = slot; else entry.seasons[seasonKey] = slot;
    try {
      const url = seasonKey == null ? `/api/search?tvId=${encodeURIComponent(id)}` : `/api/search?tvSeasonShowId=${encodeURIComponent(id)}&tvSeasonNumber=${encodeURIComponent(seasonKey)}`;
      const data = await fetch(url).then(readApiJson);
      if (!isValidTvCataloguePart(data, id, seasonKey)) throw new Error('Réponse catalogue incomplète.');
      if (seasonKey == null) {
        for (const meta of data.seasons) {
          const oldMeta = previous?.seasons.find(s => s.season_number === meta.season_number);
          const cachedSeason = entry.seasons[meta.season_number];
          if (cachedSeason && oldMeta?.episode_count !== meta.episode_count) {
            cachedSeason.fetchedAt = 0;
            cachedSeason.retryAt = 0;
          }
        }
      }
      slot.data = data;
      slot.fetchedAt = Date.now();
      slot.retryAt = 0;
      saveTvCatalogueCache(id);
      if (wasStale || tvStableJson(previous) !== tvStableJson(data)) notifyTvViewsChanged([id], 'catalogue');
      return { data, stale: false };
    } catch (error) {
      slot.retryAt = Date.now() + TV_CATALOGUE_RETRY;
      if (previous) return { data: previous, stale: true };
      throw error;
    }
  })();
  tvCatalogueRequests.set(key, request);
  try { return await request; } finally { tvCatalogueRequests.delete(key); }
}

async function loadTvCatalogue(show, options = {}) {
  const id = show.tmdbTvId;
  let stale = false;
  try { stale = (await fetchTvCataloguePart(id, null, options)).stale; }
  catch { stale = true; }
  const catalogue = tvCatalogueView(id);
  // On charge les saisons utiles au suivi, au plus trois requêtes à la fois.
  // Une saison complètement vue n'a pas besoin de dates pour connaître son état.
  const metas = catalogue?.seasons || Object.entries(show.seasons || {}).map(([key, s]) => ({ season_number: Number(key), episode_count: s.totalEpisodes }));
  const pending = metas.filter(meta => meta.season_number > 0 && meta.episode_count > 0
    && !computeTvSeasonProgress(show.seasons?.[meta.season_number], meta).complete);
  for (let i = 0; i < pending.length; i += 3) {
    await Promise.all(pending.slice(i, i + 3).map(async meta => {
      try { if ((await fetchTvCataloguePart(id, String(meta.season_number), options)).stale) stale = true; }
      catch { stale = true; }
    }));
  }
  // Même sans fiche globale, les anciennes saisons restent consultables.
  const result = tvCatalogueView(id);
  return { catalogue: result, stale };
}

function getTvProgress(show, detailOverride) {
  const id = show?.tmdbTvId ?? detailOverride?.id;
  const entry = readTvCatalogueEntry(id);
  const catalogue = tvCatalogueView(id, detailOverride) || { incomplete: true, seasons: Object.entries(show?.seasons || {}).map(([key, s]) => ({
    season_number: Number(key), episode_count: s.totalEpisodes, name: s.seasonName,
    episodes: entry.seasons[key]?.data?.episodes,
  })) };
  const progress = computeTvProgress(show, catalogue);
  if (!detailOverride && entry.detail?.data && Date.now() - entry.detail.fetchedAt >= TV_CATALOGUE_TTL && !progress.next) {
    progress.state = 'unknown';
    progress.inContinue = Object.keys(show?.seasons || {}).length > 0 && !isTvPaused(show) && !show?.continueHidden;
  }
  return progress;
}

function getTvSeasonProgress(showId, seasonKey, localSeason, meta) {
  const fromCatalogue = tvCatalogueView(showId)?.seasons.find(s => String(s.season_number) === String(seasonKey));
  return computeTvSeasonProgress(localSeason, fromCatalogue || meta);
}

function tvProgressLabel(progress) {
  return ({ completed: 'Terminée', up_to_date: 'À jour', in_progress: 'En cours', unknown: 'À vérifier' })[progress.state];
}

async function setTvFollowingState(showId, { paused, hidden }) {
  return mutateTvShows(shows => {
    const show = shows.find(s => String(s.tmdbTvId) === String(showId));
    if (!show) throw new Error('Cette série a été retirée.');
    if (paused != null) {
      show.paused = paused;
      if (!paused) Object.values(show.seasons).forEach(s => { s.paused = false; });
    }
    if (hidden != null) show.continueHidden = hidden;
    return show;
  });
}

// Commande commune aux trois entrées : checklist, À regarder et widget.
async function setTvEpisodesWatched(showId, seasonKey, numbers, watched, metadata) {
  const initial = loadTvShows().find(s => String(s.tmdbTvId) === String(showId));
  let seasonData;
  if (watched) {
    seasonData = (await fetchTvCataloguePart(showId, String(seasonKey))).data;
    for (const number of numbers) {
      const episode = seasonData.episodes.find(ep => ep.episode_number === number);
      if (!episode || tvEpisodeAvailability(episode) !== 'available') throw new Error('Épisode non disponible : validation impossible avant sa diffusion.');
    }
  }
  return mutateTvShows(shows => {
    let show = shows.find(s => String(s.tmdbTvId) === String(showId));
    if (initial && show && initial._sync?.createdAt !== show._sync?.createdAt && show._sync?.createdAt) throw new Error('Ce suivi a été recommencé : rouvre la fiche.');
    if (!show) {
      if (!watched || initial || !metadata || String(metadata.id) !== String(showId)) throw new Error('Cette série a été retirée : rouvre sa fiche.');
      show = getOrCreateTvShow(shows, { id: showId, name: metadata.name, poster_path: metadata.poster_path,
        genres: (metadata.genres || []).map(g => g.name).join(', ') });
    }
    if (!show.seasons[seasonKey]) {
      if (!watched || initial?.seasons[seasonKey]) throw new Error('Cette saison a été retirée : rouvre sa fiche.');
      const meta = tvCatalogueView(showId)?.seasons.find(s => String(s.season_number) === String(seasonKey));
      show.seasons[seasonKey] = { seasonName: meta?.name || `Saison ${seasonKey}`, watchedEpisodes: [], totalEpisodes: Math.max(meta?.episode_count || 0, seasonData.episodes.length) };
    }
    const season = show.seasons[seasonKey];
    if (initial?.seasons[seasonKey] && initial.seasons[seasonKey]._sync?.createdAt !== season._sync?.createdAt && season._sync?.createdAt) throw new Error('Cette saison a été recommencée : rouvre la fiche.');
    for (const number of numbers) {
      if (watched && !season.watchedEpisodes.includes(number)) season.watchedEpisodes.push(number);
      if (!watched) season.watchedEpisodes = season.watchedEpisodes.filter(n => n !== number);
    }
    return show;
  }, { recordWatching: true });
}
