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
  };
}
