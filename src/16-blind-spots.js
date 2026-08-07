// ═══════════════════════════════════════════
//  ANGLE MORT CIBLÉ (Découvrir)
// ═══════════════════════════════════════════
// "Tu adores [réalisateur], il te reste N films à découvrir" — transforme
// le % de filmographie déjà affiché sur la fiche personne (une simple
// donnée passive) en incitation concrète, dans Découvrir. Le vrai défi
// technique : l'historique stocke le réalisateur en texte simple, pas en
// identifiant TMDb — il faut faire le lien film par film (une fois, mis en
// cache définitivement, jamais recalculé) avant de pouvoir agréger quoi
// que ce soit par créateur.

const CREATOR_MATCH_CACHE_KEY = 'lbx_creator_match_cache';
const BLIND_SPOTS_CACHE_KEY = 'lbx_blind_spots';
const BLIND_SPOTS_CACHE_DAYS = 7; // les gouts recents peuvent changer le classement, contrairement aux listes figées

function loadCreatorMatchCache() {
  try { return JSON.parse(localStorage.getItem(CREATOR_MATCH_CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCreatorMatchCache(map) {
  localStorage.setItem(CREATOR_MATCH_CACHE_KEY, JSON.stringify(map));
}

// Une entrée par film déjà noté : { directorId, directorName } ou
// { directorId: null } si le film n'a pas de réalisateur crédité (rare,
// mais évite de re-essayer indéfiniment le même film sans résultat).
async function resolveOneFilmDirector(tmdbId) {
  try {
    const res = await fetch(`/api/search?id=${tmdbId}`);
    const data = await readApiJson(res);
    const director = data.credits?.crew?.find(c => c.job === 'Director');
    return director ? { directorId: director.id, directorName: director.name } : { directorId: null };
  } catch {
    return null; // erreur reseau : on ne met PAS en cache, pour retenter au prochain passage
  }
}

let creatorMatchInProgress = false;
// Traite par lots (respecte la limite de débit du proxy, comme la
// résolution de la liste "Tous les temps") — priorise les films les MIEUX
// notés d'abord : plus susceptibles de faire remonter un créateur pertinent
// rapidement, plutôt que de traiter l'historique dans un ordre arbitraire.
async function ensureCreatorMatchesResolved(onProgress) {
  if (creatorMatchInProgress) return;
  const history = loadHistory().filter(h => h.tmdbId);
  const cache = loadCreatorMatchCache();
  const missing = history
    .filter(h => !(h.tmdbId in cache))
    .sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0));
  if (missing.length === 0) return;
  creatorMatchInProgress = true;

  const BATCH_SIZE = 8;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(h => resolveOneFilmDirector(h.tmdbId)));
    batch.forEach((h, idx) => {
      if (results[idx]) cache[h.tmdbId] = results[idx];
    });
    saveCreatorMatchCache(cache);
    if (onProgress) onProgress();
    if (i + BATCH_SIZE < missing.length) await new Promise(r => setTimeout(r, 1500));
  }
  creatorMatchInProgress = false;
}

// Agrège les notes par réalisateur à partir du cache de correspondance déjà
// résolu — ne déclenche AUCUN appel réseau (utilise ce qui est déjà là,
// même partiel). Minimum 2 films notés pour compter (une seule note ne dit
// pas grand-chose sur un "créateur préféré"), triés par note moyenne
// décroissante.
function computeTopCreators(minFilms = 2, topN = 3) {
  const history = loadHistory().filter(h => h.tmdbId);
  const cache = loadCreatorMatchCache();
  const seenIds = new Set(history.map(h => String(h.tmdbId)));
  const byDirector = {};

  history.forEach(h => {
    const match = cache[h.tmdbId];
    if (!match || !match.directorId) return;
    const score = parseFloat(h.score);
    if (!score) return;
    if (!byDirector[match.directorId]) {
      byDirector[match.directorId] = { id: match.directorId, name: match.directorName, scores: [], seenFilmIds: new Set() };
    }
    byDirector[match.directorId].scores.push(score);
    byDirector[match.directorId].seenFilmIds.add(String(h.tmdbId));
  });

  return Object.values(byDirector)
    .filter(d => d.scores.length >= minFilms)
    .map(d => ({ ...d, avg: d.scores.reduce((a, b) => a + b, 0) / d.scores.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, topN);
}

async function fetchCreatorBlindSpot(directorId) {
  try {
    const res = await fetch(`/api/search?personId=${directorId}`);
    const data = await readApiJson(res);
    if (!data || !data.name) return null;
    const films = buildPersonFilmography(data);
    const { seenCount, total } = computeSeenPercentage(films);
    return { unseenCount: total - seenCount, total };
  } catch {
    return null;
  }
}

function loadBlindSpotsCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(BLIND_SPOTS_CACHE_KEY) || 'null');
    if (!raw) return null;
    const ageDays = (Date.now() - raw.fetchedAt) / 86400000;
    if (ageDays > BLIND_SPOTS_CACHE_DAYS) return null;
    return raw.creators;
  } catch { return null; }
}

async function renderBlindSpotsSection() {
  const wrap = document.getElementById('blind-spots-wrap');
  const container = document.getElementById('blind-spots-container');
  if (!wrap || !container) return;

  const cached = loadBlindSpotsCache();
  if (cached) {
    renderBlindSpotsCards(cached);
    // Continue quand même la résolution en tâche de fond pour affiner au
    // fil du temps (nouveaux films notés depuis) — sans bloquer l'affichage
    // déjà en cache.
    ensureCreatorMatchesResolved();
    return;
  }

  // Première fois (ou cache expiré) : résout ce qui manque avant de calculer
  // le classement — sinon les tout premiers résultats seraient basés sur un
  // historique quasi vide.
  await ensureCreatorMatchesResolved();
  const topCreators = computeTopCreators();
  if (topCreators.length === 0) return; // pas assez de donnees encore (historique trop court, ou pas assez de recoupements) : section reste masquee

  const withBlindSpots = await Promise.all(topCreators.map(async (c) => {
    const spot = await fetchCreatorBlindSpot(c.id);
    return spot && spot.unseenCount > 0 ? { ...c, ...spot } : null;
  }));
  const creators = withBlindSpots.filter(Boolean);
  localStorage.setItem(BLIND_SPOTS_CACHE_KEY, JSON.stringify({ creators, fetchedAt: Date.now() }));
  renderBlindSpotsCards(creators);
}

function renderBlindSpotsCards(creators) {
  const wrap = document.getElementById('blind-spots-wrap');
  const container = document.getElementById('blind-spots-container');
  if (creators.length === 0) return; // reste masque (display:none par defaut)

  container.innerHTML = creators.map(c => `
    <button type="button" class="blind-spot-card" data-person-id="${c.id}" data-person-name="${escAttr(c.name)}">
      <div class="blind-spot-text">
        <span class="blind-spot-highlight">Tu adores ${escAttr(c.name)}</span>
        <span class="blind-spot-detail">${c.avg.toFixed(1)}/10 en moyenne sur ${c.scores.length} film${c.scores.length > 1 ? 's' : ''} — il te reste ${c.unseenCount} film${c.unseenCount > 1 ? 's' : ''} à découvrir</span>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon blind-spot-arrow"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  `).join('');

  container.querySelectorAll('.blind-spot-card').forEach(card => {
    card.addEventListener('click', () => openPersonDetailSheet(card.dataset.personId, card.dataset.personName));
  });

  wrap.style.display = 'block';
}
