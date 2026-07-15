// ═══════════════════════════════════════════
//  DUELS ELO
// ═══════════════════════════════════════════
// "Lequel préfères-tu ?" : l'app propose deux films déjà vus, on choisit, et
// un classement personnel se construit duel après duel — système ELO, le même
// que les échecs. Pourquoi ELO plutôt qu'un tri manuel : chaque duel n'exige
// qu'une micro-décision facile ("celui-là"), et le classement global émerge
// tout seul, y compris entre films jamais comparés directement.
//
// Les cotes vivent dans leur propre clé localStorage (lbx_duels), séparée de
// l'historique : l'export/import de l'historique n'est pas pollué par des
// données de jeu, et supprimer un film de l'historique ne casse rien ici
// (sa cote devient simplement orpheline et ignorée).

const DUELS_KEY = 'lbx_duels';
const DUEL_START_ELO = 1200;
const DUEL_K = 32; // facteur K standard : assez réactif sans être erratique

function duelFilmKey(item) {
  return (item.title + '|' + (item.year || '')).toLowerCase();
}

function loadDuelsData() {
  try {
    const d = JSON.parse(localStorage.getItem(DUELS_KEY)) || {};
    // pairs : memoire des affrontements deja joues (cle canonique triee),
    // pour ne JAMAIS reproposer deux fois le meme duel. Le || {} assure la
    // compatibilite avec les donnees d'avant cette fonctionnalite.
    return { ratings: d.ratings || {}, totalDuels: d.totalDuels || 0, pairs: d.pairs || {} };
  }
  catch { return { ratings: {}, totalDuels: 0, pairs: {} }; }
}

function duelPairKey(keyA, keyB) {
  return [keyA, keyB].sort().join('||');
}
function saveDuelsData(data) {
  localStorage.setItem(DUELS_KEY, JSON.stringify(data));
}

function getDuelRating(data, key) {
  return data.ratings[key] || { elo: DUEL_START_ELO, duels: 0 };
}

// Cœur mathématique dans 03b-pure-logic.js (computeEloUpdate), testé dans
// tests/duels.test.js — ici uniquement le stockage, la sélection de paires
// et le rendu.

// Choisit la paire du prochain duel : privilégie les films les MOINS déjà
// duellés, puis parmi eux, deux films aux cotes PROCHES — mais JAMAIS deux
// films qui se sont déjà affrontés (mémoire data.pairs). Si toutes les paires
// possibles ont été jouées, retourne { exhausted: true } pour un message dédié.
function pickDuelPair() {
  const history = loadHistory();
  if (history.length < 2) return null;
  const data = loadDuelsData();

  // Déduplique par clé (re-visionnages = même film)
  const seen = new Set();
  const films = [];
  for (const item of history) {
    const key = duelFilmKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    films.push({ key, item, ...getDuelRating(data, key) });
  }
  if (films.length < 2) return null;

  // Candidats "premier du duel" : les moins expérimentés d'abord (tout
  // l'historique finit par participer), avec un peu de hasard dans l'ordre.
  const byExperience = films.slice().sort((a, b) => a.duels - b.duels || Math.random() - 0.5);

  for (const first of byExperience) {
    // Adversaires possibles : jamais affrontés, triés par proximité de cote,
    // choix aléatoire parmi les 5 plus proches pour varier.
    const unfought = films.filter(f =>
      f.key !== first.key && !data.pairs[duelPairKey(first.key, f.key)]
    );
    if (unfought.length === 0) continue;
    unfought.sort((a, b) => Math.abs(a.elo - first.elo) - Math.abs(b.elo - first.elo));
    const nearest = unfought.slice(0, Math.min(5, unfought.length));
    const second = nearest[Math.floor(Math.random() * nearest.length)];
    return Math.random() < 0.5 ? [first, second] : [second, first];
  }

  return { exhausted: true }; // toutes les paires possibles ont été jouées
}

function resolveDuel(winnerKey, loserKey) {
  const data = loadDuelsData();
  const w = getDuelRating(data, winnerKey);
  const l = getDuelRating(data, loserKey);
  const { winnerElo, loserElo, delta } = computeEloUpdate(w.elo, l.elo, DUEL_K);
  data.ratings[winnerKey] = { elo: winnerElo, duels: w.duels + 1 };
  data.ratings[loserKey] = { elo: loserElo, duels: l.duels + 1 };
  data.pairs[duelPairKey(winnerKey, loserKey)] = true; // ce duel ne sera plus jamais reproposé
  data.totalDuels = (data.totalDuels || 0) + 1;
  saveDuelsData(data);
  return delta;
}

// Classement : uniquement les films ayant réellement duellé (>= 3 duels pour
// éviter qu'un film à 1 victoire chanceuse squatte le podium), croisé avec
// l'historique pour ignorer les cotes orphelines de films supprimés.
function computeDuelRanking(minDuels = 3) {
  const history = loadHistory();
  const data = loadDuelsData();
  const seen = new Set();
  const ranked = [];
  for (const item of history) {
    const key = duelFilmKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    const r = data.ratings[key];
    if (r && r.duels >= minDuels) ranked.push({ key, item, elo: r.elo, duels: r.duels });
  }
  ranked.sort((a, b) => b.elo - a.elo);
  return ranked;
}

