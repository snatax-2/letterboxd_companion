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

async function editorialCopy(films, geminiKey) {
  const fallback = { title: 'Regards croisés', intro: 'Un film américain et trois regards venus d’ailleurs, réunis ce mois-ci par leur exigence de cinéma.' };
  if (!geminiKey) return fallback;
  const catalogue = films.map(f => `- ${f.title} (${f.country}, ${f.release_date?.slice(0, 4) || 'année inconnue'}) : ${f.overview || 'synopsis indisponible'}`).join('\n');
  const prompt = `Tu es l’éditeur cinéphile de LUDEX. À partir de ces quatre films (un américain et trois étrangers), trouve un lien thématique réellement défendable. Réponds uniquement par JSON : {"title":"2 à 7 mots","intro":"une phrase de 180 caractères maximum"}. N’invente aucun fait.\n\n${catalogue}`;
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
      method: 'POST', headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 120 } }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return fallback;
    const raw = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(raw || '{}');
    if (typeof parsed.title !== 'string' || typeof parsed.intro !== 'string') return fallback;
    return { title: parsed.title.trim().slice(0, 80), intro: parsed.intro.trim().slice(0, 180) };
  } catch { return fallback; }
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
    const film = seededShuffle(candidates, seedForMonth(`${month}-${code}`))[0];
    return film ? { ...film, country } : null;
  }));
  const films = responses.map(result => result.status === 'fulfilled' ? result.value : null).filter(Boolean);
  if (films.length < 4) return res.status(502).json({ error: 'Sélection mensuelle indisponible.' });
  const editorial = await editorialCopy(films, process.env.GEMINI_API_KEY);
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({ month, editorial, films });
}
