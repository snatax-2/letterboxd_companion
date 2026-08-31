// ═══════════════════════════════════════════
//  LOGIQUE PURE (testable) : calcul du score & fusion cloud
// ═══════════════════════════════════════════

// ── LES STRUCTURES DE DONNÉES PERSISTÉES ─────────────────────────────────
// Décrites ici, en un seul endroit, plutôt qu'à reconstituer en relisant les
// fonctions de sauvegarde. Ce sont ces objets que les fonctions de fusion
// ci-dessous manipulent, et ceux qui transitent par la synchro cloud.
//
// En JSDoc et non en TypeScript : les éditeurs en tirent l'autocomplétion et
// la vérification de frappe sans imposer d'étape de compilation à un projet
// qui sert du JavaScript tel quel (voir le README sur app.js généré).
//
// ATTENTION : ces champs sont écrits sur le disque des utilisateurs. En
// ajouter un est sans risque ; en RENOMMER ou en SUPPRIMER un casse les
// données déjà enregistrées et demande une migration (voir 00a-migrations.js).

/**
 * Un film noté. Stocké dans localStorage['lbx_v2'] (tableau).
 * @typedef  {Object} FilmNote
 * @property {string}  title        Titre, sert aussi de clé de fusion (voir historyItemKey).
 * @property {string}  year
 * @property {string}  poster       URL TMDb complète (pas un chemin).
 * @property {string}  genre        Genres joints par ', '.
 * @property {string}  runtime      Ex. « 120 min ».
 * @property {string}  director
 * @property {string}  actors       Noms joints par ', '.
 * @property {string|null} tmdbScore
 * @property {string|null} tmdbId
 * @property {string}  date         Date de visionnage saisie (AAAA-MM-JJ).
 * @property {boolean} liked        Coup de cœur.
 * @property {string[]} contextTags Ex. « À la maison », « Au cinéma ».
 * @property {string}  score        Note /10, une décimale, en CHAÎNE.
 * @property {string}  stars        Rendu en étoiles, ex. « ★★★½ ».
 * @property {'quick'|'detail'} mode
 * @property {string}  review
 * @property {{quick: number}|Record<string, string>} values
 *           En mode « quick » : { quick }. En mode « detail » : une entrée par
 *           critère de CRITERIA (scenario, realisation, photo…).
 * @property {string}  savedAt      ISO. Fixé à la création, jamais réécrit.
 * @property {string}  updatedAt    ISO. Réécrit à chaque modification —
 *                                  c'est LUI qui arbitre la fusion cloud.
 */

/**
 * Une série suivie. Stockée dans localStorage['lbx_tv_shows'] (tableau).
 * @typedef  {Object} SerieSuivie
 * @property {number|string} tmdbTvId  Clé de fusion (voir tvShowItemKey).
 * @property {string} title
 * @property {string} poster_path     Chemin TMDb brut, PAS une URL complète
 *                                    (contrairement à FilmNote.poster).
 * @property {string} genre
 * @property {boolean} liked          Coup de cœur sur la série entière.
 * @property {string}  likedAt        ISO, ou ''. Horodate le dernier changement de
 *                                    `liked` : c'est lui qui arbitre la fusion de ce
 *                                    champ (sans lui, un ancien true venu du cloud
 *                                    ressuscitait un coup de cœur décoché).
 * @property {Record<string, SaisonSuivie>} seasons  Clé = numéro de saison en chaîne.
 */

/**
 * Une saison, dans SerieSuivie.seasons.
 * @typedef  {Object} SaisonSuivie
 * @property {string}   seasonName       Nom de la saison SEULE, sans le titre de la série.
 * @property {number[]} watchedEpisodes  Numéros d'épisodes vus.
 * @property {number}   totalEpisodes
 * @property {Object}  [rating]          Absent tant que la saison n'est pas notée ;
 *                                       même forme que la notation d'un FilmNote
 *                                       (mode, values, score, stars, review, date).
 */

/**
 * Un film à voir. Stocké par liste dans localStorage['lbx_watchlist_<id>'].
 * @typedef  {Object} ItemWatchlist
 * @property {string} title
 * @property {string} year
 * @property {string} poster    URL TMDb complète.
 * @property {string} genre
 * @property {*}      rating    Note TMDb telle que renvoyée par l'API.
 * @property {string} runtime
 * @property {number|string} tmdbId  Clé de fusion si présent, sinon le titre
 *                                   (voir watchlistItemKey).
 * @property {string} addedAt   ISO.
 */

/**
 * Trace de suppression. Sans elle, une synchro depuis un appareil qui a
 * encore l'élément le ferait RÉAPPARAÎTRE sur celui qui l'a supprimé.
 * @typedef  {Object} Tombstone
 * @property {string} key        Même clé que l'élément supprimé.
 * @property {string} deletedAt  ISO. Comparé à l'horodatage de l'élément pour
 *                               arbitrer — `updatedAt`/`savedAt` pour l'historique,
 *                               `addedAt` pour la watchlist : une modification
 *                               postérieure à la suppression ressuscite l'élément.
 */

//
// Ce fichier ne touche JAMAIS au DOM ni à localStorage : chaque fonction ici
// prend des données en entrée et renvoie un résultat, sans effet de bord.
// C'est délibéré : c'est ce qui permet de les tester automatiquement avec
// Node (voir tests/) sans avoir besoin d'un navigateur.
//
// Les fichiers qui ont besoin d'effets de bord (lire un slider, écrire dans le
// DOM, lire/écrire localStorage...) restent des fines couches au-dessus de ces
// fonctions — voir calculateScore() dans 05-rating-form.js et mergeWithRemote()
// dans 10-cloud-sync.js.
//
// Le bloc tout en bas (`if (typeof module !== 'undefined')...`) permet à ce
// même fichier de fonctionner à la fois :
//  - dans le navigateur : concaténé tel quel dans app.js, les fonctions
//    deviennent de simples fonctions globales (comme avant l'extraction) ;
//  - dans Node (tests) : `require()` direct, sans DOM.

const TOMBSTONE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours

// ─── Score ────────────────────────────────────────────────────────────────

// Mode rapide : note en étoiles (0.5 à 5, pas de 0.5) -> score sur 10.
function computeQuickScore(quickRatingStars) {
  return quickRatingStars * 2;
}

// Mode détaillé : moyenne pondérée des 6 critères (scenario, realisation,
// photo, acteurs, ambiance, affect), chacun noté de 0 à 10.
// `criteriaValues` : { scenario: 7.5, realisation: 8, ... }
// `weights`        : { scenario: 1, realisation: 1.5, ... }
function computeWeightedScore(criteriaValues, weights) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const key of Object.keys(criteriaValues)) {
    const val = criteriaValues[key];
    const wt = weights[key] ?? 1;
    weightedSum += val * wt;
    totalWeight += wt;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 5;
}

