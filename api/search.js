import { rateLimit } from './_rateLimit.js';
import { extractAnecdote, buildWikiCandidates } from './_wikiAnecdote.js';
import { seededPageAndIndex, seededFraction } from './_seededPick.js';

export default async function handler(req, res) {
  // Limite large : l'auto-complétion peut déclencher plusieurs appels par minute
  // en usage normal (une requête par pause de frappe), donc on reste généreux —
  // le but est de bloquer un abus/script, pas de gêner un usage normal.
  if (!rateLimit(req, res, { name: 'search', limit: 60, windowMs: 60_000 })) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({ error: 'Trop de requêtes, réessaie dans un instant.' });
  }

  const { query, id, providers, img, recommendations, trending, personId, personSearch, random, images, wikianecdote, wikiyear, dailyPick, weeklyRelease } = req.query;
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
    if (random) {
      // Cas 9 : "Surprends-moi" — un film totalement au hasard dans TOUTE la
      // base TMDb (pas seulement les tendances ou la watchlist). Une page
      // aléatoire parmi les films suffisamment connus (vote_count >= 100,
      // pour éviter de tomber sur des fiches quasi vides), puis un résultat
      // au hasard DANS cette page. Pas de cache : sinon le même choix
      // reviendrait à chaque appel tant que le CDN ne revalide pas.
      const randomPage = Math.floor(Math.random() * 200) + 1;
      const discoverRes = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=fr-FR&sort_by=popularity.desc&vote_count.gte=100&page=${randomPage}`
      );
      const discoverData = await discoverRes.json();
      const results = discoverData.results || [];
      const pick = results.length > 0 ? results[Math.floor(Math.random() * results.length)] : null;
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ result: pick });

    } else if (dailyPick) {
      // Cas : Film du Jour — tirage sur TOUTE la base TMDb suffisamment
      // connue (vote_count >= 100, ~4000 films sur 200 pages), pas
      // seulement les tendances de la semaine (biaisées vers les sorties
      // très récentes). La graine (nombre de jours depuis epoch, envoyée par
      // le client) rend le tirage STABLE pour la journée sur tous les
      // appareils, sans état côté serveur — voir _seededPick.js.
      const seed = parseInt(dailyPick, 10) || 0;
      const PAGE_SIZE = 20;
      const { page, index } = seededPageAndIndex(seed, 200, PAGE_SIZE);
      const discoverRes = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=fr-FR&sort_by=popularity.desc&vote_count.gte=100&page=${page}`
      );
      const discoverData = await discoverRes.json();
      const results = (discoverData.results || []).filter(m => m.poster_path);
      const pick = results.length > 0 ? results[index % results.length] : null;
      setCache(86400, 604800); // stable 24h : cohérent avec "même film toute la journée"
      return res.status(200).json({ result: pick });

    } else if (weeklyRelease) {
      // Cas : "Sortie de la semaine" (le mercredi, jour de sortie ciné en
      // France) — vraies sorties en salle actuelles, pas des tendances
      // mondiales. now_playing?region=FR est pensé pour exactement ça.
      // Graine = jours depuis epoch envoyée par le client (même valeur que
      // dailyPick) : stable pour tous les appareils sur UNE MÊME journée de
      // mercredi (le cache client est lui-même daté au jour, voir
      // FILM_DU_JOUR_KEY dans 11-discover.js — "Sortie de la semaine" ne
      // reste donc affichée que le mercredi, redevient Film du jour ensuite).
      const seed = parseInt(weeklyRelease, 10) || 0;
      const nowPlayingRes = await fetch(
        `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_KEY}&language=fr-FR&region=FR&page=1`
      );
      const nowPlayingData = await nowPlayingRes.json();
      const results = (nowPlayingData.results || []).filter(m => m.poster_path);
      const pick = results.length > 0 ? results[Math.floor(seededFraction(seed) * results.length)] : null;
      setCache(86400, 604800);
      return res.status(200).json({ result: pick });

    } else if (personSearch) {
      // Cas 8 : Recherche de personne PAR NOM (ex: "tarantino") — différent de
      // personId (fiche complète d'une personne déjà identifiée par son id) :
      // ici on cherche à identifier LA personne à partir d'un texte tapé dans
      // la barre de recherche, pour proposer sa filmographie.
      const psRes = await fetch(
        `https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&language=fr-FR&query=${encodeURIComponent(personSearch)}`
      );
      const psData = await psRes.json();
      setCache(3600, 21600);
      return res.status(200).json(psData);

    } else if (personId) {
      // Cas 7 : Fiche personne (réalisateur/acteur) — biographie + filmographie
      // complète (cast + équipe technique) en un seul appel TMDb.
      const personRes = await fetch(
        `https://api.themoviedb.org/3/person/${encodeURIComponent(personId)}?api_key=${TMDB_KEY}&language=fr-FR&append_to_response=movie_credits`
      );
      const personData = await personRes.json();
      setCache(86400, 172800); // 24h : une bio/filmographie change rarement d'un jour à l'autre
      return res.status(200).json(personData);

    } else if (trending) {
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
    } else if (images) {
      // Cas : toutes les affiches disponibles d'un film (pour le choix
      // d'affiche par l'utilisateur). include_image_language ratisse le
      // français, l'anglais ET les affiches sans texte (null) — les plus
      // belles variantes sont souvent dans cette dernière catégorie.
      const imagesRes = await fetch(
        `https://api.themoviedb.org/3/movie/${images}/images?api_key=${TMDB_KEY}&include_image_language=fr,en,null`
      );
      const imagesData = await imagesRes.json();
      // Ne renvoie que l'essentiel (chemins + langue), trié par note TMDb,
      // plafonné : inutile de transporter 80 variantes vers un téléphone.
      const posters = (imagesData.posters || [])
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        .slice(0, 24)
        .map(p => ({ file_path: p.file_path, iso_639_1: p.iso_639_1 }));
      setCache(86400, 604800); // 24h, revalidation jusqu'à 7 jours (catalogue très stable)
      return res.status(200).json({ posters });
    } else if (wikianecdote) {
      // Cas : une VRAIE anecdote pour le Film du Jour, via Wikipédia FR —
      // TMDb n'a pas d'endpoint "trivia" (voir 11-discover.js), donc on va la
      // chercher ailleurs plutôt que d'inventer du contenu. Licence CC-BY-SA :
      // réutilisation autorisée avec attribution (voir le lien renvoyé).
      // Pas de clé API nécessaire, Wikipédia est ouvert.
      const title = String(wikianecdote);
      const year = wikiyear ? String(wikiyear) : '';
      const candidates = buildWikiCandidates(title, year);

      async function fetchPlainExtract(pageTitle) {
        const url = `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&redirects=1&prop=extracts&explaintext=1&exsectionformat=wiki&format=json&origin=*`;
        const r = await fetch(url);
        const d = await r.json();
        const pages = d?.query?.pages;
        if (!pages) return null;
        const page = Object.values(pages)[0];
        if (!page || page.missing !== undefined || !page.extract || page.extract.length < 200) return null;
        return { extract: page.extract, resolvedTitle: page.title };
      }

      let result = null;
      for (const candidate of candidates) {
        try {
          const found = await fetchPlainExtract(candidate);
          if (!found) continue;
          const anecdote = extractAnecdote(found.extract);
          if (anecdote) {
            result = { anecdote, url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(found.resolvedTitle.replace(/ /g, '_'))}` };
            break;
          }
        } catch { /* essaie le candidat suivant */ }
      }

      // Le Film du Jour est stable 24h — inutile de refaire cette recherche
      // plusieurs fois pour le même film le même jour, même si le résultat
      // est "rien trouvé" (évite de marteler Wikipédia pour un film sans
      // section Anecdotes/Production).
      setCache(86400, 604800);
      return res.status(200).json(result || { anecdote: null });
    } else if (id) {
      // Cas 2 : Détails d'un film spécifique (infos + crédits)
      const detailsRes = await fetch(
        `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&language=fr-FR&append_to_response=credits,videos&include_video_language=fr,en,null`
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