// ── Rendu ──
let currentDuelPair = null;

function duelPosterHtml(item) {
  return item.poster
    ? `<img class="duel-poster" src="${item.poster}" alt="" loading="lazy" decoding="async">`
    : `<div class="duel-poster duel-poster-ph">${ICONS.clapper}</div>`;
}

function renderDuel() {
  const arena = document.getElementById('duel-arena');
  const emptyEl = document.getElementById('duel-empty');
  if (!arena || !emptyEl) return;

  currentDuelPair = pickDuelPair();
  if (!currentDuelPair || currentDuelPair.exhausted) {
    arena.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.textContent = currentDuelPair && currentDuelPair.exhausted
      ? 'Tous les duels possibles ont été joués — ton classement est complet ! Note de nouveaux films pour relancer l\'arène.'
      : 'Note au moins 2 films pour lancer les duels.';
    if (currentDuelPair && currentDuelPair.exhausted) currentDuelPair = null;
    return;
  }
  arena.style.display = '';
  emptyEl.style.display = 'none';

  const [a, b] = currentDuelPair;
  arena.innerHTML = `
    <div class="duel-side" data-key="${escAttr(a.key)}" role="button" tabindex="0" aria-label="Choisir ${escAttr(a.item.title)}">
      ${duelPosterHtml(a.item)}
      <div class="duel-title">${escAttr(a.item.title)}</div>
      <div class="duel-year">${a.item.year || ''}</div>
    </div>
    <div class="duel-vs">VS</div>
    <div class="duel-side" data-key="${escAttr(b.key)}" role="button" tabindex="0" aria-label="Choisir ${escAttr(b.item.title)}">
      ${duelPosterHtml(b.item)}
      <div class="duel-title">${escAttr(b.item.title)}</div>
      <div class="duel-year">${b.item.year || ''}</div>
    </div>
  `;
}

function renderDuelRanking() {
  const listEl = document.getElementById('duel-ranking-list');
  const counterEl = document.getElementById('duel-counter');
  if (!listEl) return;
  const data = loadDuelsData();
  if (counterEl) counterEl.textContent = data.totalDuels > 0 ? `${data.totalDuels} duel${data.totalDuels > 1 ? 's' : ''}` : '';

  const ranking = computeDuelRanking().slice(0, 10);
  if (ranking.length === 0) {
    listEl.innerHTML = `<div class="duel-ranking-empty">Ton podium apparaîtra après quelques duels (3 duels minimum par film).</div>`;
    return;
  }
  // Podium (top 3) toujours visible, sans les points ELO — c'est l'ORDRE qui
  // compte pour l'utilisateur, le chiffre interne n'apporte que du bruit. Le
  // reste du top 10 se déplie à la demande (accordéon natif <details>).
  const medals = ['🥇', '🥈', '🥉'];
  const rowHtml = (r, i) => `
    <div class="duel-rank-row">
      <span class="duel-rank-pos">${medals[i] || (i + 1)}</span>
      <span class="duel-rank-title">${escAttr(r.item.title)}</span>
    </div>`;
  const podium = ranking.slice(0, 3).map(rowHtml).join('');
  const rest = ranking.slice(3);
  const restHtml = rest.length > 0 ? `
    <details class="duel-rank-more">
      <summary>Voir le reste du top 10 (${rest.length})</summary>
      ${rest.map((r, i) => rowHtml(r, i + 3)).join('')}
    </details>` : '';
  listEl.innerHTML = podium + restHtml;
}

function renderDuelsSection() {
  renderDuel();
  renderDuelRanking();
}

// Gestion des choix : délégué au niveau racine (leçon apprise : jamais dans
// une fonction de rendu conditionnelle, sinon il disparaît selon le chemin).
document.getElementById('duel-arena')?.addEventListener('click', (e) => {
  const side = e.target.closest('.duel-side');
  if (!side || !currentDuelPair) return;
  const winnerKey = side.dataset.key;
  const loser = currentDuelPair.find(f => f.key !== winnerKey);
  const winner = currentDuelPair.find(f => f.key === winnerKey);
  if (!winner || !loser) return;

  resolveDuel(winner.key, loser.key);
  if (navigator.vibrate) navigator.vibrate(15);

  // Petit feedback visuel avant d'enchaîner sur la paire suivante
  side.classList.add('duel-winner');
  currentDuelPair = null; // fige les clics le temps de l'animation
  setTimeout(() => {
    renderDuelsSection();
  }, 450);
});

document.getElementById('duel-arena')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const side = e.target.closest('.duel-side');
  if (side) { e.preventDefault(); side.click(); }
});

document.getElementById('duel-skip-btn')?.addEventListener('click', () => {
  renderDuel(); // nouvelle paire, aucune cote touchée
});