// Note globale d'une série : moyenne des saisons NOTÉES uniquement (une
// saison sans note n'entre pas dans le calcul, plutôt que de compter comme
// 0 et fausser la moyenne). Jamais stockée — toujours recalculée à partir
// des saisons, exactement comme convenu : une série qui change de
// direction en cours de route (True Detective, Twin Peaks...) n'a pas sa
// meilleure/pire saison lissée dans une note unique figée.
function computeShowAverageScore(showEntry) {
  if (!showEntry || !showEntry.seasons) return null;
  const rated = Object.values(showEntry.seasons).filter(s => s.rating && s.rating.score != null);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, s) => acc + parseFloat(s.rating.score), 0);
  return sum / rated.length;
}

// Convertit un score sur 10 en équivalent "étoiles" (pas de 0.5), pour l'affichage.
function scoreToStars(score) {
  return Math.round((score / 2) * 2) / 2;
}

// Formatte un nombre d'étoiles en chaîne ★★★½
function getStarStr(stars) {
  let s = '';
  const full = Math.floor(stars);
  const half = (stars % 1) !== 0;
  for (let i = 0; i < full; i++) s += '★';
  if (half) s += '½';
  return s || '½';
}

// ─── Fusion cloud : clés d'identité ─────────────────────────────────────────

function historyItemKey(item) {
  return (item.title || '').toLowerCase();
}

function watchlistItemKey(item) {
  return item.tmdbId ? `id:${item.tmdbId}` : `title:${(item.title || '').toLowerCase()}`;
}

function tvShowItemKey(show) {
  return String(show.tmdbTvId);
}

// ─── Modèle séries v2 : champs indépendants et événements vu/non vu ────────
// Les tableaux watchedEpisodes restent la projection utilisée par les écrans.
// _sync conserve les décochements et les dates TECHNIQUES, jamais la date de
// visionnage. Une migration ne prétend pas connaître la chronologie ancienne.
function tvStableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(tvStableJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + tvStableJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value) ?? 'null';
}

function tvSyncMeta(entity, episodes = false) {
  if (entity?._sync?.version > 2) throw new Error('Version des données séries plus récente : mets Ludex à jour.');
  const legacyDate = episodes ? entity?.rating?.date : Object.values(entity?.seasons || {}).map(s => s.rating?.date || '').sort().at(-1);
  const meta = { version: 2, createdAt: entity?._sync?.createdAt || '', legacyDate: entity?._sync?.legacyDate ?? legacyDate ?? '', fields: { ...entity?._sync?.fields } };
  const validClock = value => typeof value === 'string' && (!value || (Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value));
  if (!validClock(meta.createdAt) || !Object.values(meta.fields).every(validClock)) throw new Error('Horodatage de suivi invalide : données originales conservées.');
  if (episodes) meta.episodes = { ...entity?._sync?.episodes };
  if (episodes && !Object.entries(meta.episodes).every(([n, event]) => Number.isInteger(Number(n)) && Number(n) > 0 && event && typeof event.watched === 'boolean' && validClock(event.updatedAt))) {
    throw new Error('État d’épisode invalide : données originales conservées.');
  }
  return meta;
}

function tvEpisodeNumbers(numbers) {
  return [...new Set((numbers || []).map(Number).filter(n => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
}

function validateTvDataKeys(value) {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Clé invalide dans les données séries.');
    validateTvDataKeys(value[key]);
  }
}

function normalizeTvShows(shows) {
  if (!Array.isArray(shows)) throw new Error('Données séries invalides.');
  validateTvDataKeys(shows);
  // Copie profonde : aucune fusion/migration ne doit modifier ses entrées.
  return JSON.parse(JSON.stringify(shows)).map(show => {
    if (!show || show.tmdbTvId == null || !show.seasons || typeof show.seasons !== 'object' || Array.isArray(show.seasons)) {
      throw new Error('Série ou saisons invalides : données originales conservées.');
    }
    show._sync = tvSyncMeta(show);
    show.liked = !!show.liked;
    show.likedAt = show.likedAt || '';
    for (const season of Object.values(show.seasons)) {
      if (!season || typeof season !== 'object' || Array.isArray(season) || (season.watchedEpisodes != null && !Array.isArray(season.watchedEpisodes))) {
        throw new Error('Saison invalide : données originales conservées.');
      }
      season._sync = tvSyncMeta(season, true);
      // Un état explicite (notamment false) prime une ancienne projection.
      for (const n of tvEpisodeNumbers(season.watchedEpisodes)) {
        if (!season._sync.episodes[n]) season._sync.episodes[n] = { watched: true, updatedAt: '' };
      }
      season.watchedEpisodes = tvEpisodeNumbers(Object.keys(season._sync.episodes).filter(n => season._sync.episodes[n].watched));
    }
    return show;
  });
}

function tvStampFields(before, after, at, excluded) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after)]);
  for (const key of keys) {
    if (excluded.includes(key)) continue;
    if (tvStableJson(before?.[key]) !== tvStableJson(after[key])) {
      after._sync.fields[key] = at;
      // null est une suppression de champ transmissible, contrairement à undefined.
      if (after[key] === undefined) after[key] = null;
    }
  }
}

function stampTvChanges(before, after, at) {
  const normalized = normalizeTvShows(after);
  const oldById = new Map(normalizeTvShows(before).map(show => [String(show.tmdbTvId), show]));
  normalized.forEach((show, index) => {
    const old = oldById.get(String(show.tmdbTvId));
    if (!old) show._sync.createdAt = at;
    else {
      show._sync.createdAt = old._sync.createdAt;
      show._sync.legacyDate = old._sync.legacyDate;
    }
    tvStampFields(old, show, at, ['_sync', 'seasons', 'tmdbTvId']);
    for (const [key, season] of Object.entries(show.seasons)) {
      const prev = old?.seasons?.[key];
      if (!prev) season._sync.createdAt = at;
      else {
        season._sync.createdAt = prev._sync.createdAt;
        season._sync.legacyDate = prev._sync.legacyDate;
      }
      tvStampFields(prev, season, at, ['_sync', 'watchedEpisodes']);
      const watched = new Set(tvEpisodeNumbers(after[index].seasons[key].watchedEpisodes));
      const previously = new Set(tvEpisodeNumbers(prev?.watchedEpisodes));
      for (const n of new Set([...watched, ...previously])) {
        if (watched.has(n) !== previously.has(n)) {
          season._sync.episodes[n] = { watched: watched.has(n), updatedAt: at };
        }
      }
      season.watchedEpisodes = [...watched].sort((a, b) => a - b);
    }
  });
  return normalized;
}

function tvFieldClock(entity, key) {
  return entity?._sync?.fields?.[key] || (key === 'liked' ? entity?.likedAt : '') || '';
}

