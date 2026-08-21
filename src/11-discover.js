// ═══════════════════════════════════════════
//  DÉCOUVRIR — feuille blanche (voir Ludex_Specifications_Decouverte.pdf)
// ═══════════════════════════════════════════
// Plus de swipe, de jeu de devinette, de quiz, d'angles morts ni de
// "Parcourir" : trois blocs seulement — toggle Films/Séries sticky, Choix
// du jour (hero plein cadre, affiche + titre seulement), et 4 carrousels
// horizontaux d'affiches pures (Nouveautés, Classiques intemporels, Cinéma
// international, D'après ton historique). Duels a été déplacé vers Profil
// (voir 13-duels.js, inchangé — seul son emplacement dans le DOM change).

let discoverMediaType = 'movie'; // 'movie' | 'tv' — état du toggle, partagé par les 4 blocs
let discoverLoaded = false; // pas de re-fetch à chaque retour sur l'onglet — voir switchRightTab

function normalizeItem(m) {
  // Uniformise film/série : title/name, release_date/first_air_date — pour
  // que le reste du code n'ait jamais à savoir lequel des deux il manipule.
  return {
    id: m.id,
    title: m.title || m.name || '',
    year: (m.release_date || m.first_air_date || '').slice(0, 4),
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
  };
}

// ── Toggle Films/Séries ──
const discoverSegBtns = document.querySelectorAll('.discover-seg-btn');
function setDiscoverMediaType(type) {
  if (type === discoverMediaType) return;
  discoverMediaType = type;
  discoverSegBtns.forEach(b => b.classList.toggle('active', b.dataset.mediaType === type));
  // "Cinéma international" n'a de sens qu'en mode Films — en Séries, le
  // même carrousel (même source de données, juste discover/tv) devient
  // "Séries internationales".
  const intlTitleEl = document.getElementById('carousel-title-international');
  if (intlTitleEl) intlTitleEl.textContent = type === 'tv' ? 'Séries internationales' : 'Cinéma international';
  loadChoixDuJour();
  loadCarousel('nouveautes');
  loadCarousel('classiques');
  loadCarousel('international');
  loadCarousel('historique');
}
discoverSegBtns.forEach(btn => {
  btn.addEventListener('click', () => setDiscoverMediaType(btn.dataset.mediaType));
});

// ═══════════════════════════════════════════
//  CHOIX DU JOUR (hero)
// ═══════════════════════════════════════════
// Réutilise le tirage stable du jour (même graine que l'ancien "Film du
// jour" — un seul choix par jour, cohérent sur tous les appareils) mais
// sans le jeu de devinette : affiche + titre seulement, toute la carte
// cliquable vers la fiche.
const CHOIX_DU_JOUR_KEY = 'lbx_choix_du_jour';

async function loadChoixDuJour() {
  const heroEl = document.getElementById('choix-du-jour-card');
  if (!heroEl) return;
  const todayKey = new Date().toISOString().slice(0, 10);
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CHOIX_DU_JOUR_KEY) || 'null'); } catch { /* ignore */ }

  if (cached && cached.date === todayKey && cached.mediaType === discoverMediaType && cached.movie) {
    renderChoixDuJour(cached.movie);
    return;
  }

  heroEl.innerHTML = `<div class="skeleton-bg" style="width:100%;height:100%;border-radius:16px;"></div>`;
  try {
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const res = await fetch(`/api/search?dailyPick=${daysSinceEpoch}&mediaType=${discoverMediaType}`);
    const data = await res.json();
    const pick = data.result;
    if (!pick) return;
    const item = normalizeItem(pick);
    // Second appel pour le réalisateur (le tirage du jour ne renvoie que les
    // champs de base, sans crédits — voir dailyPick dans api/search.js). Ne
    // bloque pas l'affichage de l'affiche+titre si cet appel échoue ou tarde :
    // rendu immédiat sans réalisateur, puis complété dès qu'il arrive.
    renderChoixDuJour(item);
    localStorage.setItem(CHOIX_DU_JOUR_KEY, JSON.stringify({ date: todayKey, mediaType: discoverMediaType, movie: item }));

    const detailEndpoint = discoverMediaType === 'tv' ? `tvId=${item.id}` : `id=${item.id}`;
    const detailRes = await fetch(`/api/search?${detailEndpoint}`);
    const details = await detailRes.json();
    const director = discoverMediaType === 'tv'
      ? details.created_by?.[0]?.name
      : details.credits?.crew?.find(c => c.job === 'Director')?.name;
    if (director) {
      item.director = director;
      renderChoixDuJour(item);
      localStorage.setItem(CHOIX_DU_JOUR_KEY, JSON.stringify({ date: todayKey, mediaType: discoverMediaType, movie: item }));
    }
  } catch (e) {
    console.warn('Impossible de charger le choix du jour', e);
  }
}

