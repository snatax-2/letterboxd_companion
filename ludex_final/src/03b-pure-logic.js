// ═══════════════════════════════════════════
//  LOGIQUE PURE (testable) : calcul du score & fusion cloud
// ═══════════════════════════════════════════
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

const _descCache = {};
function getDesc(criterion, val) {
  const key = criterion + val;
  if (_descCache[key]) return _descCache[key];
  const tiers = DESCS[criterion];

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

// Badges débloqués selon l'historique — chaque entrée est indépendante,
// aucune ne dépend d'un ordre de déblocage particulier.
// ─── Rétrospective annuelle ("Wrapped") ─────────────────────────────────────
// Filtre l'historique sur UNE année (par savedAt, ou date à défaut) et en
// tire les temps forts — genre/réalisateur/acteur/mois les plus présents,
// film le mieux noté, temps total visionné. Fonction pure : ne touche à
// aucun DOM, juste des données en entrée/sortie, pour rester testable
// facilement (contrairement aux tests E2E, plus lents et parfois instables).
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

function computeBadges(history, extras = {}) {
  // Déclaré ICI (local, pas en haut du fichier) : même bug que
  // CRITERIA_SHORT_LABELS et CONTEXT_TAG_ICONS rencontré précédemment — un
  // `const` top-level serait dans sa "zone morte temporelle" tant que
  // l'exécution n'a pas atteint cette ligne, or `renderAll()` est appelée de
  // façon précoce (03-foundation.js) avant même que 03b-pure-logic.js n'ait
  // fini de s'exécuter.
  const GENRE_BADGE_THRESHOLD = 5;
  const totalMinutes = extras.totalMinutes || 0;
  const streak = extras.streak || 0;
  const genreSet = new Set();
  const genreCounts = {};
  history.forEach(h => {
    if (h.genre) h.genre.split(',').forEach(g => {
      const t = g.trim(); if (!t) return;
      genreSet.add(t);
      genreCounts[t] = (genreCounts[t] || 0) + 1;
    });
  });
  const reviewCount = history.filter(h => h.review && h.review.trim().length > 0).length;

  const defs = [
    { id: 'films_10',  label: '10 films notés',        unlocked: history.length >= 10 },
    { id: 'films_50',  label: '50 films notés',         unlocked: history.length >= 50 },
    { id: 'films_100', label: '100 films notés',        unlocked: history.length >= 100 },
    { id: 'genres_5',  label: '5 genres différents',    unlocked: genreSet.size >= 5 },
    { id: 'genres_10', label: '10 genres différents',   unlocked: genreSet.size >= 10 },
    { id: 'reviews_10',label: '10 critiques écrites',   unlocked: reviewCount >= 10 },
    { id: 'streak_4',  label: '4 semaines de suite',    unlocked: streak >= 4 },
    { id: 'marathon',  label: 'Marathon (24h de films)',unlocked: totalMinutes >= 24 * 60 },
    { id: 'cinephile', label: 'Cinéphile (7j de films)',unlocked: totalMinutes >= 7 * 24 * 60 },
  ];

  // Un badge par genre RÉELLEMENT exploré (au moins un film), pas une liste
  // figée de tous les genres TMDb possibles — évite d'afficher des dizaines
  // de badges verrouillés pour des genres jamais regardés. Triés du plus au
  // moins regardé, pour mettre en avant ce qui définit vraiment les goûts de
  // l'utilisateur.
  const genreBadges = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // les 8 genres les plus regardés seulement, pour ne pas surcharger la grille
    .map(([genre, count]) => ({
      id: 'genre_' + genre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_'),
      label: `Fan de ${genre} (${Math.min(count, GENRE_BADGE_THRESHOLD)}/${GENRE_BADGE_THRESHOLD})`,
      unlocked: count >= GENRE_BADGE_THRESHOLD,
    }));

  return defs.concat(genreBadges);
}

// ─── Compatibilité Node (tests) sans rien changer au comportement navigateur ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeQuickScore,
    computeWeightedScore,
    scoreToStars,
    getStarStr,
    historyItemKey,
    watchlistItemKey,
    mergeTombstoneLists,
    mergeHistory,
    mergeWatchlist,
    TOMBSTONE_MAX_AGE_MS,
    getDesc,
    DESCS,
    computeCriteriaAverages,
    formatWatchTime,
    getISOWeekKey,
    computeWeekStreak,
    computeBadges,
    computeWrappedStats,
  };
}