function tvMergeFields(a, b, excluded) {
  const result = { _sync: tvSyncMeta(a) };
  result._sync.createdAt = [a._sync.createdAt, b._sync.createdAt].sort().at(-1);
  result._sync.legacyDate = [a._sync.legacyDate, b._sync.legacyDate].sort().at(-1);
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b), ...Object.keys(a._sync.fields), ...Object.keys(b._sync.fields)])].sort()) {
    if (excluded.includes(key)) continue;
    const ac = tvFieldClock(a, key), bc = tvFieldClock(b, key);
    let winner;
    if (ac !== bc) winner = ac > bc ? a : b;
    else if (!ac && key === 'rating') {
      // Seulement pour les deux anciennes copies sans horodatage technique.
      const ad = a.rating?.date || '', bd = b.rating?.date || '';
      winner = ad === bd ? (tvStableJson(a[key]) >= tvStableJson(b[key]) ? a : b) : (ad > bd ? a : b);
    } else if (!ac && key === 'liked') winner = a.liked ? a : b;
    else if (a[key] === undefined) winner = b;
    else if (b[key] === undefined) winner = a;
    else winner = tvStableJson(a[key]) >= tvStableJson(b[key]) ? a : b;
    if (winner[key] !== undefined) result[key] = winner[key];
    if (ac || bc) result._sync.fields[key] = ac > bc ? ac : bc;
  }
  return result;
}

function tvSurvivesDeletion(entity, tomb, legacyDate) {
  if (!tomb) return true;
  // Une vraie reprise crée une nouvelle génération. Modifier une note sur une
  // copie hors ligne d'une saison supprimée ne doit pas ressusciter celle-ci.
  const birth = entity._sync.createdAt || entity._sync.legacyDate || legacyDate || '';
  return birth > tomb.deletedAt;
}

function mergeTvShows(local, remote, showTombstones = [], seasonTombstones = []) {
  const latestTombs = list => {
    const map = new Map();
    for (const tomb of list) if ((map.get(tomb.key)?.deletedAt || '') < tomb.deletedAt) map.set(tomb.key, tomb);
    return map;
  };
  const showTombs = latestTombs(showTombstones), seasonTombs = latestTombs(seasonTombstones);
  const byId = new Map();
  for (const show of normalizeTvShows([...local, ...remote])) {
    const key = String(show.tmdbTvId);
    const latestRating = Object.values(show.seasons).map(s => s.rating?.date || '').sort().at(-1);
    if (!tvSurvivesDeletion(show, showTombs.get(key), latestRating)) continue;
    for (const seasonKey of Object.keys(show.seasons)) {
      const season = show.seasons[seasonKey];
      if (!tvSurvivesDeletion(season, seasonTombs.get(key + ':' + seasonKey), season.rating?.date)) delete show.seasons[seasonKey];
    }
    const existing = byId.get(key);
    if (!existing) { byId.set(key, show); continue; }
    const target = tvMergeFields(existing, show, ['_sync', 'seasons']);
    target.seasons = { ...existing.seasons };
    for (const [seasonKey, season] of Object.entries(show.seasons)) {
      const prior = target.seasons[seasonKey];
      if (!prior) { target.seasons[seasonKey] = season; continue; }
      const merged = tvMergeFields(prior, season, ['_sync', 'watchedEpisodes']);
      merged._sync.episodes = { ...prior._sync.episodes };
      for (const [n, event] of Object.entries(season._sync.episodes)) {
        const prev = merged._sync.episodes[n];
        // Même milliseconde, actions opposées : non vu gagne, dans les deux sens.
        if (!prev || event.updatedAt > prev.updatedAt || (event.updatedAt === prev.updatedAt && !event.watched)) merged._sync.episodes[n] = event;
      }
      merged.watchedEpisodes = tvEpisodeNumbers(Object.keys(merged._sync.episodes).filter(n => merged._sync.episodes[n].watched));
      target.seasons[seasonKey] = merged;
    }
    byId.set(key, target);
  }
  return [...byId.values()].filter(show => Object.keys(show.seasons).length).sort((a, b) => String(a.tmdbTvId).localeCompare(String(b.tmdbTvId)));
}

// ─── Fusion cloud : tombstones (traces de suppression) ──────────────────────

// Fusionne deux listes de tombstones : garde la date de suppression la plus
// récente par clé, et purge celles plus vieilles que TOMBSTONE_MAX_AGE_MS
// (pas la peine de trainer une trace de suppression indéfiniment).
function mergeTombstoneLists(a, b) {
  const map = new Map();
  for (const t of [...a, ...b]) {
    const existing = map.get(t.key);
    if (!existing || new Date(t.deletedAt) > new Date(existing.deletedAt)) map.set(t.key, t);
  }
  const cutoff = Date.now() - TOMBSTONE_MAX_AGE_MS;
  return [...map.values()].filter(t => new Date(t.deletedAt).getTime() > cutoff);
}

// ─── Fusion cloud : historique ───────────────────────────────────────────────

function mergeHistory(local, remote, tombstones) {
  const merged = new Map(); // key -> entry
  for (const entry of [...local, ...remote]) {
    const key = historyItemKey(entry);
    if (!key) continue;
    const existing = merged.get(key);
    const entryTime = new Date(entry.updatedAt || entry.savedAt || 0).getTime();
    if (!existing) {
      merged.set(key, entry);
    } else {
      const existingTime = new Date(existing.updatedAt || existing.savedAt || 0).getTime();
      if (entryTime >= existingTime) merged.set(key, entry);
    }
  }

  const result = [];
  for (const [key, entry] of merged) {
    const tomb = tombstones.find(t => t.key === key);
    if (tomb) {
      const entryTime = new Date(entry.updatedAt || entry.savedAt || 0).getTime();
      if (new Date(tomb.deletedAt).getTime() >= entryTime) continue; // supprimé plus récemment que la dernière modif
    }
    result.push(entry);
  }
  result.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  return result;
}

// ─── Fusion cloud : watchlist ────────────────────────────────────────────────

function mergeWatchlist(local, remote, tombstones) {
  const merged = new Map();
  for (const item of [...local, ...remote]) {
    const key = watchlistItemKey(item);
    if (!merged.has(key)) merged.set(key, item);
  }

  const result = [];
  for (const [key, item] of merged) {
    const tomb = tombstones.find(t => t.key === key);
    if (tomb) {
      const itemTime = new Date(item.addedAt || 0).getTime();
      if (new Date(tomb.deletedAt).getTime() >= itemTime) continue;
    }
    result.push(item);
  }
  result.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
  return result;
}

// ─── Descriptions qualitatives par critère (paliers + qualificatif fin) ────

