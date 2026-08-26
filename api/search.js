import { rateLimit } from './_rateLimit.js';
import { seededPageAndIndex, seededFraction } from './_seededPick.js';

export default async function handler(req, res) {
  // Limite large : l'auto-complétion peut déclencher plusieurs appels par minute
  // en usage normal (une requête par pause de frappe), donc on reste généreux —
  // le but est de bloquer un abus/script, pas de gêner un usage normal.
  if (!(await rateLimit(req, res, { name: 'search', limit: 60, windowMs: 60_000 }))) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({ error: 'Trop de requêtes, réessaie dans un instant.' });
  }

  const { query, id, providers, img, recommendations, trending, personId, personSearch, random, images, tvImages, dailyPick, weeklyRelease, decadeTop, collectionId, studioId, countryCode, keywordId, onThisDay, imdbId, tvQuery, tvId, tvSeasonShowId, tvSeasonNumber, mediaType, topRated } = req.query;
  // Ludex 2.0 : le toggle Films/Séries de Découvrir doit pouvoir demander
  // la variante série de ces trois endpoints (choix du jour, classiques par
  // décennie, cinéma international) — mediaType='tv' bascule discover/movie
  // vers discover/tv, sans dupliquer chaque branche. 'movie' par défaut,
  // comportement inchangé si le paramètre est absent.
  const tmdbMediaType = mediaType === 'tv' ? 'tv' : 'movie';
  const TMDB_KEY = process.env.TMDB_KEY;
  const OMDB_KEY = process.env.OMDB_KEY;

  // Les identifiants TMDb partent dans le CHEMIN de l'URL appelée
  // (…/movie/${id}/recommendations). Sans validation, une valeur comme
  // `550?api_key=…` y injecte ses propres paramètres de requête, et
  // `550/lists` atteint un endpoint qu'on n'a jamais voulu exposer.
  // encodeURIComponent() ne conviendrait pas ici : il échapperait les `/`
  // légitimes d'autres usages et masquerait une entrée absurde au lieu de la
  // refuser. Ces identifiants sont TOUS numériques — on valide, on n'encode pas.
  // (query, tvQuery, personSearch et imdbId, eux, sont du texte libre : ils
  // passent déjà par encodeURIComponent plus bas, ce qui est correct pour eux.)
  const tmdbId = (value) => (/^[0-9]{1,12}$/.test(String(value)) ? String(value) : null);
  const badId = () => {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'Identifiant invalide.' });
  };

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
      //
      // Bug corrigé (signalé par l'utilisateur : "ça change 2 à 3 fois par
      // jour") : le tri était fait par popularity.desc — une donnée TMDb
      // qui bouge en continu au fil de la journée (visionnages/recherches
      // dans le monde entier). Même graine, même page, même index, mais si
      // le CLASSEMENT sous-jacent a bougé entre deux consultations, ce
      // n'est plus le même film à cette position. "Même position = même
      // film" n'est vrai que si le classement est figé — la date de
      // sortie, elle, ne change jamais dans la journée.
      const seed = parseInt(dailyPick, 10) || 0;
      const PAGE_SIZE = 20;
      const { page, index } = seededPageAndIndex(seed, 200, PAGE_SIZE);
      const dateField = tmdbMediaType === 'tv' ? 'first_air_date' : 'primary_release_date';
      const discoverRes = await fetch(
        `https://api.themoviedb.org/3/discover/${tmdbMediaType}?api_key=${TMDB_KEY}&language=fr-FR&sort_by=${dateField}.desc&vote_count.gte=100&page=${page}`
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
      const safePersonId = tmdbId(personId);
      if (!safePersonId) return badId();
      const personRes = await fetch(
        `https://api.themoviedb.org/3/person/${safePersonId}?api_key=${TMDB_KEY}&language=fr-FR&append_to_response=movie_credits`
      );
      const personData = await personRes.json();
      setCache(86400, 172800); // 24h : une bio/filmographie change rarement d'un jour à l'autre
      return res.status(200).json(personData);

    } else if (topRated) {
      // Ludex 2.0 : carrousel "Top 100 films TMDb" (Découvrir) — classement
      // officiel des mieux notés selon TMDb (votes significatifs déjà
      // filtrés côté TMDb), remplace l'ancien widget "Classiques à
      // explorer" qui vivait dans Profil et se basait sur l'Historique de
      // l'utilisateur. Celui-ci est purement éditorial : aucun lien avec
      // les données de l'utilisateur, une simple vitrine à parcourir.
      const topRatedRes = await fetch(
        `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_KEY}&language=fr-FR&page=1`
      );
      const topRatedData = await topRatedRes.json();
      setCache(86400, 172800); // 24h : un classement "tous temps" ne bouge pas d'un jour à l'autre
      return res.status(200).json(topRatedData);

    } else if (trending) {
      // Cas 6 : Tendances du moment (carrousel Découvrir), pas liées à
      // l'historique de l'utilisateur — "trending/all/week" mélange films ET
      // séries dans une même réponse (chaque item porte déjà media_type
      // 'movie'/'tv' côté TMDb), au lieu de deux appels séparés à fusionner
      // nous-mêmes (Vers Ludex 2.0 §06 : "Tendances mixte films/séries").
      const trendRes = await fetch(
        `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_KEY}&language=fr-FR`
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
      // Cas 5 : Recommandations basées sur un film ou une série spécifique —
      // mediaType='tv' bascule vers l'endpoint séries (utilisé par le
      // carrousel "D'après ton historique" quand le toggle Séries est actif).
      const safeId = tmdbId(id);
      if (!safeId) return badId();
      const recRes = await fetch(
        `https://api.themoviedb.org/3/${tmdbMediaType}/${safeId}/recommendations?api_key=${TMDB_KEY}&language=fr-FR`
      );
      const recData = await recRes.json();
      setCache(43200, 604800); // 12h, revalidation jusqu'à 7 jours
      return res.status(200).json(recData);

    } else if (id && providers) {
      // Cas 3 : Watch providers pour un film OU une série, filtrés par
      // région (ex: BE) — mediaType='tv' bascule vers l'endpoint séries,
      // même paramètre déjà utilisé ailleurs dans ce fichier.
      const safeId = tmdbId(id);
      if (!safeId) return badId();
      const provRes = await fetch(
        `https://api.themoviedb.org/3/${tmdbMediaType}/${safeId}/watch/providers?api_key=${TMDB_KEY}`
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
      const safeImagesId = tmdbId(images);
      if (!safeImagesId) return badId();
      const imagesRes = await fetch(
        `https://api.themoviedb.org/3/movie/${safeImagesId}/images?api_key=${TMDB_KEY}&include_image_language=fr,en,null`
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
    } else if (tvImages) {
      // Cas série du même choix d'affiche que les films (voir "images"
      // juste au-dessus) — même logique, juste /tv/ au lieu de /movie/.
      const safeTvImagesId = tmdbId(tvImages);
      if (!safeTvImagesId) return badId();
      const tvImagesRes = await fetch(
        `https://api.themoviedb.org/3/tv/${safeTvImagesId}/images?api_key=${TMDB_KEY}&include_image_language=fr,en,null`
      );
      const tvImagesData = await tvImagesRes.json();
      const tvPosters = (tvImagesData.posters || [])
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        .slice(0, 24)
        .map(p => ({ file_path: p.file_path, iso_639_1: p.iso_639_1 }));
      setCache(86400, 604800);
      return res.status(200).json({ posters: tvPosters });
    } else if (tvId) {
      // Cas : détails d'une série + liste de ses saisons (Phase 1 du
      // suivi séries — recherche + sélection de saison uniquement, le
      // détail épisode par épisode viendra en Phase 2, pas encore ici).
      const safeTvId = tmdbId(tvId);
      if (!safeTvId) return badId();
      const tvRes = await fetch(
        `https://api.themoviedb.org/3/tv/${safeTvId}?api_key=${TMDB_KEY}&language=fr-FR&append_to_response=credits,videos,external_ids`
      );
      const tvData = await tvRes.json();
      setCache(21600, 604800); // 6h, comme les détails d'un film — aussi stable
      return res.status(200).json(tvData);

    } else if (tvSeasonShowId && tvSeasonNumber) {
      // Cas : liste des épisodes d'UNE saison précise (Phase 2 — suivi
      // épisode par épisode). Deux paramètres nécessaires (l'ID de la
      // série ET le numéro de saison), TMDb n'expose pas cette liste
      // autrement que via cette combinaison dans l'URL.
      const safeShowId = tmdbId(tvSeasonShowId);
      const safeSeasonNo = tmdbId(tvSeasonNumber);
      if (!safeShowId || !safeSeasonNo) return badId();
      const seasonRes = await fetch(
        `https://api.themoviedb.org/3/tv/${safeShowId}/season/${safeSeasonNo}?api_key=${TMDB_KEY}&language=fr-FR`
      );
      const seasonData = await seasonRes.json();
      setCache(21600, 604800); // 6h — une liste d'épisodes ne change plus une fois la saison sortie
      return res.status(200).json(seasonData);

    } else if (tvQuery) {
      // Cas : recherche de série (équivalent de la recherche de film,
      // voir plus bas `else` — mais TMDb sépare bien films et séries,
      // deux catalogues distincts).
      const tvSearchRes = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(tvQuery)}&language=fr-FR`
      );
      const tvSearchData = await tvSearchRes.json();
      setCache(3600, 86400); // 1h, comme la recherche de film
      return res.status(200).json(tvSearchData);

    } else if (imdbId) {
      // Cas : notes IMDb/Rotten Tomatoes/Metacritic (OMDb), affichées
      // uniquement sur une fiche film ouverte explicitement (jamais sur les
      // grilles/carrousels qui listent plein de films en même temps) — le
      // même mécanisme d'ouverture de fiche couvre à la fois "un film noté"
      // et "une fiche que je décide d'ouvrir", donc rien à distinguer côté
      // logique. Clé optionnelle : si OMDB_KEY n'est pas encore configurée
      // (l'utilisateur doit créer la sienne sur omdbapi.com), repli silencieux
      // plutôt qu'une erreur — la fiche film reste utilisable sans ces notes.
      if (!OMDB_KEY) {
        setCache(3600, 86400);
        return res.status(200).json({ ratings: null });
      }
      try {
        const omdbRes = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${OMDB_KEY}`);
        const omdbData = await omdbRes.json();
        setCache(21600, 604800); // 6h, comme les détails d'un film — aussi stable
        return res.status(200).json({ ratings: omdbData.Response === 'True' ? (omdbData.Ratings || []) : null });
      } catch {
        setCache(3600, 86400);
        return res.status(200).json({ ratings: null });
      }

    } else if (onThisDay) {
      // Cas : "Ce jour-là" (Découvrir) — anniversaires de sortie. TMDb ne
      // permet PAS de filtrer "tous les films sortis un 7 août, toutes
      // années confondues" en un seul appel (leurs filtres de date
      // fonctionnent par plage continue, pas par jour répété chaque année)
      // — d'où le choix de se limiter aux anniversaires RONDS (10/20/30/40/
      // 50 ans) plutôt que de vérifier chaque année une par une (ce qui
      // aurait demandé des dizaines d'appels). Une requête par palier,
      // sur la date exacte (même date en borne basse et haute).
      const today = new Date();
      const month = today.getUTCMonth() + 1;
      const day = today.getUTCDate();
      const currentYear = today.getUTCFullYear();
      const isFeb29 = month === 2 && day === 29;

      const results = await Promise.all([10, 20, 30, 40, 50].map(async (yearsAgo) => {
        const targetYear = currentYear - yearsAgo;
        // Cas particulier 29 février : certaines années cibles ne sont pas
        // bissextiles — l'anniversaire "exact" n'existe pas cette année-là,
        // on saute plutôt que de risquer un débordement silencieux sur le
        // 1er mars (comportement par défaut de Date).
        const isTargetLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
        if (isFeb29 && !isTargetLeap) return null;
        const dateStr = `${targetYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        try {
          const r = await fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=fr-FR&primary_release_date.gte=${dateStr}&primary_release_date.lte=${dateStr}&sort_by=popularity.desc`
          );
          const data = await r.json();
          const films = (data.results || []).filter(m => m.poster_path).slice(0, 4);
          return films.length ? { yearsAgo, year: targetYear, films } : null;
        } catch {
          return null;
        }
      }));

      // 24h de cache seulement : contrairement aux décennies/studios (qui ne
      // bougent presque jamais), "aujourd'hui" change chaque jour.
      setCache(86400, 172800);
      return res.status(200).json({ anniversaries: results.filter(Boolean) });

    } else if (keywordId) {
      // Cas : exploration par thème (Découvrir) — mot-clé TMDb, indépendant
      // des genres classiques (voir CURATED_THEMES). Tri par popularité
      // (esprit "parcourir/découvrir", pas "les mieux notés" comme les
      // décennies) avec un seuil de votes léger pour écarter le bruit.
      const kid = parseInt(keywordId, 10);
      if (!kid) {
        setCache(3600, 86400);
        return res.status(200).json({ results: [] });
      }
      const pages = await Promise.all([1, 2].map(page =>
        fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=fr-FR&sort_by=popularity.desc&vote_count.gte=50&with_keywords=${kid}&page=${page}`)
          .then(r => r.json()).catch(() => ({ results: [] }))
      ));
      const merged = pages.flatMap(p => p.results || []).filter(m => m.poster_path);
      setCache(604800, 2592000);
      return res.status(200).json({ results: merged.slice(0, 40) });

    } else if (countryCode) {
      // Cas : cinéma d'un pays (carte du monde du cinéma, dans Profil) —
      // contrairement aux studios (catalogue resserré, montré en quasi-
      // totalité), le cinéma d'un pays entier sur toute son histoire est
      // bien trop vaste pour ça (l'Inde à elle seule produit plus de films
      // que Hollywood) — même esprit "mieux notés" que les décennies, pas
      // "catalogue complet" comme les studios.
      const cc = String(countryCode).toUpperCase();
      if (!/^[A-Z]{2}$/.test(cc)) {
        setCache(3600, 86400);
        return res.status(200).json({ results: [] });
      }
      const pages = await Promise.all([1, 2, 3, 4, 5].map(page =>
        fetch(`https://api.themoviedb.org/3/discover/${tmdbMediaType}?api_key=${TMDB_KEY}&language=fr-FR&sort_by=vote_average.desc&vote_count.gte=200&with_origin_country=${cc}&page=${page}`)
          .then(r => r.json()).catch(() => ({ results: [] }))
      ));
      const merged = pages.flatMap(p => p.results || []).filter(m => m.poster_path);
      setCache(604800, 2592000); // une semaine, comme les décennies/studios
      return res.status(200).json({ results: merged.slice(0, 100) });

    } else if (studioId) {
      // Cas : catalogue d'un studio (liste prédéfinie du Profil, dans le
      // même esprit que les décennies/la saga) — contrairement aux
      // décennies (des milliers de films à trier), le catalogue d'un studio
      // choisi à la main (voir CURATED_STUDIOS) est naturellement resserré :
      // l'idée est de le montrer en quasi-totalité, pas de garder que les
      // "meilleurs" au prix d'en exclure des titres légitimes. Ordre
      // chronologique (esprit "catalogue à explorer"), seuil de votes plus
      // bas que les décennies (20, pas 500) pour ne pas exclure de vrais
      // films sous prétexte qu'ils sont moins connus.
      const sid = parseInt(studioId, 10);
      if (!sid) {
        setCache(3600, 86400);
        return res.status(200).json({ results: [] });
      }
      const pages = await Promise.all([1, 2, 3].map(page =>
        fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=fr-FR&sort_by=primary_release_date.asc&vote_count.gte=20&with_companies=${sid}&page=${page}`)
          .then(r => r.json()).catch(() => ({ results: [] }))
      ));
      const merged = pages.flatMap(p => p.results || []).filter(m => m.poster_path);
      setCache(604800, 2592000); // une semaine, comme les décennies : ça ne bouge presque jamais
      return res.status(200).json({ results: merged });

    } else if (decadeTop) {
      // Cas : "Meilleurs films des années XXXX" (listes prédéfinies du
      // Profil) — contrairement à la liste "tous les temps" (compilée à la
      // main sur le classement Sight & Sound), ici pas de source critique
      // faisant autorité par décennie : tri algorithmique transparent sur
      // TMDb (note moyenne, minimum 500 votes pour éviter qu'un film obscur
      // avec 3 votes à 10/10 fausse le classement) — annoncé comme tel dans
      // l'app, pas présenté comme un vrai palmarès critique.
      const startYear = parseInt(decadeTop, 10);
      if (!startYear || startYear < 1900 || startYear > 2030) {
        setCache(3600, 86400);
        return res.status(200).json({ results: [] });
      }
      const endYear = startYear + 9;
      // TMDb utilise un nom de champ de date différent pour les séries
      // (first_air_date) que pour les films (primary_release_date).
      const dateField = tmdbMediaType === 'tv' ? 'first_air_date' : 'primary_release_date';
      const pages = await Promise.all([1, 2, 3, 4, 5].map(page =>
        fetch(`https://api.themoviedb.org/3/discover/${tmdbMediaType}?api_key=${TMDB_KEY}&language=fr-FR&sort_by=vote_average.desc&vote_count.gte=500&${dateField}.gte=${startYear}-01-01&${dateField}.lte=${endYear}-12-31&page=${page}`)
          .then(r => r.json()).catch(() => ({ results: [] }))
      ));
      const merged = pages.flatMap(p => p.results || []).filter(m => m.poster_path);
      // Une semaine de cache : ce classement ne bouge presque jamais d'un
      // jour à l'autre (les votes TMDb évoluent lentement), inutile de le
      // recalculer à chaque consultation du Profil.
      setCache(604800, 2592000);
      return res.status(200).json({ results: merged.slice(0, 100) });

    } else if (collectionId) {
      // Cas : détail complet d'une saga (fiche saga, à l'image de la fiche
      // réalisateur) — TMDb a un vrai concept de "collection" nativement,
      // déjà présent dans belongs_to_collection sur chaque fiche film (pas
      // besoin de le construire à la main comme les listes prédéfinies).
      const safeCollectionId = tmdbId(collectionId);
      if (!safeCollectionId) return badId();
      const collectionRes = await fetch(
        `https://api.themoviedb.org/3/collection/${safeCollectionId}?api_key=${TMDB_KEY}&language=fr-FR`
      );
      const collectionData = await collectionRes.json();
      setCache(21600, 604800); // 6h, comme les détails d'un film — aussi stable
      return res.status(200).json(collectionData);

    } else if (id) {
      // Cas 2 : Détails d'un film spécifique (infos + crédits)
      const safeId = tmdbId(id);
      if (!safeId) return badId();
      const detailsRes = await fetch(
        `https://api.themoviedb.org/3/movie/${safeId}?api_key=${TMDB_KEY}&language=fr-FR&append_to_response=credits,videos,external_ids&include_video_language=fr,en,null`
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
