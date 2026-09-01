import { rateLimit } from './_rateLimit.js';

const COUNTRIES = [
  ['FR', 'France'], ['JP', 'Japon'], ['KR', 'Corée du Sud'], ['IT', 'Italie'],
  ['ES', 'Espagne'], ['IN', 'Inde'], ['MX', 'Mexique'], ['AR', 'Argentine'],
  ['IR', 'Iran'], ['SE', 'Suède'], ['DE', 'Allemagne'], ['GB', 'Royaume-Uni'],
];
const USA = ['US', 'États-Unis'];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function seedForMonth(month) {
  return [...month].reduce((seed, character) => ((seed * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
}
function seededShuffle(items, seed) {
  const result = [...items];
  let state = seed || 1;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`TMDb ${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  if (!(await rateLimit(req, res, { name: 'monthly-selection', limit: 20, windowMs: 3600_000 }))) return res.status(429).json({ error: 'Trop de requêtes.' });
  const month = typeof req.query?.month === 'string' && MONTH_RE.test(req.query.month)
    ? req.query.month : new Date().toISOString().slice(0, 7);
  const tmdbKey = process.env.TMDB_KEY;
  if (!tmdbKey) return res.status(503).json({ error: 'Sélection non configurée.' });
  const chosenCountries = [USA, ...seededShuffle(COUNTRIES, seedForMonth(month)).slice(0, 3)];
  const responses = await Promise.allSettled(chosenCountries.map(async ([code, country]) => {
    const data = await fetchJson(`https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&language=fr-FR&sort_by=vote_average.desc&vote_average.gte=7&vote_count.gte=250&with_origin_country=${code}&page=1`);
    const candidates = (data.results || []).filter(film => film.poster_path && film.vote_average >= 7);
    return seededShuffle(candidates, seedForMonth(`${month}-${code}`)).slice(0, 8)
      .map(film => ({ ...film, country, countryCode: code }));
  }));
  const pools = responses.map(result => result.status === 'fulfilled' ? result.value : []).filter(pool => pool.length > 0);
  if (pools.length !== 4) return res.status(502).json({ error: 'Sélection mensuelle indisponible.' });
  // Un film par pays, stable pour le mois : rapide, prévisible et sans IA.
  const films = pools.map(pool => pool[0]);
  res.setHeader('Cache-Control', 's-maxage=2592000, stale-while-revalidate=604800');
  return res.status(200).json({ month, editorial: null, films });
}