const DESCS = {
  scenario: [
    [9.5,"Un chef-d'œuvre narratif absolu. Écriture brillante, dialogues ciselés, structure parfaite et thèmes d'une profondeur rare qui hantent longtemps après le visionnage."],
    [8.5,"Scénario magistral. Une construction d'une intelligence rare, des personnages d'une richesse peu commune, presque aucune fausse note."],
    [7.5,"Excellent scénario. Récit captivant, personnages bien écrits et rebondissements intelligents qui maintiennent un fort engagement."],
    [6.5,"Bonne écriture, quelques idées qui sortent du lot, mais sans jamais atteindre une vraie fulgurance."],
    [5.5,"Une histoire classique et fonctionnelle. Fait le travail correctement, mais suit des sentiers battus ou manque d'une vraie prise de risque."],
    [4.5,"Des maladresses évidentes. Rythme narratif inconstant, facilités scénaristiques ou dialogues un peu artificiels qui sortent du récit."],
    [3.5,"Scénario poussif. Les ficelles se voient, certains personnages sonnent creux, l'ensemble peine à convaincre."],
    [2.5,"Récit laborieux. De graves incohérences, des intrigues secondaires inutiles ou des personnages aux réactions incompréhensibles."],
    [1.5,"Écriture quasi inexistante. Le fil narratif se perd, les enjeux ne tiennent debout à aucun moment."],
    [0,  "Un naufrage scénaristique total. Dénué de sens, ennuyeux à mourir ou insultant pour l'intelligence du spectateur."]
  ],
  realisation: [
    [9.5,"Une masterclass de mise en scène. Une vision d'auteur absolue où chaque plan respire l'intelligence, la maîtrise et l'audace visuelle."],
    [8.5,"Réalisation éblouissante. Un vrai geste de cinéma, ambitieux et maîtrisé de bout en bout."],
    [7.5,"Réalisation forte et inspirée. Le réalisateur a un vrai point de vue, avec une caméra dynamique qui sublime le propos du film."],
    [6.5,"Mise en scène assurée, quelques idées visuelles marquantes, sans toutefois transcender le sujet."],
    [5.5,"Mise en scène artisanale et propre. Efficace, lisible, mais qui s'efface souvent derrière son sujet sans fulgurance visuelle."],
    [4.5,"Une réalisation impersonnelle. Ressemble plus à un produit de commande ou à un téléfilm manquant cruellement de caractère."],
    [3.5,"Mise en scène poussive, découpage parfois maladroit, peu d'idées de mise en image."],
    [2.5,"Mise en scène paresseuse ou confuse. Découpage hasardeux, absence de rythme visuel ou tics qui fatiguent l'œil."],
    [1.5,"Réalisation à peine fonctionnelle. Cadres bancals, mise en scène qui dessert constamment le récit."],
    [0,  "Catastrophique. Incompétence technique crasse, montage épileptique ou plans littéralement illisibles."]
  ],
  photo: [
    [9.5,"Une claque visuelle absolue. Chaque plan est un tableau. Gestion de la lumière, colorimétrie et cadrages atteignent le sublime."],
    [8.5,"Photographie somptueuse, une signature visuelle forte et cohérente du début à la fin."],
    [7.5,"Superbe photographie. Une identité visuelle très marquée qui participe activement à l'ambiance et flatte constamment la rétine."],
    [6.5,"Belle image, quelques plans qui sortent du lot, sans être une œuvre visuellement unique."],
    [5.5,"Esthétique soignée mais standardisée. L'image est belle et propre, mais reste académique ou familière."],
    [4.5,"Visuellement terne ou inégal. Éclairages plats, étalonnage douteux (trop gris/sombre) ou effets spéciaux qui jurent."],
    [3.5,"Image assez pauvre, cadrages sans inspiration, colorimétrie qui manque de cohérence."],
    [2.5,"Laideur visuelle manifeste. Cadrages ratés, image numérique sans texture, ou filtres appliqués sans aucune cohérence artistique."],
    [1.5,"Image quasiment illisible ou dénuée de tout soin, très en dessous des standards attendus."],
    [0,  "Une agression oculaire. Illisible, bouillie de pixels ou éclairage d'une pauvreté affligeante."]
  ],
  acteurs: [
    [9.5,"Des performances magistrales et habitées. Des acteurs en état de grâce qui transcendent leurs personnages et crèvent l'écran."],
    [8.5,"Casting exceptionnel, des interprétations d'une justesse rare qui portent le film à elles seules."],
    [7.5,"Un casting redoutable. Des interprétations justes, intenses et nuancées qui portent le film avec un grand charisme."],
    [6.5,"Bonnes performances dans l'ensemble, une ou deux têtes d'affiche particulièrement convaincantes."],
    [5.5,"Jeu solide et convaincant. Les acteurs font le job honnêtement, sans pour autant livrer la performance de leur carrière."],
    [4.5,"Interprétations inégales. Certains tirent leur épingle du jeu, mais d'autres surjouent ou manquent cruellement d'alchimie."],
    [3.5,"Jeu d'acteur assez faible dans l'ensemble, direction d'acteurs peu convaincante."],
    [2.5,"Casting en roue libre. Mauvaise direction d'acteurs, expressions forcées, ou têtes d'affiche visiblement venues pour le chèque."],
    [1.5,"Interprétations quasi risibles, aucune alchimie ni conviction à l'écran."],
    [0,  "Un festival de jeu monolithique ou d'hystérie ridicule. Impossible de croire une seule seconde aux personnages."]
  ],
  ambiance: [
    [9.5,"Une immersion sensorielle totale. Bande originale mythique et sound design viscéral qui prennent littéralement aux tripes."],
    [8.5,"Atmosphère sonore exceptionnelle, musique et sound design qui deviennent indissociables du film."],
    [7.5,"Excellente atmosphère. La musique et les effets sonores enveloppent le spectateur et renforcent magistralement l'impact émotionnel."],
    [6.5,"Bon accompagnement sonore, quelques thèmes marquants, sans devenir mémorable dans son ensemble."],
    [5.5,"Ambiance réussie. Accompagnement sonore fonctionnel et agréable, qui soutient l'action sans pour autant marquer les esprits."],
    [4.5,"Sonorité générique. Musique d'ascenseur, thèmes oubliables ou mixage sonore parfois douteux en retrait."],
    [3.5,"Ambiance sonore faible, musique qui peine à installer une atmosphère cohérente."],
    [2.5,"Bande-son envahissante ou hors sujet. Musique omniprésente qui dicte les émotions, ou sound design artificiel qui brise l'immersion."],
    [1.5,"Son quasiment raté, mixage désagréable, aucune identité sonore."],
    [0,  "Supplice auditif. Bruitages ratés, doublages asynchrones, ou bande originale qui ruine littéralement les scènes clés."]
  ],
  rythme: [
    [9.5,"Un rythme d'une précision chirurgicale. Chaque scène a exactement la durée qu'il faut, montage d'orfèvre, pas une seconde de trop ni de manque."],
    [8.5,"Montage excellent, un tempo qui épouse parfaitement les intentions du film du début à la fin."],
    [7.5,"Très bon rythme. Le film se regarde sans effort, les transitions sont fluides et le montage sert bien le récit."],
    [6.5,"Rythme globalement maîtrisé, quelques longueurs ponctuelles qui n'entament pas trop l'ensemble."],
    [5.5,"Rythme correct mais irrégulier. Certains passages traînent un peu, d'autres filent trop vite, sans que ça gâche l'expérience."],
    [4.5,"Rythme mal calibré. Des longueurs qui se sentent, un montage qui casse parfois l'élan du film."],
    [3.5,"Film qui traîne clairement en longueur ou au contraire semble haché, avec des ruptures de rythme gênantes."],
    [2.5,"Rythme poussif ou décousu sur une bonne partie du film, l'attention décroche régulièrement."],
    [1.5,"Montage confus, tempo constamment à côté de la plaque, on regarde sa montre."],
    [0,  "Rythme complètement raté. Interminable, ou monté de façon si chaotique que le film en devient illisible."]
  ],
  affect: [
    [9.5,"Coup de foudre absolu. Un film qui bouleverse, obsède, et trouve une place immédiate dans mon panthéon personnel."],
    [8.5,"Immense claque émotionnelle. Un film qui restera gravé longtemps, que je recommande sans réserve."],
    [7.5,"Énorme coup de cœur. Une œuvre marquante qui m'a fait vibrer, rire ou pleurer, et que je reverrai avec grand plaisir."],
    [6.5,"Beau moment, quelques scènes qui marquent vraiment, une expérience que j'ai appréciée sincèrement."],
    [5.5,"Un très bon moment de cinéma. J'ai pris du plaisir devant ce film, même s'il ne me laissera pas un souvenir impérissable."],
    [4.5,"Sentiment mitigé. Pas désagréable, mais je reste totalement sur ma faim. Vite vu, assez vite oublié."],
    [3.5,"Peu d'accroche émotionnelle, le film m'a globalement laissé de marbre."],
    [2.5,"Ennui ou agacement profond. Une expérience pénible, où le temps a semblé particulièrement long. Très peu d'accroche."],
    [1.5,"Rejet quasi total, très peu de moments qui ont suscité un intérêt réel."],
    [0,  "Rejet viscéral. Une perte de temps absolue, un film que j'ai détesté de bout en bout et que je veux effacer de ma mémoire."]
  ]
};

