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

const FALLBACK_EDITORIAL = {
  title: 'Regards croisés',
  intro: 'Un film américain et trois regards venus d’ailleurs, réunis ce mois-ci par leur exigence de cinéma.',
};
// Gemini 3.5 Flash est le modèle Flash courant ; 2.5 reste un repli pour les
// projets dont l'accès au modèle le plus récent n'est pas encore activé.
const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function parseGeminiJson(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) throw new SyntaxError('Objet JSON Gemini absent');
  return JSON.parse(text.slice(firstBrace, lastBrace + 1));
}

function validGeminiSelection(choice, candidates) {
  const selectedIds = Array.isArray(choice?.filmIds) ? choice.filmIds.map(String) : [];
  if (selectedIds.length !== 4 || new Set(selectedIds).size !== 4) return null;
  const byId = new Map(candidates.map(film => [String(film.id), film]));
  const films = selectedIds.map(id => byId.get(id));
  if (films.some(film => !film)) return null;
  const usaCount = films.filter(film => film.countryCode === USA[0]).length;
  const foreignCountries = films.filter(film => film.countryCode !== USA[0]).map(film => film.countryCode);
  if (usaCount !== 1 || foreignCountries.length !== 3 || new Set(foreignCountries).size !== 3) return null;
  if (typeof choice.title !== 'string' || typeof choice.intro !== 'string') return null;
  const reasons = choice.reasons && typeof choice.reasons === 'object' ? choice.reasons : {};
  return {
    films,
    editorial: {
      title: choice.title.trim().slice(0, 80),
      intro: choice.intro.trim().slice(0, 180),
      reasons: Object.fromEntries(films.map(film => [String(film.id), typeof reasons[String(film.id)] === 'string' ? reasons[String(film.id)].trim().slice(0, 180) : ''])),
    },
  };
}

async function selectWithGemini(candidates, geminiKey) {
  if (!geminiKey) {
    console.warn('[monthly-selection] Gemini indisponible : clé non configurée pour cet environnement.');
    return null;
  }
  const catalogue = candidates.map(film => JSON.stringify({
    id: film.id, pays: film.country, titre: film.title, annee: film.release_date?.slice(0, 4) || null,
    noteTMDb: film.vote_average, synopsis: (film.overview || 'Synopsis indisponible').slice(0, 360),
  })).join('\n');
  const prompt = `Tu es l’éditeur cinéphile de LUDEX. Choisis exactement quatre films dans le vivier ci-dessous pour former une sélection mensuelle cohérente, fondée sur un lien thématique réellement défendable. Contraintes absolues : exactement un film des États-Unis ; exactement trois films étrangers, chacun issu d’un pays différent ; utilise seulement les identifiants du vivier ; n’invente aucun fait. Réponds uniquement par ce JSON valide : {"title":"2 à 7 mots","intro":"une phrase de 180 caractères maximum","filmIds":[123,456,789,101],"reasons":{"123":"justification courte"}}. Les quatre identifiants doivent être différents et chaque film doit avoir une justification courte.\n\nVIVIER :\n${catalogue}`;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST', headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 650 } }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          console.warn(`[monthly-selection] Gemini ${model} a refusé la sélection (HTTP ${response.status}).`);
          if (response.status >= 500 && attempt === 0) { await delay(350); continue; }
          break;
        }
        const raw = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = parseGeminiJson(raw);
        const selection = validGeminiSelection(parsed, candidates);
        if (!selection) console.warn('[monthly-selection] Réponse Gemini rejetée : format ou contraintes de sélection invalides.');
        return selection;
      } catch (error) {
        console.warn(`[monthly-selection] Gemini ${model} indisponible : ${error?.name || 'erreur inattendue'}.`);
        if (attempt === 0) { await delay(350); continue; }
      }
    }
  }
  return null;
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
  const fallbackFilms = pools.map(pool => pool[0]);
  const chosen = await selectWithGemini(pools.flat(), process.env.GEMINI_API_KEY);
  const selection = chosen || { films: fallbackFilms, editorial: FALLBACK_EDITORIAL };
  const films = selection.films.map(film => ({ ...film, editorialReason: selection.editorial.reasons?.[String(film.id)] || '' }));
  // Une même URL de mois conserve le choix éditorial ; le cache évite les appels Gemini répétitifs.
  res.setHeader('Cache-Control', 's-maxage=2592000, stale-while-revalidate=604800');
  return res.status(200).json({ month, editorial: selection.editorial, films });
}