function renderChoixDuJour(item) {
  const heroEl = document.getElementById('choix-du-jour-card');
  if (!heroEl) return;
  const posterUrl = item.poster_path ? tmdbImage(item.poster_path, 'w780') : '';
  heroEl.innerHTML = `
    <div class="choix-du-jour-bg" style="background-image:url('${posterUrl}')"></div>
    <div class="choix-du-jour-overlay"></div>
    <div class="choix-du-jour-content">
      <div class="choix-du-jour-title">${escAttr(item.title)}</div>
      ${item.director ? `<div class="choix-du-jour-director">Réalisé par ${escAttr(item.director)}</div>` : ''}
    </div>
  `;
  heroEl.dataset.itemId = String(item.id);
  heroEl.dataset.mediaType = discoverMediaType;
}

document.getElementById('choix-du-jour-card')?.addEventListener('click', function() {
  const id = this.dataset.itemId;
  if (!id) return;
  if (this.dataset.mediaType === 'tv') openTvDetailSheet(id);
  else openMovieDetailSheet(id);
});
document.getElementById('choix-du-jour-card')?.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  this.click();
});

// ═══════════════════════════════════════════
//  LES 4 CARROUSELS
// ═══════════════════════════════════════════
// Une seule fonction générique : chaque carrousel ne diffère que par sa
// source de données (voir CAROUSEL_SOURCES). Rendu SANS le doublement de
// liste utilisé par l'ancien carrousel Tendances (qui donnait l'impression
// d'un film en double en cours de défilement) — juste un défilement
// horizontal normal, pas de boucle infinie.

async function fetchNouveautes() {
  // "Nouveautés" = tendances de la semaine (trending/all/week filtré par le
  // media_type actif), dédupliquées par id — TMDb peut renvoyer un même
  // titre sur deux pages différentes de sa fenêtre de calcul.
  const res = await fetch('/api/search?trending=true');
  const data = await res.json();
  const seen = new Set();
  return (data.results || [])
    .filter(m => m.poster_path && m.media_type === discoverMediaType)
    .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
    .slice(0, 15)
    .map(normalizeItem);
}

async function fetchClassiques() {
  // "Classiques intemporels" = meilleurs films/séries d'une décennie au
  // hasard parmi les 5 dernières — varie un peu d'un chargement à l'autre
  // plutôt que de toujours montrer la même décennie fixe.
  const decades = [1970, 1980, 1990, 2000, 2010];
  const startYear = decades[Math.floor(Math.random() * decades.length)];
  const res = await fetch(`/api/search?decadeTop=${startYear}&mediaType=${discoverMediaType}`);
  const data = await res.json();
  return (data.results || []).slice(0, 15).map(normalizeItem);
}

async function fetchInternational() {
  // "Cinéma international" = un pays au hasard parmi une sélection connue
  // pour son cinéma, à chaque chargement — évite de montrer toujours le
  // même pays comme le ferait un choix fixe.
  const countries = ['KR', 'JP', 'FR', 'IT', 'IN', 'ES', 'DE', 'MX'];
  const cc = countries[Math.floor(Math.random() * countries.length)];
  const res = await fetch(`/api/search?countryCode=${cc}&mediaType=${discoverMediaType}`);
  const data = await res.json();
  return (data.results || []).slice(0, 15).map(normalizeItem);
}

async function fetchHistorique() {
  // "D'après ton historique" = recommandations TMDb agrégées à partir de
  // quelques films/séries de l'historique, choisis pour leur diversité de
  // genre plutôt qu'au hasard pur (voir pickDiverseBasisItems) — même
  // logique que l'ancienne pile de suggestions "swipe", réutilisée ici.
  // Films et séries vivent dans deux stockages différents (loadHistory() vs
  // loadTvShows(), avec tmdbId vs tmdbTvId) — normalisés ici en un seul
  // tableau { tmdbId, genre } pour que pickDiverseBasisItems n'ait pas à
  // connaître la différence.
  const basisPool = discoverMediaType === 'tv'
    ? loadTvShows().map(s => ({ tmdbId: s.tmdbTvId, genre: s.genre || '' }))
    : loadHistory().filter(h => h.tmdbId).map(h => ({ tmdbId: h.tmdbId, genre: h.genre || '' }));
  if (basisPool.length === 0) return [];
  const basis = pickDiverseBasisItems(basisPool, 3);
  markBasisUsed(basis.map(f => f.tmdbId));
  const seenIds = new Set(basisPool.map(f => String(f.tmdbId)));

  const results = await Promise.allSettled(
    basis.map(item => fetch(`/api/search?id=${item.tmdbId}&recommendations=true&mediaType=${discoverMediaType}`).then(r => r.json()))
  );
  const allRecs = [];
  results.forEach(r => {
    if (r.status !== 'fulfilled') return;
    const arr = r.value.results || (Array.isArray(r.value) ? r.value : []);
    allRecs.push(...arr);
  });

  const addedIds = new Set();
  const unique = [];
  allRecs.forEach(m => {
    if (!m || !m.id || !m.poster_path) return;
    const idStr = String(m.id);
    if (addedIds.has(idStr) || seenIds.has(idStr)) return;
    addedIds.add(idStr);
    unique.push(m);
  });
  // Fisher-Yates — pas .sort(Math.random()) (biaisé), pour ne pas grouper
  // les résultats par film de base (donc souvent par genre).
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, 15).map(normalizeItem);
}