// Séries — Phase 3 : descriptions propres aux deux critères reformulés
// pour une saison ("photo" -> Qualité du final, "rythme" -> Rythme &
// Cohérence de la saison). Les 5 autres critères (scenario, realisation,
// acteurs, ambiance, affect) restent transposables tels quels, mêmes
// textes que pour un film — pas de doublon nécessaire pour eux. Même
// structure à 10 paliers que DESCS, pour rester cohérent.
const DESCS_TV_OVERRIDES = {
  photo: [
    [9.5,"Un final parfait, qui élève toute la saison et referme chaque fil narratif avec une intelligence rare."],
    [8.5,"Une conclusion magistrale, à la hauteur de tout ce qui précède, qui restera gravée longtemps."],
    [7.5,"Excellent épisode final. Il conclut la saison avec panache, sans faux pas majeur."],
    [6.5,"Bon final, qui referme l'essentiel sans forcément marquer les esprits."],
    [5.5,"Final honnête et satisfaisant, qui fait le travail sans surprendre."],
    [4.5,"Final en demi-teinte. Quelques fils narratifs bâclés ou une résolution un peu facile."],
    [3.5,"Conclusion décevante, qui peine à être à la hauteur de la saison."],
    [2.5,"Final raté, qui gâche une partie de ce que la saison avait construit."],
    [1.5,"Fin quasiment ratée, qui trahit l'attente installée par les épisodes précédents."],
    [0,  "Un désastre. La fin détruit ce que la saison avait de mieux, ou ne conclut rien du tout."]
  ],
  rythme: [
    [9.5,"Un rythme d'une précision chirurgicale sur toute la saison. Chaque épisode a sa place, aucun ventre mou, une cohérence sans faille du premier au dernier épisode."],
    [8.5,"Excellente cohérence de saison, un tempo qui épouse parfaitement l'arc narratif du premier au dernier épisode."],
    [7.5,"Très bonne tenue sur la durée. La saison se regarde sans effort, les épisodes s'enchaînent avec fluidité."],
    [6.5,"Rythme globalement maîtrisé sur la saison, quelques épisodes plus faibles qui n'entament pas l'ensemble."],
    [5.5,"Cohérence correcte mais irrégulière. Certains épisodes traînent, d'autres filent trop vite, sans que ça gâche l'ensemble."],
    [4.5,"Rythme mal calibré sur la saison. Des épisodes de remplissage qui cassent l'élan général."],
    [3.5,"Saison qui traîne clairement en longueur sur plusieurs épisodes, ou qui semble décousue d'un épisode à l'autre."],
    [2.5,"Cohérence poussive sur une bonne partie de la saison, l'intérêt décroche régulièrement d'un épisode à l'autre."],
    [1.5,"Enchaînement confus, tempo constamment à côté de la plaque sur la majorité des épisodes."],
    [0,  "Rythme complètement raté sur toute la saison. Interminable, ou décousu au point de perdre le fil d'un épisode à l'autre."]
  ]
};

// Le cache est attaché à la fonction elle-même (pas une const top-level) et
// initialisé au premier appel — ainsi aucune ligne de déclaration à atteindre
// avant de pouvoir l'utiliser. C'est exactement la même classe de bug
// rencontrée plusieurs fois dans ce projet (CRITERIA_SHORT_LABELS,
// CONTEXT_TAG_ICONS, GENRE_BADGE_THRESHOLD) : une const top-level référencée
// par une fonction appelée via le renderAll() précoce de 03-foundation.js,
// AVANT que ce fichier-ci (qui charge après) n'ait fini de s'exécuter et
// atteint sa propre déclaration. Cette fois le remède habituel ("rendre la
// constante locale à la fonction") ne suffit pas seul, puisque ce cache doit
// justement SURVIVRE entre les appels — d'où cette variante.
function getDesc(criterion, val, mediaType = 'movie') {
  if (!getDesc._cache) getDesc._cache = {};
  const _descCache = getDesc._cache;
  const key = mediaType + criterion + val;
  if (_descCache[key]) return _descCache[key];
  const tiers = (mediaType === 'tv' && DESCS_TV_OVERRIDES[criterion]) || DESCS[criterion];

  for (let i = 0; i < tiers.length; i++) {
    const [thresh, text] = tiers[i];
    if (val < thresh) continue;

    // Chaque palier couvre en général 2 valeurs voisines (ex: 8.5 et 9.0 pour
    // le seuil 8.5), sauf le dernier qui en couvre 3 (0, 0.5, 1.0). On ajoute
    // un court qualificatif selon la position exacte dans cette fourchette,
    // pour un retour plus fin que le seul texte du palier (qui, lui, ne
    // change qu'environ tous les 1 point) — sans avoir à réécrire 147 textes
    // différents pour un gain de nuance souvent minime entre deux valeurs
    // voisines.
    const nextThresh = i > 0 ? tiers[i - 1][0] : thresh + 1; // borne haute (exclue) du palier actuel
    const rangeSpan = nextThresh - thresh;
    const posInRange = val - thresh;

    let qualifier = '';
    if (rangeSpan > 0.5) {
      if (Math.abs(posInRange) < 0.01) {
        qualifier = ' (plutôt bas dans cette tranche)';
      } else if (Math.abs(posInRange - (rangeSpan - 0.5)) < 0.01) {
        qualifier = ' (plutôt haut dans cette tranche)';
      }
      // Valeur médiane (uniquement pour le dernier palier, qui couvre 3
      // valeurs) : pas de qualificatif, elle est déjà bien au centre.
    }

    const result = text + qualifier;
    _descCache[key] = result;
    return result;
  }

  const fallback = tiers[tiers.length - 1][1];
  _descCache[key] = fallback;
  return fallback;
}

