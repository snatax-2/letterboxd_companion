export default async function handler(req, res) {
  const { query, id, providers, img, recommendations } = req.query;
  const TMDB_KEY = process.env.TMDB_KEY;

  try {
    if (img) {
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
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(Buffer.from(buffer));

    } else if (id && recommendations) {
      // Cas 5 : Recommandations basées sur un film spécifique
      const recRes = await fetch(
        `https://api.themoviedb.org/3/movie/${id}/recommendations?api_key=${TMDB_KEY}&language=fr-FR`
      );
      const recData = await recRes.json();
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
      return res.status(200).json(detailsData);
    } else {
      // Cas 1 : Recherche par titre
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`
      );
      const searchData = await searchRes.json();
      return res.status(200).json(searchData);
    }
  } catch (error) {
    return res.status(500).json({ error: "Erreur lors de l'appel API" });
  }
}