const CAROUSEL_SOURCES = {
  nouveautes: fetchNouveautes,
  classiques: fetchClassiques,
  international: fetchInternational,
  historique: fetchHistorique,
};

async function loadCarousel(key) {
  const rowEl = document.getElementById(`carousel-${key}`);
  const blockEl = document.getElementById(`carousel-block-${key}`);
  if (!rowEl || !blockEl) return;
  rowEl.innerHTML = Array.from({ length: 5 }, () => `<div class="poster-min skeleton-bg"></div>`).join('');
  blockEl.style.display = 'block';
  try {
    const items = await CAROUSEL_SOURCES[key]();
    if (items.length === 0) { blockEl.style.display = 'none'; return; }
    rowEl.innerHTML = items.map(item => `
      <div class="poster-min" data-item-id="${item.id}" data-media-type="${discoverMediaType}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
        ${item.poster_path
          ? `<img src="${tmdbImage(item.poster_path, 'w200')}" alt="Affiche de ${escAttr(item.title)}" loading="lazy">`
          : ''}
      </div>`).join('');
  } catch (e) {
    console.warn(`Impossible de charger le carrousel ${key}`, e);
    blockEl.style.display = 'none';
  }
}

// Clic délégué : un seul écouteur pour les 4 carrousels plutôt qu'un par
// vignette (des dizaines d'affiches au total entre les 4 blocs).
document.getElementById('view-discover')?.addEventListener('click', (e) => {
  const poster = e.target.closest('.poster-min[data-item-id]');
  if (!poster) return;
  if (poster.dataset.mediaType === 'tv') openTvDetailSheet(poster.dataset.itemId);
  else openMovieDetailSheet(poster.dataset.itemId);
});
document.getElementById('view-discover')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const poster = e.target.closest('.poster-min[data-item-id]');
  if (!poster) return;
  e.preventDefault();
  poster.click();
});

// ── Base diversifiée pour "D'après ton historique" (repris de l'ancienne
// pile de suggestions, généralisé film/série) ──
const DISCOVER_BASIS_USED_KEY = 'lbx_discover_basis_used';
function loadBasisUsed() {
  try { return JSON.parse(localStorage.getItem(DISCOVER_BASIS_USED_KEY)) || []; } catch { return []; }
}
function markBasisUsed(tmdbIds) {
  const used = loadBasisUsed();
  used.push(...tmdbIds.map(String));
  localStorage.setItem(DISCOVER_BASIS_USED_KEY, JSON.stringify(used.slice(-30)));
}
function pickDiverseBasisItems(pool, count) {
  const used = new Set(loadBasisUsed());
  const fresh = pool.filter(f => !used.has(String(f.tmdbId)));
  const candidates = fresh.length >= count ? fresh : pool;

  const byGenre = {};
  candidates.forEach(f => {
    const primaryGenre = (f.genre || '').split(',')[0].trim() || 'Autre';
    (byGenre[primaryGenre] = byGenre[primaryGenre] || []).push(f);
  });

  const genres = Object.keys(byGenre).sort(() => 0.5 - Math.random());
  const picked = [];
  for (const g of genres) {
    if (picked.length >= count) break;
    const arr = byGenre[g];
    picked.push(arr[Math.floor(Math.random() * arr.length)]);
  }
  const remaining = candidates.filter(f => !picked.includes(f));
  while (picked.length < count && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    picked.push(remaining.splice(idx, 1)[0]);
  }
  return picked;
}

// Point d'entrée unique, appelé depuis 01-navigation.js au premier
// affichage de l'onglet Découvrir.
function loadDiscoverTab() {
  loadChoixDuJour();
  Object.keys(CAROUSEL_SOURCES).forEach(loadCarousel);
}