// ─── Moyennes personnelles par critère (repère sur les sliders + radar) ─────
// Retourne { scenario: 7.2, realisation: null, ... } — null si aucune entrée
// de l'historique n'a de valeur pour ce critère (ex: 'rythme' avant son ajout).
function computeCriteriaAverages(history, criteria) {
  const sums = {};
  const counts = {};
  criteria.forEach(c => { sums[c] = 0; counts[c] = 0; });

  history.forEach(h => {
    if (h.mode === 'detail' && h.values) {
      criteria.forEach(c => {
        const val = parseFloat(h.values[c]);
        if (!isNaN(val)) { sums[c] += val; counts[c]++; }
      });
    }
  });

  const avgs = {};
  criteria.forEach(c => { avgs[c] = counts[c] > 0 ? sums[c] / counts[c] : null; });
  return avgs;
}

// ─── Onglet Profil : temps visionné, série en cours, badges ────────────────
function formatWatchTime(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '—';
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days} j`);
  if (hours > 0 || days === 0) parts.push(`${hours} h`);
  return parts.join(' ');
}

// Clé "année-semaine ISO" pour une date donnée — deux dates de la même semaine
// ISO (lundi à dimanche) produisent la même clé, peu importe le jour exact.
function getISOWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

// Nombre de semaines ISO consécutives (en remontant depuis AUJOURD'HUI) avec
// au moins un film noté — 0 si la semaine en cours n'a rien.
function computeWeekStreak(history, referenceDate = new Date()) {
  const weeksWithActivity = new Set();
  history.forEach(h => {
    const raw = h.savedAt || h.date;
    if (!raw) return;
    const d = new Date(raw);
    if (isNaN(d)) return;
    weeksWithActivity.add(getISOWeekKey(d));
  });

  let streak = 0;
  const cursor = new Date(referenceDate);
  while (weeksWithActivity.has(getISOWeekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

// Nombre de JOURS consécutifs (en remontant depuis AUJOURD'HUI) avec au
// moins une note ajoutée — granularité plus fine que computeWeekStreak
// (semaines ISO), nécessaire pour le succès "Fidélité" (3/10/30 jours) qui
// parle explicitement de jours, pas de semaines. Fonctions séparées plutôt
// que fusionnées : le streak hebdomadaire (déjà affiché ailleurs dans le
// Profil) reste inchangé, celui-ci sert uniquement au nouveau succès.
function computeDayStreak(history, referenceDate = new Date()) {
  const daysWithActivity = new Set();
  history.forEach(h => {
    const raw = h.savedAt || h.date;
    if (!raw) return;
    const d = new Date(raw);
    if (isNaN(d)) return;
    daysWithActivity.add(d.toISOString().slice(0, 10));
  });

  let streak = 0;
  const cursor = new Date(referenceDate);
  while (daysWithActivity.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Badges débloqués selon l'historique — chaque entrée est indépendante,
// aucune ne dépend d'un ordre de déblocage particulier.
// ─── Rétrospective annuelle ("Wrapped") ─────────────────────────────────────
// Filtre l'historique sur UNE année (par savedAt, ou date à défaut) et en
// tire les temps forts — genre/réalisateur/acteur/mois les plus présents,
// film le mieux noté, temps total visionné. Fonction pure : ne touche à
// aucun DOM, juste des données en entrée/sortie, pour rester testable
// facilement (contrairement aux tests E2E, plus lents et parfois instables).
// ── Import Letterboxd (voir 07-data-io.js pour l'UI) ──
// Parseur CSV minimal mais correct : gère les champs entre guillemets
// (contenant virgules, retours à la ligne, guillemets doublés ""), le cas le
// plus piégeux des exports Letterboxd (titres comme "Paris, Texas").
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
  return rows;
}

// Convertit les lignes d'un CSV Letterboxd (diary.csv, ratings.csv ou
// watched.csv — colonnes détectées par l'en-tête, insensible à l'ordre) en
// items d'historique Ludex. Note Letterboxd sur 5 étoiles -> score sur 10.
// Retourne aussi le type détecté et les lignes ignorées (sans titre).
function mapLetterboxdCsv(rows) {
  if (!rows || rows.length < 2) return { items: [], skipped: 0, kind: null };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = (name) => header.indexOf(name);
  const iName = col('name'), iYear = col('year'), iRating = col('rating');
  const iWatched = col('watched date'), iDate = col('date');
  if (iName === -1) return { items: [], skipped: 0, kind: null }; // pas un CSV Letterboxd

  const kind = iWatched !== -1 ? 'diary' : (iRating !== -1 ? 'ratings' : 'watched');
  const items = [];
  let skipped = 0;
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const title = (cells[iName] || '').trim();
    if (!title) { skipped++; continue; }
    const year = iYear !== -1 ? (cells[iYear] || '').trim() : '';
    const ratingRaw = iRating !== -1 ? parseFloat(cells[iRating]) : NaN;
    const hasRating = !isNaN(ratingRaw) && ratingRaw > 0;
    const score = hasRating ? (ratingRaw * 2).toFixed(1) : '';
    const watchedDate = (iWatched !== -1 && cells[iWatched]) ? cells[iWatched].trim()
                      : (iDate !== -1 && cells[iDate]) ? cells[iDate].trim() : '';
    items.push({
      title,
      year,
      score,
      mode: 'quick',
      values: hasRating ? { quick: ratingRaw } : {},
      date: watchedDate,
      savedAt: new Date().toISOString(),
      importedFrom: 'letterboxd',
    });
  }
  return { items, skipped, kind };
}

// ── Cartes Profil : "Il y a un an", heatmap, décennies ──
// Compte de films par jour (clé YYYY-MM-DD), pour la heatmap calendrier.
function computeDailyCounts(history) {
  const counts = {};
  for (const item of history) {
    if (!item.date) continue;
    const key = String(item.date).slice(0, 10);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// Films regroupés par décennie de sortie, avec compte et note moyenne.
// Trié par compte décroissant. Les items sans année sont ignorés.
function computeDecadeStats(history) {
  const byDecade = {};
  for (const item of history) {
    const y = parseInt(item.year, 10);
    if (isNaN(y) || y < 1880 || y > 2100) continue;
    const decade = Math.floor(y / 10) * 10;
    if (!byDecade[decade]) byDecade[decade] = { decade, count: 0, scoreSum: 0, scored: 0 };
    byDecade[decade].count++;
    const s = parseFloat(item.score);
    if (!isNaN(s)) { byDecade[decade].scoreSum += s; byDecade[decade].scored++; }
  }
  return Object.values(byDecade)
    .map(d => ({ decade: d.decade, count: d.count, avg: d.scored > 0 ? d.scoreSum / d.scored : null }))
    .sort((a, b) => b.count - a.count);
}

// Le film regardé "il y a un an" : cherche autour de la même date l'an
// dernier, en élargissant progressivement (jour exact, puis ±1, ±2, ±3 jours)
// pour maximiser la chance d'un souvenir sans tricher sur "il y a un an".
function findOneYearAgoFilm(history, today) {
  const base = new Date(today);
  base.setFullYear(base.getFullYear() - 1);
  for (let spread = 0; spread <= 3; spread++) {
    for (const sign of spread === 0 ? [0] : [-1, 1]) {
      const d = new Date(base);
      d.setDate(d.getDate() + spread * sign);
      const key = d.toISOString().slice(0, 10);
      const found = history.find(h => h.date && String(h.date).slice(0, 10) === key);
      if (found) return { item: found, date: key };
    }
  }
  return null;
}

// ── Migrations de schéma (voir 00a-migrations.js pour le runner) ──
// Normalisation v2 d'un item d'historique : garantit les champs que le reste
// du code suppose présents. Idempotente (la rejouer ne change rien) — c'est la
// propriété clé d'une migration sûre. Pure et testée dans tests/migrations.test.js.
function normalizeHistoryItemV2(item) {
  if (!item || typeof item !== 'object') return item;
  const out = { ...item };
  // savedAt : des données très anciennes ou importées à la main peuvent ne pas
  // l'avoir — repli sur la date de visionnage, sinon une époque neutre (pas
  // "maintenant" : ça fausserait les tris "ajouté récemment" à chaque migration).
  if (!out.savedAt) {
    out.savedAt = out.date ? `${out.date}T12:00:00.000Z` : '1970-01-01T00:00:00.000Z';
  }
  // values : le code de rendu (radar, moyennes) suppose un objet
  if (!out.values || typeof out.values !== 'object') out.values = {};
  // title : chaîne toujours (un import cassé pourrait mettre null)
  if (typeof out.title !== 'string') out.title = String(out.title ?? '');
  return out;
}

// ── Duels ELO (voir 13-duels.js pour le stockage/rendu) ──
// Probabilité attendue de victoire selon l'écart de cotes, puis mise à jour
// symétrique : le vainqueur gagne exactement ce que le perdant perd. Battre
// plus fort que soi rapporte gros ; battre plus faible rapporte peu.
function computeEloUpdate(winnerElo, loserElo, k = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const delta = Math.round(k * (1 - expectedWinner));
  return { winnerElo: winnerElo + delta, loserElo: loserElo - delta, delta };
}

function computeWrappedStats(history, year) {
  const yearStr = String(year);
  const filtered = history.filter(h => {
    const d = h.savedAt || h.date;
    return !!d && d.slice(0, 4) === yearStr;
  });

  const totalFilms = filtered.length;
  const avgScore = totalFilms > 0
    ? filtered.reduce((sum, h) => sum + (parseFloat(h.score) || 0), 0) / totalFilms
    : 0;

  function topEntry(counts) {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? { name: entries[0][0], count: entries[0][1] } : null;
  }

  const genreCounts = {};
  filtered.forEach(h => {
    if (h.genre) h.genre.split(',').forEach(g => { const t = g.trim(); if (t) genreCounts[t] = (genreCounts[t] || 0) + 1; });
  });

  const directorCounts = {};
  filtered.forEach(h => { if (h.director) { const t = h.director.trim(); if (t) directorCounts[t] = (directorCounts[t] || 0) + 1; } });

  const actorCounts = {};
  filtered.forEach(h => {
    if (h.actors) h.actors.split(',').forEach(a => { const t = a.trim(); if (t) actorCounts[t] = (actorCounts[t] || 0) + 1; });
  });

  const monthCounts = {};
  filtered.forEach(h => {
    const d = h.savedAt || h.date;
    if (d) { const m = d.slice(0, 7); monthCounts[m] = (monthCounts[m] || 0) + 1; }
  });
  const topMonthRaw = topEntry(monthCounts);

  const bestRated = filtered.length > 0
    ? filtered.slice().sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0))[0]
    : null;

  const totalMinutes = filtered.reduce((sum, h) => {
    const m = parseInt(h.runtime, 10);
    return sum + (isNaN(m) ? 0 : m);
  }, 0);

  return {
    year,
    totalFilms,
    avgScore,
    topGenre: topEntry(genreCounts),
    topDirector: topEntry(directorCounts),
    topActor: topEntry(actorCounts),
    topMonth: topMonthRaw, // { name: "2026-03", count } — le nom du mois est formaté à l'affichage, pas ici
    bestRated,
    totalMinutes,
  };
}

// Ludex 2.0 : système de paliers (I/II/III, bronze/argent/or) — voir
// Ludex_Gamification_Succes.pdf. Chaque badge a 3 seuils au lieu d'un seul ;
// tierify() calcule où on en est. Remplace l'ancien système à seuil unique
// dans son intégralité (mêmes id que les tiers eux-mêmes n'existaient pas
// avant, donc rien à migrer côté stockage — les badges sont toujours
// recalculés à la volée, jamais une donnée primaire).
function tierify(value, tiers) {
  let tier = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (value >= tiers[i]) tier = i + 1;
  }
  const maxed = tier >= tiers.length;
  const nextThreshold = maxed ? null : tiers[tier];
  // Palier 0 : progression vers le PREMIER seuil (pas vers un seuil déjà
  // dépassé) — value/tiers[0], jamais value/nextThreshold quand tier>0 (le
  // dénominateur serait alors le seuil déjà franchi, pas le suivant).
  const progress = maxed ? 1 : Math.min(1, value / nextThreshold);
  return { value, tier, maxed, nextThreshold, progress };
}

// Première vague de succès à paliers (voir Ludex_Gamification_Succes.pdf) —
// seuls les trophées calculables avec les données déjà stockées aujourd'hui.
// Le reste du document (récompenses, popularité TMDb à l'instant T, langue
// originale, franchises, minutage par épisode...) demande de nouvelles
// données jamais suivies jusqu'ici — repoussé à une vague suivante plutôt
// que deviné approximativement.
function computeBadges(history, extras = {}) {
  const totalMinutes = extras.totalMinutes || 0;
  const dayStreak = extras.dayStreak || 0;
  const tvRatings = extras.tvRatings || []; // { score, date } par saison notée — voir getAllTvSeasonRatings()

  const genreSet = new Set();
  const genreCounts = {};
  history.forEach(h => {
    if (h.genre) h.genre.split(',').forEach(g => {
      const t = g.trim(); if (!t) return;
      genreSet.add(t);
      genreCounts[t] = (genreCounts[t] || 0) + 1;
    });
  });

  const scores = history.map(h => parseFloat(h.score)).filter(s => !isNaN(s));
  const masterpieceCount = scores.filter(s => s >= 9).length;
  const demonCount = scores.filter(s => s < 3).length;
  const likedCount = history.filter(h => h.liked).length;

  // "Le Difficile" / "Le Bon Public" : compte de tranches COMPLÈTES et
  // DISJOINTES de 20 notes consécutives (par ordre chronologique
  // d'ajout) dont la moyenne franchit le seuil — pas une fenêtre glissante
  // (qui compterait la même série de bons/mauvais films des dizaines de
  // fois de suite), une vraie répétition de la performance sur des lots
  // différents.
  const chronological = [...history].sort((a, b) => (a.savedAt || a.date || '').localeCompare(b.savedAt || b.date || ''));
  let hardCount = 0, crowdPleaserCount = 0;
  for (let i = 0; i + 20 <= chronological.length; i += 20) {
    const slice = chronological.slice(i, i + 20);
    const sliceAvg = slice.reduce((sum, h) => sum + (parseFloat(h.score) || 0), 0) / slice.length;
    if (sliceAvg < 5) hardCount++;
    if (sliceAvg > 8) crowdPleaserCount++;
  }

  // "Le Puriste" : plus longue série de films notés d'affilée SANS le bonus
  // coup de cœur (ordre chronologique) — l'inverse exact de Coup de Foudre.
  let purestStreak = 0, purestMax = 0;
  chronological.forEach(h => {
    if (h.liked) { purestStreak = 0; } else { purestStreak++; purestMax = Math.max(purestMax, purestStreak); }
  });

  const defs = [
    { id: 'critique',   name: 'Le Critique',   icon: '🎬', ...tierify(history.length + tvRatings.length, [10, 100, 500]) },
    { id: 'marathonien',name: 'Marathonien',    icon: '⏱️', ...tierify(totalMinutes, [24 * 60, 100 * 60, 500 * 60]) },
    { id: 'fidelite',   name: 'Fidélité',       icon: '🔥', ...tierify(dayStreak, [3, 10, 30]) },
    { id: 'chef_oeuvre',name: 'Chef-d\'Œuvre',  icon: '🏆', ...tierify(masterpieceCount, [5, 25, 50]) },
    { id: 'ame_demon',  name: 'L\'Âme du Démon',icon: '😈', ...tierify(demonCount, [1, 10, 25]) },
    { id: 'difficile',  name: 'Le Difficile',   icon: '📉', ...tierify(hardCount, [1, 5, 10]) },
    { id: 'bon_public', name: 'Le Bon Public',  icon: '📈', ...tierify(crowdPleaserCount, [1, 5, 10]) },
    { id: 'coup_foudre',name: 'Coup de Foudre', icon: '❤️', ...tierify(likedCount, [5, 25, 50]) },
    { id: 'puriste',    name: 'Le Puriste',     icon: '🎭', ...tierify(purestMax, [20, 50, 100]) },
  ];

  // Noms "flavor" repris du document quand ils existent pour ce genre
  // précis ; repli générique "Fan de X" sinon — un genre exploré mais non
  // listé dans le document (ex: "Fantastique" seul, sans le "Dark" de
  // "Chasseur de Démons") reste un badge normal, pas un badge absent.
  const GENRE_FLAVOR_NAMES = {
    'Horreur': 'Livre des Morts', 'Comédie': 'Rire en Boîte',
    'Science-Fiction': 'Sabres & Lasers', 'Drame': 'Départ Soudain',
    'Animation': 'Otaku', 'Romance': 'Le Romantique',
    'Aventure': 'Cape et Épée', 'Documentaire': 'Documentaliste',
    'Musique': 'Symphonie', 'Western': 'Westerner',
  };
  const genreBadges = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // les 8 genres les plus regardés seulement, pour ne pas surcharger la grille
    .map(([genre, count]) => ({
      id: 'genre_' + genre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_'),
      name: GENRE_FLAVOR_NAMES[genre] || `Fan de ${genre}`,
      icon: '🎞️',
      ...tierify(count, [5, 50, 100]),
    }));

  return defs.concat(genreBadges);
}

// ─── Compatibilité Node (tests) sans rien changer au comportement navigateur ──
// Ludex 2.0 : regroupement des coups de cœur consécutifs pour la grille
// Historique (films ET séries, voir Ludex_Historique_Grille_Base6) — une
// grille 3 colonnes classique laisse un vide non comblé quand plusieurs
// vedettes (coup de cœur ou note ≥8.5) se suivent, puisqu'une carte 2×2 ne
// trouve pas toujours de petite carte disponible juste à côté pour combler
// le tiers restant. Fonction pure (testable indépendamment) : reçoit les
// items DANS L'ORDRE D'AFFICHAGE d'un seul groupe (un mois, ou toute la
// liste séries qui n'a pas de découpage mensuel) et renvoie le palier de
// chacun, sans jamais réordonner les items eux-mêmes.
//
// Règles (voir le document de spécification) :
// - Une vedette isolée (pas de vedette juste avant/après) → 'isolated' (66%,
//   2 lignes de haut) — SAUF si c'est la toute dernière chose du groupe,
//   auquel cas rien ne reste pour combler le tiers manquant → 'banner' (100%).
// - Un nombre PAIR de vedettes consécutives → regroupées deux par deux en
//   'pair' (50/50 côte à côte).
// - Un nombre IMPAIR de vedettes consécutives (3, 5, 7...) → la première
//   absorbe le surplus en 'banner' (100%), les suivantes se regroupent
//   normalement en paires.
function computeFeaturedTiers(items, isFeaturedFn) {
  const tiers = new Array(items.length).fill('normal');
  let i = 0;
  while (i < items.length) {
    if (!isFeaturedFn(items[i])) { i++; continue; }
    let j = i;
    while (j < items.length && isFeaturedFn(items[j])) j++;
    const runLength = j - i;
    const isLastInGroup = j === items.length;

    if (runLength === 1) {
      tiers[i] = isLastInGroup ? 'banner' : 'isolated';
    } else {
      let k = i;
      if (runLength % 2 === 1) { tiers[k] = 'banner'; k++; }
      for (; k < j; k += 2) { tiers[k] = 'pair'; tiers[k + 1] = 'pair'; }
    }
    i = j;
  }
  return tiers;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeQuickScore,
    computeWeightedScore,
    computeShowAverageScore,
    scoreToStars,
    getStarStr,
    historyItemKey,
    watchlistItemKey,
    tvShowItemKey,
    mergeTombstoneLists,
    mergeHistory,
    mergeWatchlist,
    mergeTvShows,
    normalizeTvShows,
    stampTvChanges,
    TOMBSTONE_MAX_AGE_MS,
    getDesc,
    DESCS,
    DESCS_TV_OVERRIDES,
    computeCriteriaAverages,
    formatWatchTime,
    getISOWeekKey,
    computeWeekStreak,
    computeDayStreak,
    tierify,
    computeBadges,
    computeWrappedStats,
    computeEloUpdate,
    parseCsv,
    mapLetterboxdCsv,
    computeDailyCounts,
    computeDecadeStats,
    findOneYearAgoFilm,
    normalizeHistoryItemV2,
    computeFeaturedTiers,
  };
}
