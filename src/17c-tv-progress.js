// Projections pures : aucun accès réseau, DOM ou écriture personnelle.
function tvToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function tvEpisodeAvailability(episode, today = tvToday()) {
  const date = episode?.air_date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'unknown';
  const parsed = new Date(date + 'T12:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return 'unknown';
  return date <= today ? 'available' : 'future';
}

function isTvPaused(show) {
  return typeof show?.paused === 'boolean' ? show.paused : Object.values(show?.seasons || {}).some(s => s.paused);
}

function computeTvSeasonProgress(localSeason, meta, today = tvToday()) {
  const episodes = [...new Map((meta?.episodes || []).filter(ep => Number.isInteger(ep.episode_number) && ep.episode_number > 0).map(ep => [ep.episode_number, ep])).values()]
    .sort((a, b) => a.episode_number - b.episode_number);
  const declared = meta ? Number(meta.episode_count) : Number(localSeason?.totalEpisodes);
  const total = Math.max(Number.isInteger(declared) && declared > 0 ? declared : 0, episodes.length);
  const valid = n => Number.isInteger(n) && n > 0 && (episodes.length === total && total > 0 ? episodes.some(ep => ep.episode_number === n) : n <= total);
  const seen = new Set((localSeason?.watchedEpisodes || []).map(Number).filter(valid));
  const remaining = episodes.filter(ep => !seen.has(ep.episode_number)).map(episode => ({ episode, availability: tvEpisodeAvailability(episode, today) }));
  const available = remaining.filter(ep => ep.availability === 'available');
  const future = remaining.filter(ep => ep.availability === 'future');
  const unknown = remaining.filter(ep => ep.availability === 'unknown');
  // Des numéros sans fiche épisode ne peuvent pas être déclarés diffusés.
  const missing = Math.max(0, total - seen.size - remaining.length);
  const complete = total > 0 && seen.size === total;
  const state = complete ? 'completed' : available.length ? 'in_progress'
    : missing || unknown.length || total === 0 ? 'unknown' : 'up_to_date';
  return { total, watched: seen.size, percent: total ? Math.min(100, Math.round(seen.size / total * 100)) : 0,
    complete, state, available, future, unknown, missing, next: available[0] || future[0] || unknown[0] || null };
}

function computeTvProgress(show, catalogue, today = tvToday()) {
  const metas = new Map((catalogue?.seasons || []).filter(s => Number.isInteger(s.season_number) && s.season_number > 0).map(s => [String(s.season_number), s]));
  const keys = [...new Set([...metas.keys(), ...Object.keys(show?.seasons || {}).filter(k => /^\d+$/.test(k) && Number(k) > 0)])].sort((a, b) => Number(a) - Number(b));
  const seasons = keys.map(key => ({ key, meta: metas.get(key), ...computeTvSeasonProgress(show?.seasons?.[key], metas.get(key), today) }));
  const known = Array.isArray(catalogue?.seasons) && !catalogue.incomplete;
  const sum = seasons.reduce((n, s) => n + s.total, 0);
  const total = known ? sum : Math.max(sum, Number(show?.catalogEpisodeTotal) || 0);
  const watched = seasons.reduce((n, s) => n + s.watched, 0);
  const nextOf = kind => {
    const season = seasons.find(s => s[kind].length);
    return season ? { ...season[kind][0], seasonKey: season.key, seasonName: season.meta?.name || show?.seasons?.[season.key]?.seasonName || `Saison ${season.key}`, totalEpisodes: season.total } : null;
  };
  const next = nextOf('available') || nextOf('future') || nextOf('unknown');
  const uncertain = !known || seasons.some(s => s.state === 'unknown' || !metas.has(s.key)) || !total;
  const allComplete = known && seasons.length > 0 && seasons.every(s => s.complete);
  const state = next?.availability === 'available' ? 'in_progress' : uncertain ? 'unknown'
    : allComplete && ['Ended', 'Canceled'].includes(catalogue?.status) ? 'completed' : 'up_to_date';
  const tracked = Object.keys(show?.seasons || {}).some(k => Number(k) > 0);
  const paused = isTvPaused(show);
  return { total, watched, percent: total ? Math.min(100, Math.round(watched / total * 100)) : 0,
    state, seasons, next, paused, inContinue: tracked && !paused && !show?.continueHidden && (!!next || uncertain) };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeTvProgress, computeTvSeasonProgress, tvEpisodeAvailability, isTvPaused };
}
