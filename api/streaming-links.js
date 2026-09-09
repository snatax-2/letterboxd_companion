import { rateLimit } from './_rateLimit.js';

const VALID_MEDIA_TYPES = new Set(['movie', 'tv']);
const VALID_REGIONS = new Set(['BE']);
const CACHE_CONTROL = 's-maxage=2592000, stale-while-revalidate=604800';

function safeUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Retourne uniquement les destinations web sûres associées au titre. La clé
 * Watchmode reste côté serveur : elle n'apparait ni dans le navigateur, ni
 * dans l'URL de la requête, ni dans les logs Vercel.
 */
export default async function handler(req, res) {
  if (!(await rateLimit(req, res, { name: 'streaming-links', limit: 30, windowMs: 60_000 }))) {
    return res.status(429).json({ error: 'Trop de requêtes.' });
  }

  const tmdbId = String(req.query?.id || '');
  const mediaType = String(req.query?.mediaType || 'movie');
  const region = String(req.query?.region || 'BE').toUpperCase();
  if (!/^\d+$/.test(tmdbId) || !VALID_MEDIA_TYPES.has(mediaType) || !VALID_REGIONS.has(region)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'Paramètres de streaming invalides.' });
  }

  const apiKey = process.env.WATCHMODE_API_KEY;
  if (!apiKey) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Liens de streaming non configurés.' });
  }

  try {
    const titleId = `${mediaType}-${tmdbId}`;
    const response = await fetch(`https://api.watchmode.com/v1/title/${titleId}/sources/?regions=${region}`, {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Watchmode ${response.status}`);
    const data = await response.json();
    const links = (Array.isArray(data) ? data : [])
      .filter(source => source?.region === region)
      .map(source => ({
        name: typeof source.name === 'string' ? source.name : '',
        type: typeof source.type === 'string' ? source.type : '',
        url: safeUrl(source.web_url),
      }))
      .filter(source => source.name && source.url);

    res.setHeader('Cache-Control', CACHE_CONTROL);
    return res.status(200).json({ links });
  } catch (error) {
    // La fiche garde les disponibilités TMDb : une indisponibilité de
    // Watchmode ne doit jamais faire disparaître les plateformes affichées.
    console.warn('Liens Watchmode indisponibles:', error instanceof Error ? error.message : 'erreur inconnue');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Liens de streaming indisponibles.' });
  }
}
