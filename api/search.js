import { rateLimit } from './_rateLimit.js';

export default async function handler(req, res) {
  // Limite large : l'auto-complétion peut déclencher plusieurs appels par minute
  // en usage normal (une requête par pause de frappe), donc on reste généreux —
  // le but est de bloquer un abus/script, pas de gêner un usage normal.
  if (!rateLimit(req, res, { name: 'search', limit: 60, windowMs: 60_000 })) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({ error: 'Trop de requêtes, réessaie dans un instant.' });
  }

  const { query, id, providers, img, recommendations, trending } = req.query;
  const TMDB_KEY = process.env.TMDB_KEY;

  // Met en cache la réponse sur le CDN Vercel pendant `maxAge` secondes, et continue
  // à servir une version (légèrement) périmée jusqu'à `staleWhileRevalidate` secondes
  // pendant que Vercel va chercher une version fraîche en arrière-plan.
  // -> évite de re-solliciter TMDb à chaque requête identique et réduit le risque
  //    d'atteindre le quota de l'API.
  function setCache(maxAge, staleWhileRevalidate) {
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );
  }

  try {
    if (trending) {
      // Cas 6 : Tendances du moment (carrousel Découvrir), pas liées à
      // l'historique de l'utilisateur — TMDb "trending/movie/week".
      const trendRes = await fetch(
        `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}&language=fr-FR`
      );
      const trendData = await trendRes.json();
      setCache(10800, 43200); // 3h, revalidation jusqu'à 12h (les tendances évoluent dans la journée)
      return res.status(200).json(trendData);

    } else if (img) {
      // Cas 4 : Proxy image (contourne CORS TMDb sur mobile Chrome)
      // Seules les URLs image.tmdb.org sont autorisées
      const decoded = decodeURIComponent(img);
      if (!decoded.startsWith('https://image.tmdb.org/')) {
        return res.status(403).json({ error: 'URL non autorisée' });
      }
      const imgRes = await fetch(decoded);
      if (!imgRes.ok) return res.status(imgRes.status).end();
      const buffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      // Les images TMDb sont immuables pour un chemin donné : cache long.
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.status(200).send(Buffer.from(buffer));

    } else if (id && recommendations) {
      // Cas 5 : Recommandations basées sur un film spécifique
      const recRes = await fetch(
        `https://api.themoviedb.org/3/movie/${id}/recommendations?api_key=${TMDB_KEY}&language=fr-FR`
      );
      const recData = await recRes.json();
      setCache(43200, 604800); // 12h, revalidation jusqu'à 7 jours
      return res.status(200).json(recData);

    } else if (id && providers) {
      // Cas 3 : Watch providers pour un film donné, filtrés par région (ex: BE)
      const provRes = await fetch(
        `https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=${TMDB_KEY}`
      );
      const provData = await provRes.json();
      // Retourner uniquement la région demandée pour alléger la réponse
      const region = providers; // ex: 'BE'
      const regionData = provData.results?.[region] || null;
      setCache(21600, 86400); // 6h, revalidation jusqu'à 1 jour (providers changent plus souvent)
      return res.status(200).json({
        'watch/providers': {
          results: {
            [region]: regionData
          }
        }
      });
    } else if (id) {
      // Cas 2 : Détails d'un film spécifique (infos + crédits)
      const detailsRes = await fetch(
        `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&language=fr-FR&append_to_response=credits`
      );
      const detailsData = await detailsRes.json();
      setCache(21600, 604800); // 6h, revalidation jusqu'à 7 jours (infos très stables)
      return res.status(200).json(detailsData);
    } else {
      // Cas 1 : Recherche par titre
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`
      );
      const searchData = await searchRes.json();
      setCache(3600, 86400); // 1h, revalidation jusqu'à 1 jour
      return res.status(200).json(searchData);
    }
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store'); // ne jamais mettre en cache une erreur
    return res.status(500).json({ error: "Erreur lors de l'appel API" });
  }
}
