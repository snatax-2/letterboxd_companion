// ═══════════════════════════════════════════
//  WATCHLIST & DYNAMIC RECOMMENDATIONS
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
//  WATCHLISTS MULTIPLES
// ═══════════════════════════════════════════
// Plusieurs listes nommées ("À voir", "Halloween", "Suggestions de Marie"...)
// plutôt qu'une seule. loadWatchlist()/saveWatchlist() ciblent toujours
// implicitement la liste ACTIVE — tout le code existant (rendu, swipe,
// synchro cloud, Découvrir) continue de fonctionner sans modification, sans
// savoir qu'il y a désormais plusieurs listes possibles.
//
// Ludex 2.0 : chaque fonction accepte maintenant un `mediaType` optionnel
// ('movie' par défaut) plutôt que d'être dupliquée en versions Tv séparées
// (voir Ludex_Specifications_Watchlist — "harmoniser en prenant comme
// modèle la watchlist des films") — c'est justement l'absence de source
// commune qui avait fait diverger films et séries la première fois
// (repéré via deux captures d'écran montrant des mises en page
// différentes). La valeur par défaut 'movie' préserve à l'identique tous
// les appels existants dans ce fichier : aucun n'a eu besoin d'être
// modifié pour ce changement, seuls les NOUVEAUX appels séries passent
// explicitement 'tv'.
function watchlistsMetaKey(mediaType = 'movie') { return mediaType === 'tv' ? 'lbx_tv_watchlists_meta' : 'lbx_watchlists_meta'; }
function activeWatchlistKey(mediaType = 'movie') { return mediaType === 'tv' ? 'lbx_active_tv_watchlist_id' : 'lbx_active_watchlist_id'; }
const LEGACY_WATCHLIST_KEY = 'lbx_watchlist'; // ancienne clé (liste unique, films), migrée au premier chargement
const LEGACY_TV_WATCHLIST_KEY = 'lbx_tv_watchlist'; // ancienne clé (liste unique, séries — voir migration plus bas)

function loadWatchlistsMeta(mediaType = 'movie') {
  return readJsonStorage(watchlistsMetaKey(mediaType), [], Array.isArray);
}
function saveWatchlistsMeta(meta, mediaType = 'movie') {
  return writeJsonStorage(watchlistsMetaKey(mediaType), meta);
}
function watchlistStorageKey(id, mediaType = 'movie') { return mediaType === 'tv' ? `lbx_tv_watchlist_${id}` : `lbx_watchlist_${id}`; }
function watchlistTombstonesKey(id, mediaType = 'movie') { return mediaType === 'tv' ? `lbx_tv_watchlist_tombstones_${id}` : `lbx_watchlist_tombstones_${id}`; }
const WATCHLIST_LIST_TOMBSTONES_KEY = 'lbx_watchlist_list_tombstones'; // listes ENTIÈRES supprimées (pas juste des items) — films
const TV_WATCHLIST_LIST_TOMBSTONES_KEY = 'lbx_tv_watchlist_list_tombstones'; // idem, séries
const LEGACY_WATCHLIST_TOMBSTONES_KEY = 'lbx_watchlist_tombstones'; // ancienne clé (liste unique), migrée avec le reste

// Migration ponctuelle : si l'ancienne clé unique existe et qu'aucune liste
// nommée n'a encore été créée, on la transforme en une première liste "À voir"
// — aucune perte de données pour les utilisateurs déjà en place. Fonction
// générique (mediaType) plutôt que dupliquée : appelée une fois pour les
// films, une fois pour les séries, juste en dessous.
function migrateLegacyWatchlist(mediaType = 'movie') {
  if (loadWatchlistsMeta(mediaType).length > 0) return; // déjà migré
  const legacyKey = mediaType === 'tv' ? LEGACY_TV_WATCHLIST_KEY : LEGACY_WATCHLIST_KEY;
  let legacyItems = [];
  legacyItems = readJsonStorage(legacyKey, [], Array.isArray);
  let legacyTombstones = [];
  if (mediaType === 'movie') {
    legacyTombstones = readJsonStorage(LEGACY_WATCHLIST_TOMBSTONES_KEY, [], Array.isArray);
  }
  const defaultId = 'default';
  saveWatchlistsMeta([{ id: defaultId, name: 'À voir' }], mediaType);
  writeJsonStorage(watchlistStorageKey(defaultId, mediaType), legacyItems);
  writeJsonStorage(watchlistTombstonesKey(defaultId, mediaType), legacyTombstones);
  writeTextStorage(activeWatchlistKey(mediaType), defaultId);
}
migrateLegacyWatchlist('movie');
migrateLegacyWatchlist('tv');

function getActiveWatchlistId(mediaType = 'movie') {
  let id = readTextStorage(activeWatchlistKey(mediaType));
  const meta = loadWatchlistsMeta(mediaType);
  if (!id || !meta.find(l => l.id === id)) {
    id = meta[0]?.id || 'default';
    writeTextStorage(activeWatchlistKey(mediaType), id);
  }
  return id;
}
function setActiveWatchlistId(id, mediaType = 'movie') {
  return writeTextStorage(activeWatchlistKey(mediaType), id);
}

function createWatchlistList(name, mediaType = 'movie') {
  const meta = loadWatchlistsMeta(mediaType);
  const id = 'wl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  meta.push({ id, name: name.trim() || 'Nouvelle liste' });
  if (!writeJsonStorage(watchlistStorageKey(id, mediaType), []) || !saveWatchlistsMeta(meta, mediaType)) return null;
  return id;
}
function renameWatchlistList(id, newName, mediaType = 'movie') {
  const meta = loadWatchlistsMeta(mediaType);
  const entry = meta.find(l => l.id === id);
  if (entry) { entry.name = newName.trim() || entry.name; saveWatchlistsMeta(meta, mediaType); }
}
function deleteWatchlistList(id, mediaType = 'movie') {
  let meta = loadWatchlistsMeta(mediaType);
  if (meta.length <= 1) return false; // toujours garder au moins une liste
  meta = meta.filter(l => l.id !== id);
  saveWatchlistsMeta(meta, mediaType);
  localStorage.removeItem(watchlistStorageKey(id, mediaType));
  localStorage.removeItem(watchlistTombstonesKey(id, mediaType));
  recordTombstone(mediaType === 'tv' ? TV_WATCHLIST_LIST_TOMBSTONES_KEY : WATCHLIST_LIST_TOMBSTONES_KEY, id); // pour que la suppression de la LISTE elle-même se propage via la synchro
  if (getActiveWatchlistId(mediaType) === id) setActiveWatchlistId(meta[0].id, mediaType);
  return true;
}

function loadWatchlist(listId, mediaType = 'movie') {
  return readJsonStorage(watchlistStorageKey(listId || getActiveWatchlistId(mediaType), mediaType), [], Array.isArray);
}
function saveWatchlist(list, listId, mediaType = 'movie') {
  return writeJsonStorage(watchlistStorageKey(listId || getActiveWatchlistId(mediaType), mediaType), list);
}

// ── Ludex 2.0 : tri et filtre (voir Ludex_Specifications_Watchlist) ──
// État séparé de celui de l'Historique (activeGenre/activeScoreFilter,
// 06a-history-list.js) — même vocabulaire visuel (.genre-chip) mais deux
// écrans indépendants, sinon choisir un genre ici filtrerait aussi
// l'Historique par erreur.
let wlSortOrder = 'recent';
let wlActiveGenre = null;
let wlDurationFilterOn = false;

function sortWatchlist(list) {
  if (wlSortOrder === 'rating') {
    // Les films sans note connue (ajoutés avant ce champ, ou échec réseau
    // au moment de l'ajout) descendent en fin de liste plutôt que de
    // fausser le tri en tête à cause d'un `undefined` traité comme 0.
    return [...list].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  }
  if (wlSortOrder === 'year') {
    return [...list].sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
  }
  return list; // 'recent' = déjà l'ordre de stockage (unshift à l'ajout)
}

function filterWatchlist(list) {
  return list.filter(item => {
    if (wlActiveGenre && !(item.genre || '').split(',').map(g => g.trim()).includes(wlActiveGenre)) return false;
    if (wlDurationFilterOn && !(typeof item.runtime === 'number' && item.runtime < 120)) return false;
    return true;
  });
}

function renderWlGenreChips(list) {
  const genres = getGenres(list);
  const row = document.getElementById('wl-genre-fold');
  const chips = document.getElementById('wl-genre-chips');
  const currentLabel = document.getElementById('wl-genre-fold-current');
  if (!row || !chips) return;
  if (genres.length === 0) { row.style.display = 'none'; return; }
  row.style.display = 'block';
  if (currentLabel) currentLabel.textContent = wlActiveGenre || 'Tous';
  chips.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'genre-chip all-chip' + (wlActiveGenre === null ? ' active' : '');
  allChip.textContent = 'Tous';
  allChip.addEventListener('click', () => { wlActiveGenre = null; renderWatchlist(); });
  chips.appendChild(allChip);

  genres.forEach(g => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip' + (wlActiveGenre === g ? ' active' : '');
    chip.textContent = g;
    chip.addEventListener('click', () => {
      wlActiveGenre = (wlActiveGenre === g) ? null : g;
      renderWatchlist();
    });
    chips.appendChild(chip);
  });
}

document.getElementById('wl-sort-row')?.addEventListener('click', (e) => {
  const durationBtn = e.target.closest('#wl-duration-filter');
  if (durationBtn) {
    wlDurationFilterOn = !wlDurationFilterOn;
    durationBtn.classList.toggle('active', wlDurationFilterOn);
    renderWatchlist();
    return;
  }
  const sortBtn = e.target.closest('.wl-sort-btn[data-sort]');
  if (!sortBtn) return;
  wlSortOrder = sortBtn.dataset.sort;
  document.querySelectorAll('#wl-sort-row .wl-sort-btn[data-sort]').forEach(b => b.classList.toggle('active', b === sortBtn));
  renderWatchlist();
});
// Le glissement sur une carte "À voir" a été retiré : attachWatchlistSwipeHandlers()
// (92 lignes) commençait par `if (isDefaultComposition()) return;`, et cette
// fonction renvoie `true` en dur depuis que la composition est appliquée aux
// 6 thèmes — « décision confirmée : compositions identiques partout, seules
// les couleurs/polices changent » (03-foundation.js). La garde était donc
// inconditionnelle : plus aucun thème n'atteignait ce code.
//
// Retirer / "vu, noter" restent disponibles par les boutons en surimpression
// (.wl-actions), qui appellent removeWatchlist() et watchlistToForm() — les
// mêmes fonctions que le geste utilisait. Aucune capacité perdue.
//
// Partent avec : les deux <div class="wl-swipe-hint"> que chaque carte
// rendait sans jamais pouvoir les révéler, et les 9 règles CSS associées.

// Ludex 2.0 : suggestions concrètes dans l'état vide — plutôt qu'un bouton
// "Découvrir" générique qui renvoie l'utilisateur bredouille à un autre
// onglet, 3 films populaires directement ajoutables en un tap. Réutilise le
// même endpoint tendances que Découvrir (trending=true), pas de nouvelle
// route à créer. Mise en cache mémoire simple : ne re-fetch pas à chaque
// fois que la watchlist active repasse à vide dans la même session.
let _wlEmptySuggestionsCache = null;
async function renderWatchlistEmptySuggestions() {
  const wrap = document.getElementById('wl-empty-suggestions');
  if (!wrap) return;
  try {
    let items = _wlEmptySuggestionsCache;
    if (!items) {
      const res = await fetch('/api/search?trending=true');
      const data = await res.json();
      items = (data.results || []).filter(m => m.media_type === 'movie' && m.poster_path).slice(0, 3);
      _wlEmptySuggestionsCache = items;
    }
    if (items.length === 0) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `
      <div class="wl-empty-suggestions-title">Quelques suggestions pour commencer :</div>
      <div class="wl-empty-suggestions-row">
        ${items.map(m => `
          <div class="wl-empty-sugg-card">
            <img class="wl-empty-sugg-poster editorial-image" src="${tmdbImage(m.poster_path, 'w200')}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">
            <div class="wl-empty-sugg-title">${escAttr(m.title)}</div>
            <button type="button" class="wl-empty-sugg-btn" data-movie-id="${m.id}" data-movie-title="${escAttr(m.title)}" data-movie-year="${(m.release_date || '').slice(0,4)}" data-poster="${escAttr(m.poster_path)}">+ Ajouter</button>
          </div>`).join('')}
      </div>`;
    if (typeof prepareEditorialImages === 'function') prepareEditorialImages(wrap);
  } catch (e) {
    console.warn('Impossible de charger les suggestions', e);
    wrap.innerHTML = '';
  }
}
// Délégué depuis #watchlist-list (toujours présent), pas depuis
// #wl-empty-suggestions lui-même — cet élément n'existe qu'une fois la
// liste vide effectivement rendue, jamais au moment où ce script s'exécute.
document.getElementById('watchlist-list')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.wl-empty-sugg-btn');
  if (!btn) return;
  addToWatchlistFromTMDb(
    { id: Number(btn.dataset.movieId), title: btn.dataset.movieTitle, poster_path: btn.dataset.poster },
    btn.dataset.movieYear
  );
});

function renderWatchlist() {
  const list = loadWatchlist();
  const container = document.getElementById('watchlist-list');
  const badge = document.getElementById('watchlist-count-badge');
  badge.textContent = list.length + ' film' + (list.length > 1 ? 's' : '');

  renderWlGenreChips(list);
  document.getElementById('wl-sort-row').style.display = list.length === 0 ? 'none' : 'flex';

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.target}</div>Rien au programme pour l'instant — ajoute les films que tu veux voir.<button type="button" class="empty-state-cta" id="empty-state-watchlist-cta">Découvrir des films à ajouter</button></div><div class="wl-empty-suggestions" id="wl-empty-suggestions"></div>`;
    window._justSavedWatchlistTitle = null;
    renderWatchlistEmptySuggestions();
    return;
  }

  const visible = filterWatchlist(sortWatchlist(list));
  if (visible.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.search}</div>Aucun film ne correspond à ce filtre.</div>`;
    window._justSavedWatchlistTitle = null;
    return;
  }

  container.innerHTML = '';
  visible.forEach((item) => {
    const i = list.indexOf(item); // index RÉEL dans la liste non triée — c'est lui que removeWatchlist()/watchlistToForm() attendent, pas la position affichée après tri/filtre.
    const div = document.createElement('div');
    div.className = 'wl-card';
    div.id = `wl-item-${i}`;
    if (window._justSavedWatchlistTitle && item.title.toLowerCase() === window._justSavedWatchlistTitle) {
      div.classList.add('wl-card-entering');
    }

    // Ludex 2.0 : remplace la taille dans l'URL deja enregistree pour les
    // items ajoutes avant ce correctif (retroactif, comme pour les cartes
    // vedettes de l'Historique) -- pas besoin de tout re-ajouter.
    const posterSrc = safePosterSrc(item.poster ? item.poster.replace('/w185/', '/w342/') : item.poster);
    const posterHtml = posterSrc
      ? `<span class="wl-poster"><img class="editorial-image" src="${posterSrc}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" decoding="async"></span>`
      : `<span class="wl-poster">${ICONS.clapper}</span>`;

    div.innerHTML = `
      <div class="wl-card-content">
        <button type="button" class="wl-card-open" aria-label="Voir la fiche de ${escAttr(item.title)}">
          ${posterHtml}
          <span class="wl-body">
            <span class="wl-title">${escAttr(item.title)}</span>
            <span class="wl-meta">${[item.year, item.genre].filter(Boolean).join(' · ')}</span>
            <span class="wl-providers" id="wl-providers-${i}">
              <span class="wl-provider-loading">⏳ Chargement streaming...</span>
            </span>
          </span>
        </button>
        <div class="wl-actions">
          <button type="button" class="wl-btn rate" data-watchlist-action="rate" data-watchlist-idx="${i}" title="Je l'ai vu, noter" aria-label="Noter ${escAttr(item.title)}, vu">${ICONS.star}</button>
          <button type="button" class="wl-btn del" data-watchlist-action="remove" data-watchlist-idx="${i}" title="Retirer" aria-label="Retirer ${escAttr(item.title)} de la watchlist">${ICONS.close}</button>
        </div>
      </div>`;

    container.appendChild(div);
    applyPosterAccent(item.poster, div);

    if (item.tmdbId) {
      fetchProviders(item.tmdbId, i);
    } else {
      const pd = document.getElementById(`wl-providers-${i}`);
      if (pd) pd.innerHTML = '';
    }
  });
  if (typeof prepareEditorialImages === 'function') prepareEditorialImages(container);
  window._justSavedWatchlistTitle = null;
}

// Normalise un nom de plateforme pour comparaison souple (ex: "Apple TV+" et
// "apple tv" doivent se reconnaître comme la même chose malgré la casse et le
// "+"/"Plus"), plutôt que d'exiger une correspondance exacte fragile face aux
// variations de nommage entre ce qu'on propose dans les réglages et ce que
// TMDb renvoie réellement.
function normalizeProviderName(name) {
  return (name || '').toLowerCase().replace(/\+/g, ' plus').replace(/\s+/g, ' ').trim();
}

async function fetchProviders(tmdbId, idx) {
  const el = document.getElementById(`wl-providers-${idx}`);
  if (!el) return;
  try {
    const res = await fetch(`/api/search?id=${tmdbId}&providers=BE`);
    const data = await res.json();

    const providerRoot = data['watch/providers']?.results?.BE
                      || data.providers?.results?.BE
                      || data.watchProviders?.BE
                      || null;

    if (!providerRoot) {
      el.innerHTML = '<span class="wl-no-streaming">Non disponible en streaming 🇧🇪</span>';
      return;
    }

    // Si l'utilisateur a précisé les plateformes qu'il possède (réglages), on
    // ne garde que celles-là — sinon (rien coché), on affiche tout, comme
    // avant l'ajout de cette fonctionnalité.
    const owned = loadOwnedProviders().map(normalizeProviderName);
    const filterOwned = (list) => owned.length === 0 ? list : list.filter(p => {
      const n = normalizeProviderName(p.provider_name);
      return owned.some(o => n.includes(o) || o.includes(n));
    });

    const allFlat = providerRoot.flatrate || [];
    const allRent = providerRoot.rent || [];
    const flat = filterOwned(allFlat);
    const rentOnly = filterOwned(allRent).filter(r => !flat.find(f => f.provider_id === r.provider_id));

    let html = '';
    if (flat.length > 0) {
      html += `<span class="wl-provider-tag flatrate">Inclus</span>`;
      flat.slice(0, 5).forEach(p => {
        html += `<img class="wl-provider-logo" src="${tmdbImage(p.logo_path, 'original')}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }
    if (rentOnly.length > 0) {
      html += `<span class="wl-provider-tag rent">Location</span>`;
      rentOnly.slice(0, 4).forEach(p => {
        html += `<img class="wl-provider-logo" src="${tmdbImage(p.logo_path, 'original')}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }

    if (!html) {
      // Distingue "vraiment nulle part en streaming" de "disponible, mais pas
      // sur TES plateformes" — les deux messages n'ont pas la même utilité.
      const availableElsewhere = owned.length > 0 && (allFlat.length > 0 || allRent.length > 0);
      el.innerHTML = availableElsewhere
        ? '<span class="wl-no-streaming">Disponible, mais pas sur tes plateformes 📵</span>'
        : '<span class="wl-no-streaming">Non disponible en streaming 🇧🇪</span>';
    } else {
      el.innerHTML = html;
    }
  } catch {
    if (el) el.innerHTML = '<span class="wl-no-streaming">Providers indisponibles</span>';
  }
}

async function addToWatchlistFromTMDb(movie, year) {
  // Ne fait plus l'ajout directement : demande d'abord dans quelle liste,
  // avec la possibilité d'en créer une nouvelle à la volée.
  openWatchlistPicker(movie, year);
}

async function addToSpecificWatchlist(movie, year, listId) {
  const list = loadWatchlist(listId);
  const key = (movie.title + '|' + year).toLowerCase();
  if (list.find(i => (i.title + '|' + (i.year||'')).toLowerCase() === key)) {
    showToast('Déjà dans cette liste.');
    return;
  }

  // Ludex 2.0 : note et durée capturées ici, réutilisant cet appel déjà fait
  // pour le genre — aucun appel réseau supplémentaire — pour alimenter le
  // tri "Note TMDb" et le filtre "− de 2h" sans jamais avoir à refaire cette
  // requête plus tard au moment d'afficher la liste.
  let genre = '', rating = null, runtime = null;
  try {
    const res = await fetch(`/api/search?id=${movie.id}`);
    const data = await res.json();
    genre = data.genres?.map(g => g.name).join(', ') || '';
    rating = typeof data.vote_average === 'number' ? data.vote_average : null;
    runtime = typeof data.runtime === 'number' ? data.runtime : null;
  } catch {}

  list.unshift({
    title: movie.title,
    year,
    // Ludex 2.0 : w342 (au lieu de w185) -- la grille affiche ces cartes
    // a ~110-130px, w185 manquait de nettete sur un ecran haute densite.
    // Meme saut deja fait pour les cartes vedettes de l'Historique.
    poster: tmdbImage(movie.poster_path, 'w342'),
    genre,
    rating,
    runtime,
    tmdbId: movie.id,
    addedAt: new Date().toISOString()
  });
  saveWatchlist(list, listId);
  if (listId === getActiveWatchlistId()) {
    window._justSavedWatchlistTitle = movie.title.toLowerCase();
    renderWatchlist();
  }
  const listName = loadWatchlistsMeta().find(l => l.id === listId)?.name || 'la liste';
  showToast(`"${movie.title}" ajouté à "${listName}" 🎯`);
}

function openWatchlistPicker(movie, year) {
  const modal = document.getElementById('wl-picker-modal');
  const listEl = document.getElementById('wl-picker-list');
  const newForm = document.getElementById('wl-picker-new-form');
  const newBtn = document.getElementById('wl-picker-new-btn');
  const newInput = document.getElementById('wl-picker-new-input');
  const newConfirm = document.getElementById('wl-picker-new-confirm');
  const cancelBtn = document.getElementById('wl-picker-cancel-btn');
  if (!modal || !listEl) return;

  // Repart d'un état propre à chaque ouverture (le formulaire "nouvelle liste"
  // ne doit pas rester déplié d'une fois à l'autre).
  newForm.style.display = 'none';
  newBtn.style.display = 'flex';
  newInput.value = '';

  const meta = loadWatchlistsMeta();
  listEl.innerHTML = meta.map(l => {
    const count = loadWatchlist(l.id).length;
    return `<button type="button" class="wl-picker-item" data-list-id="${l.id}"><span>${escAttr(l.name)}</span><span class="wl-picker-item-count">${count} film${count > 1 ? 's' : ''}</span></button>`;
  }).join('');

  function pickList(listId) {
    addToSpecificWatchlist(movie, year, listId);
    closeModal(modal);
  }

  listEl.querySelectorAll('.wl-picker-item').forEach(btn => {
    btn.addEventListener('click', () => pickList(btn.dataset.listId));
  });

  newBtn.onclick = () => {
    newBtn.style.display = 'none';
    newForm.style.display = 'flex';
    newInput.focus();
  };
  newConfirm.onclick = () => {
    const name = newInput.value.trim();
    if (!name) { newInput.focus(); return; }
    const id = createWatchlistList(name);
    if (!id) return;
    pickList(id);
  };
  newInput.onkeydown = (e) => { if (e.key === 'Enter') newConfirm.click(); };
  cancelBtn.onclick = () => closeModal(modal);

  openModalElement(modal, {
    initialFocus: meta.length > 0 ? listEl.querySelector('.wl-picker-item') : newBtn,
  });
}

let deletedWlItemCache = null;
let deletedWlItemIndex = null;
let deletedWlListId = null;

window.removeWatchlist = function(idx) {
  const list = loadWatchlist();
  const item = list[idx];
  const title = item?.title;
  deletedWlItemCache = item || null;
  deletedWlItemIndex = idx;
  deletedWlListId = getActiveWatchlistId(); // au cas où l'utilisateur changerait de liste avant d'annuler
  list.splice(idx, 1);
  saveWatchlist(list);
  if (item) recordTombstone(watchlistTombstonesKey(getActiveWatchlistId()), watchlistItemKey(item));
  renderWatchlist();
  if (title) showToast(`"${title}" retiré`, true, 'undoWatchlistDelete');
};

window.undoWatchlistDelete = function() {
  if (!deletedWlItemCache || !deletedWlListId) return;
  // Réinsère dans la liste d'ORIGINE (pas forcément celle active maintenant,
  // si l'utilisateur a changé de liste pendant la fenêtre d'annulation).
  const key = watchlistStorageKey(deletedWlListId);
  const list = readJsonStorage(key, [], Array.isArray);
  list.splice(Math.min(deletedWlItemIndex, list.length), 0, deletedWlItemCache);
  if (!writeJsonStorage(key, list)) return;
  removeTombstone(watchlistTombstonesKey(deletedWlListId), watchlistItemKey(deletedWlItemCache));
  if (getActiveWatchlistId() === deletedWlListId) renderWatchlist();
  showToast('Retrait annulé.');
  deletedWlItemCache = null;
};

window.watchlistToForm = function(idx) {
  const list = loadWatchlist();
  const item = list[idx];
  if (!item) return;
  searchEl.value = item.title;
  searchEl.dispatchEvent(new Event('input'));
  list.splice(idx, 1);
  saveWatchlist(list);
  recordTombstone(watchlistTombstonesKey(getActiveWatchlistId()), watchlistItemKey(item));
  renderWatchlist();
  
  if (window.innerWidth <= 860) switchMobileNav('rating');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Recherche lancée pour "${item.title}"`);
};

const wlInput = document.getElementById('watchlist-input');
const wlSuggestEl = document.getElementById('wl-suggestions');
let wlSearchTimer;

wlInput.addEventListener('input', () => {
  clearTimeout(wlSearchTimer);
  const q = wlInput.value.trim();
  if (q.length < 2) { wlSuggestEl.style.display = 'none'; return; }
  
  wlSearchTimer = setTimeout(async () => {
    try {
      const [res, personMatch] = await Promise.all([
        fetch(`/api/search?query=${encodeURIComponent(q)}`),
        fetchPersonMatch(q),
      ]);
      // readApiJson lève si l'API a réellement échoué, au lieu de laisser une
      // réponse d'erreur passer pour "0 résultat" (voir 03-foundation.js).
      const data = await readApiJson(res);
      if (!data.results?.length && !personMatch) { wlSuggestEl.style.display = 'none'; return; }
      wlSuggestEl.innerHTML = '';
      wlSuggestEl.style.display = 'block';

      if (personMatch) {
        const photoUrl = tmdbImage(personMatch.profile_path, 'w92');
        const personEl = document.createElement('button');
        personEl.type = 'button';
        personEl.className = 'wl-suggest-item';
        personEl.setAttribute('aria-label', `Voir la filmographie de ${personMatch.name}`);
        personEl.innerHTML = `
          ${photoUrl
            ? `<img class="wl-suggest-poster" style="border-radius:50%;object-fit:cover;" src="${photoUrl}" alt="Photo de ${escAttr(personMatch.name)}" loading="lazy">`
            : `<div class="wl-suggest-poster" style="display:flex;align-items:center;justify-content:center;">${ICONS.clapper}</div>`}
          <div>
            <div class="wl-suggest-title">🎬 ${escAttr(personMatch.name)}</div>
            <div class="wl-suggest-year">Voir sa filmographie</div>
          </div>`;
        personEl.addEventListener('click', () => {
          wlSuggestEl.style.display = 'none';
          openPersonDetailSheet(personMatch.id, personMatch.name);
        });
        wlSuggestEl.appendChild(personEl);
      }

      data.results.slice(0, 5).forEach(m => {
        const year = m.release_date?.slice(0, 4) || '';
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'wl-suggest-item';
        el.setAttribute('aria-label', `Ajouter ${m.title} à une liste`);
        el.innerHTML = `
          ${m.poster_path
            ? `<img class="wl-suggest-poster" src="${tmdbImage(m.poster_path, 'w92')}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">`
            : `<div class="wl-suggest-poster" style="display:flex;align-items:center;justify-content:center;">${ICONS.clapper}</div>`}
          <div>
            <div class="wl-suggest-title">${escAttr(m.title)}</div>
            <div class="wl-suggest-year">${year}</div>
          </div>`;
        el.addEventListener('click', () => {
          wlSuggestEl.style.display = 'none';
          wlInput.value = '';
          addToWatchlistFromTMDb(m, year);
        });
        wlSuggestEl.appendChild(el);
      });
    } catch (err) {
      wlSuggestEl.style.display = 'none';
      showToast(describeApiFailure(err));
    }
  }, 280);
});

document.addEventListener('click', e => {
  if (!wlInput.contains(e.target) && !wlSuggestEl.contains(e.target)) {
    wlSuggestEl.style.display = 'none';
  }
});

document.getElementById('watchlist-add-btn').addEventListener('click', () => {
  const val = wlInput.value.trim();
  if (!val) return;
  wlSuggestEl.style.display = 'none';
  const list = loadWatchlist();
  const key = val.toLowerCase();
  if (list.find(i => i.title.toLowerCase() === key)) { showToast('Déjà dans la liste.'); wlInput.value = ''; return; }
  list.unshift({ title: val, year: '', poster: '', genre: '', tmdbId: null, addedAt: new Date().toISOString() });
  saveWatchlist(list);
  window._justSavedWatchlistTitle = val.toLowerCase();
  renderWatchlist();
  showToast(`"${val}" ajouté à la liste 🎯`);
  wlInput.value = '';
});

wlInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') { wlSuggestEl.style.display = 'none'; }
});

// Tap sur un film de la watchlist (hors boutons noter/retirer) : ouvre sa fiche détaillée.
document.getElementById('watchlist-list').addEventListener('click', e => {
  const actionButton = e.target.closest('.wl-btn[data-watchlist-action]');
  if (actionButton) {
    const idx = Number(actionButton.dataset.watchlistIdx);
    if (!Number.isInteger(idx) || idx < 0) return;
    if (actionButton.dataset.watchlistAction === 'rate') watchlistToForm(idx);
    if (actionButton.dataset.watchlistAction === 'remove') removeWatchlist(idx);
    return;
  }
  if (e.target.closest('#empty-state-watchlist-cta')) {
    if (window.innerWidth <= 860) switchMobileNav('discover');
    else switchRightTab('discover');
    return;
  }
  const card = e.target.closest('.wl-card');
  if (!card || e.target.closest('.wl-btn')) return;
  const idx = parseInt(card.id.replace('wl-item-', ''), 10);
  const list = loadWatchlist();
  const item = list[idx];
  if (item) openMovieDetailSheet(item.tmdbId);
});

// ─── Sélecteur de listes (onglets) ───────────────────────────────────────────
function renderWatchlistTabs(mediaType = 'movie') {
  const meta = loadWatchlistsMeta(mediaType);
  const activeId = getActiveWatchlistId(mediaType);
  const activeMeta = meta.find(l => l.id === activeId) || meta[0];
  const nameEl = document.getElementById(mediaType === 'tv' ? 'wl-tv-active-name' : 'watchlist-active-name');
  if (nameEl) nameEl.textContent = activeMeta ? activeMeta.name : 'À voir';

  const row = document.getElementById(mediaType === 'tv' ? 'wl-tv-lists-row' : 'wl-lists-row');
  if (!row) return;
  row.innerHTML = meta.map(l =>
    `<button type="button" class="wl-list-pill${l.id === activeId ? ' active' : ''}" data-id="${l.id}">${escAttr(l.name)}</button>`
  ).join('') + `<button type="button" class="wl-list-pill wl-list-add" data-add-list>${ICONS.plus} Nouvelle liste</button>`;
}

function openWlListManageMenu(id, mediaType = 'movie') {
  const meta = loadWatchlistsMeta(mediaType);
  const entry = meta.find(l => l.id === id);
  if (!entry) return;

  actionSheetTitleEl.textContent = entry.name;
  const actions = [
    { label: 'Renommer', icon: ICONS.edit, onClick: () => openWlListModal('rename', id, mediaType) },
    {
      label: 'Supprimer cette liste', icon: ICONS.trash, danger: true,
      onClick: () => {
        if (loadWatchlistsMeta(mediaType).length <= 1) { showToast('Impossible de supprimer la dernière liste.'); return; }
        openModal('Supprimer la liste', `Supprimer "${escAttr(entry.name)}" et tous ses films ? Cette action est définitive.`, () => {
          deleteWatchlistList(id, mediaType);
          renderWatchlistTabs(mediaType);
          if (mediaType === 'tv') renderTvWatchlist(); else renderWatchlist();
          showToast('Liste supprimée.');
        }, true);
      },
    },
  ];

  actionSheetListEl.innerHTML = '';
  actions.forEach(({ label, icon, onClick, danger }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'action-sheet-item' + (danger ? ' danger' : '');
    btn.innerHTML = `${icon} <span>${label}</span>`;
    btn.addEventListener('click', () => { closeActionSheet(); onClick(); });
    actionSheetListEl.appendChild(btn);
  });

  openModalElement(actionSheetEl, {
    initialFocus: actionSheetListEl.querySelector('.action-sheet-item'),
  });
}

let wlModalMode = 'create';
let wlModalTargetId = null;
let wlModalMediaType = 'movie';

function openWlListModal(mode, targetId = null, mediaType = 'movie') {
  wlModalMode = mode;
  wlModalTargetId = targetId;
  wlModalMediaType = mediaType;
  document.getElementById('wl-list-modal-title').textContent = mode === 'create' ? 'Nouvelle liste' : 'Renommer la liste';
  document.getElementById('wl-list-modal-confirm').textContent = mode === 'create' ? 'Créer' : 'Renommer';
  const input = document.getElementById('wl-list-name-input');
  input.value = mode === 'rename' ? (loadWatchlistsMeta(mediaType).find(l => l.id === targetId)?.name || '') : '';
  openModalElement(document.getElementById('wl-list-modal'), { initialFocus: input });
}

// Ludex 2.0 : un seul gestionnaire, réutilisé pour les deux rangées de
// listes (films ET séries) — évite d'avoir deux blocs de code identiques
// qui ne divergent que par le mediaType, exactement le genre de duplication
// qui avait fait dériver les deux systèmes la première fois.
function wireWatchlistListsRow(rowId, mediaType) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.addEventListener('click', (e) => {
    if (e.target.closest('[data-add-list]')) { openWlListModal('create', null, mediaType); return; }
    const pill = e.target.closest('.wl-list-pill');
    if (!pill) return;
    const id = pill.dataset.id;
    if (id === getActiveWatchlistId(mediaType)) {
      openWlListManageMenu(id, mediaType); // déjà active : un tap dessus propose de la gérer
    } else {
      setActiveWatchlistId(id, mediaType);
      renderWatchlistTabs(mediaType);
      if (mediaType === 'tv') renderTvWatchlist(); else renderWatchlist();
    }
  });
}
wireWatchlistListsRow('wl-lists-row', 'movie');
wireWatchlistListsRow('wl-tv-lists-row', 'tv');

document.getElementById('wl-list-modal-confirm').addEventListener('click', () => {
  const name = document.getElementById('wl-list-name-input').value.trim();
  if (!name) { showToast('Donne un nom à la liste.'); return; }
  if (wlModalMode === 'create') {
    const id = createWatchlistList(name, wlModalMediaType);
    if (!id) return;
    setActiveWatchlistId(id, wlModalMediaType);
    showToast(`Liste "${name}" créée.`);
  } else {
    renameWatchlistList(wlModalTargetId, name, wlModalMediaType);
    showToast('Liste renommée.');
  }
  closeModal(document.getElementById('wl-list-modal'));
  renderWatchlistTabs(wlModalMediaType);
  if (wlModalMediaType === 'tv') renderTvWatchlist(); else renderWatchlist();
});
document.getElementById('wl-list-modal-cancel').addEventListener('click', () => {
  closeModal(document.getElementById('wl-list-modal'));
});

renderWatchlistTabs('movie');
renderWatchlist();

// ═══════════════════════════════════════════
//  WATCHLIST SÉRIES (Ludex 2.0)
// ═══════════════════════════════════════════
// Harmonisée avec la watchlist films (voir Ludex_Specifications_Watchlist —
// "harmoniser en prenant comme modèle la watchlist des films") : mêmes
// listes multiples, même grille, mêmes suggestions d'état vide — via le
// système générique multi-listes défini en tête de fichier (mediaType='tv'),
// plus une implémentation séparée qui avait fini par diverger visuellement
// (repéré via captures d'écran : grille absente côté séries).

// Ludex 2.0 : wrappers fins autour du système générique multi-listes (voir
// le bloc "WATCHLISTS MULTIPLES" en tête de fichier) — le nom reste
// loadTvWatchlist()/saveTvWatchlist() pour ne pas devoir toucher tous les
// appels ci-dessous, mais ils ciblent maintenant la liste séries ACTIVE
// (multi-listes), plus l'ancienne clé simple à liste unique.
function loadTvWatchlist() { return loadWatchlist(null, 'tv'); }
function saveTvWatchlist(list) { saveWatchlist(list, null, 'tv'); }
function tvWatchlistItemKey(item) { return (item.title + '|' + (item.year || '')).toLowerCase(); }

let wlTvSortOrder = 'recent';
let wlTvActiveGenre = null;

function sortTvWatchlist(list) {
  if (wlTvSortOrder === 'rating') return [...list].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  if (wlTvSortOrder === 'year') return [...list].sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
  return list;
}
function filterTvWatchlist(list) {
  if (!wlTvActiveGenre) return list;
  return list.filter(item => (item.genre || '').split(',').map(g => g.trim()).includes(wlTvActiveGenre));
}
function renderWlTvGenreChips(list) {
  const genres = getGenres(list);
  const row = document.getElementById('wl-tv-genre-fold');
  const chips = document.getElementById('wl-tv-genre-chips');
  const currentLabel = document.getElementById('wl-tv-genre-fold-current');
  if (!row || !chips) return;
  if (genres.length === 0) { row.style.display = 'none'; return; }
  row.style.display = 'block';
  if (currentLabel) currentLabel.textContent = wlTvActiveGenre || 'Tous';
  chips.innerHTML = '';
  const allChip = document.createElement('button');
  allChip.className = 'genre-chip all-chip' + (wlTvActiveGenre === null ? ' active' : '');
  allChip.textContent = 'Tous';
  allChip.addEventListener('click', () => { wlTvActiveGenre = null; renderTvWatchlist(); });
  chips.appendChild(allChip);
  genres.forEach(g => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip' + (wlTvActiveGenre === g ? ' active' : '');
    chip.textContent = g;
    chip.addEventListener('click', () => { wlTvActiveGenre = (wlTvActiveGenre === g) ? null : g; renderTvWatchlist(); });
    chips.appendChild(chip);
  });
}

document.getElementById('wl-tv-sort-row')?.addEventListener('click', (e) => {
  const sortBtn = e.target.closest('.wl-sort-btn[data-sort]');
  if (!sortBtn) return;
  wlTvSortOrder = sortBtn.dataset.sort;
  document.querySelectorAll('#wl-tv-sort-row .wl-sort-btn[data-sort]').forEach(b => b.classList.toggle('active', b === sortBtn));
  renderTvWatchlist();
});

// Ludex 2.0 : suggestions d'état vide côté séries, même principe que côté
// films (voir renderWatchlistEmptySuggestions() plus haut) — media_type
// 'tv' plutôt que 'movie' dans le même endpoint tendances, cache mémoire
// séparé (une série tendance n'est pas forcément un film tendance).
let _wlTvEmptySuggestionsCache = null;
async function renderTvWatchlistEmptySuggestions() {
  const wrap = document.getElementById('wl-tv-empty-suggestions');
  if (!wrap) return;
  try {
    let items = _wlTvEmptySuggestionsCache;
    if (!items) {
      const res = await fetch('/api/search?trending=true');
      const data = await res.json();
      items = (data.results || []).filter(m => m.media_type === 'tv' && m.poster_path).slice(0, 3);
      _wlTvEmptySuggestionsCache = items;
    }
    if (items.length === 0) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `
      <div class="wl-empty-suggestions-title">Quelques suggestions pour commencer :</div>
      <div class="wl-empty-suggestions-row">
        ${items.map(m => `
          <div class="wl-empty-sugg-card">
            <img class="wl-empty-sugg-poster editorial-image" src="${tmdbImage(m.poster_path, 'w200')}" alt="Affiche de ${escAttr(m.name)}" loading="lazy">
            <div class="wl-empty-sugg-title">${escAttr(m.name)}</div>
            <button type="button" class="wl-empty-sugg-btn" data-show-id="${m.id}" data-show-name="${escAttr(m.name)}" data-show-year="${(m.first_air_date || '').slice(0,4)}" data-poster="${escAttr(m.poster_path)}">+ Ajouter</button>
          </div>`).join('')}
      </div>`;
    if (typeof prepareEditorialImages === 'function') prepareEditorialImages(wrap);
  } catch (e) {
    console.warn('Impossible de charger les suggestions séries', e);
    wrap.innerHTML = '';
  }
}
// Délégué depuis #wl-tv-list (toujours présent), même raison que côté
// films : #wl-tv-empty-suggestions n'existe qu'une fois la liste vide
// effectivement rendue.
document.getElementById('wl-tv-list')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.wl-empty-sugg-btn');
  if (!btn) return;
  addToTvWatchlist(
    { id: Number(btn.dataset.showId), name: btn.dataset.showName, poster_path: btn.dataset.poster },
    btn.dataset.showYear
  );
});

function renderTvWatchlist() {
  const list = loadTvWatchlist();
  const container = document.getElementById('wl-tv-list');
  if (!container) return;

  const badge = document.getElementById('wl-tv-count-badge');
  if (badge) badge.textContent = list.length + ' série' + (list.length > 1 ? 's' : '');

  renderWlTvGenreChips(list);
  document.getElementById('wl-tv-sort-row').style.display = list.length === 0 ? 'none' : 'flex';

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.target}</div>Rien au programme pour l'instant — ajoute les séries que tu veux voir.</div><div class="wl-empty-suggestions" id="wl-tv-empty-suggestions"></div>`;
    renderTvWatchlistEmptySuggestions();
    return;
  }

  const visible = filterTvWatchlist(sortTvWatchlist(list));
  if (visible.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.search}</div>Aucune série ne correspond à ce filtre.</div>`;
    return;
  }

  container.innerHTML = '';
  visible.forEach((item) => {
    const i = list.indexOf(item);
    const div = document.createElement('div');
    div.className = 'wl-card';
    if (window._justSavedTvWatchlistTitle && item.title.toLowerCase() === window._justSavedTvWatchlistTitle) {
      div.classList.add('wl-card-entering');
    }
    // Ludex 2.0 : remplace la taille dans l'URL deja enregistree pour les
    // items ajoutes avant ce correctif (retroactif, comme pour les cartes
    // vedettes de l'Historique) -- pas besoin de tout re-ajouter.
    const posterSrc = safePosterSrc(item.poster ? item.poster.replace('/w185/', '/w342/') : item.poster);
    const posterHtml = posterSrc
      ? `<span class="wl-poster"><img class="editorial-image" src="${posterSrc}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" decoding="async"></span>`
      : `<span class="wl-poster">${ICONS.clapper}</span>`;
    div.innerHTML = `
      <div class="wl-card-content">
        <button type="button" class="wl-card-open" aria-label="Voir la fiche de ${escAttr(item.title)}">
          ${posterHtml}
        </button>
        <div class="wl-actions">
          <button type="button" class="wl-btn rate" data-tv-idx="${i}" data-action="start" title="Commencer à suivre, noter" aria-label="Commencer à suivre ${escAttr(item.title)}">${ICONS.star}</button>
          <button type="button" class="wl-btn del" data-tv-idx="${i}" data-action="remove" title="Retirer" aria-label="Retirer ${escAttr(item.title)} de la watchlist">${ICONS.close}</button>
        </div>
      </div>`;
    div.querySelector('.wl-card-open').addEventListener('click', () => openTvDetailSheet(item.tmdbId));
    container.appendChild(div);
    applyPosterAccent(item.poster, div);
  });
  if (typeof prepareEditorialImages === 'function') prepareEditorialImages(container);
  window._justSavedTvWatchlistTitle = null;
}

document.getElementById('wl-tv-list')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.wl-btn[data-tv-idx]');
  if (!btn) return;
  const idx = Number(btn.dataset.tvIdx);
  const list = loadTvWatchlist();
  const item = list[idx];
  if (!item) return;

  if (btn.dataset.action === 'remove') {
    list.splice(idx, 1);
    saveTvWatchlist(list);
    recordTombstone(watchlistTombstonesKey(getActiveWatchlistId('tv'), 'tv'), tvWatchlistItemKey(item));
    renderTvWatchlist();
    return;
  }

  // "Commencer à suivre" : même principe que watchlistToForm() côté films —
  // relance la recherche (ici sur le champ séries), retire l'item de la
  // watchlist, bascule vers Noter en mode Séries.
  list.splice(idx, 1);
  saveTvWatchlist(list);
  recordTombstone(watchlistTombstonesKey(getActiveWatchlistId('tv'), 'tv'), tvWatchlistItemKey(item));
  renderTvWatchlist();

  if (typeof setMediaType === 'function') setMediaType('tv');
  const tvSearchEl = document.getElementById('tv-search');
  if (tvSearchEl) {
    tvSearchEl.value = item.title;
    tvSearchEl.dispatchEvent(new Event('input'));
  }
  if (window.innerWidth <= 860) switchMobileNav('rating');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Recherche lancée pour "${item.title}"`);
});

// Les erreurs d'affiche sont gérées par délégation, sans JavaScript inline :
// la CSP peut ainsi interdire `unsafe-inline` sans casser les fallbacks.
['watchlist-list', 'wl-tv-list'].forEach(id => {
  document.getElementById(id)?.addEventListener('error', event => {
    const image = event.target.closest?.('.wl-poster img');
    if (!image) return;
    image.parentElement.replaceChildren(document.createTextNode('🎬'));
  }, true);
});

async function addToTvWatchlist(show, year) {
  const list = loadTvWatchlist();
  const key = (show.name + '|' + year).toLowerCase();
  if (list.find(i => (i.title + '|' + (i.year || '')).toLowerCase() === key)) {
    showToast('Déjà dans la watchlist séries.');
    return;
  }
  let genre = '', rating = null;
  try {
    const res = await fetch(`/api/search?tvId=${show.id}`);
    const data = await res.json();
    genre = data.genres?.map(g => g.name).join(', ') || '';
    rating = typeof data.vote_average === 'number' ? data.vote_average : null;
  } catch { /* pas bloquant : la série s'ajoute quand même, juste sans genre/note pour le tri */ }

  list.unshift({
    title: show.name,
    year,
    poster: tmdbImage(show.poster_path, 'w342'),
    genre,
    rating,
    tmdbId: show.id,
    addedAt: new Date().toISOString(),
  });
  saveTvWatchlist(list);
  window._justSavedTvWatchlistTitle = show.name.toLowerCase();
  renderTvWatchlist();
  showToast(`"${show.name}" ajoutée à la watchlist séries 🎯`);
}

// ── Recherche séries (mêmes suggestions à affiches, même pattern que le
// champ films juste au-dessus) ──
const wlTvInput = document.getElementById('wl-tv-input');
const wlTvSuggestEl = document.getElementById('wl-tv-suggestions');
let wlTvSearchTimer;

wlTvInput?.addEventListener('input', () => {
  clearTimeout(wlTvSearchTimer);
  const q = wlTvInput.value.trim();
  if (q.length < 2) { wlTvSuggestEl.style.display = 'none'; return; }
  wlTvSearchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?tvQuery=${encodeURIComponent(q)}`);
      const data = await readApiJson(res);
      if (!data.results?.length) { wlTvSuggestEl.style.display = 'none'; return; }
      wlTvSuggestEl.innerHTML = '';
      wlTvSuggestEl.style.display = 'block';
      data.results.slice(0, 5).forEach(s => {
        const year = s.first_air_date?.slice(0, 4) || '';
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'wl-suggest-item';
        el.setAttribute('aria-label', `Ajouter ${s.name} à la liste Séries`);
        el.innerHTML = `
          ${s.poster_path
            ? `<img class="wl-suggest-poster" src="${tmdbImage(s.poster_path, 'w92')}" alt="Affiche de ${escAttr(s.name)}" loading="lazy">`
            : `<div class="wl-suggest-poster" style="display:flex;align-items:center;justify-content:center;">${ICONS.clapper}</div>`}
          <div>
            <div class="wl-suggest-title">${escAttr(s.name)}</div>
            <div class="wl-suggest-year">${year}</div>
          </div>`;
        el.addEventListener('click', () => {
          wlTvSuggestEl.style.display = 'none';
          wlTvInput.value = '';
          addToTvWatchlist(s, year);
        });
        wlTvSuggestEl.appendChild(el);
      });
    } catch (err) {
      wlTvSuggestEl.style.display = 'none';
      showToast(describeApiFailure(err));
    }
  }, 280);
});
document.addEventListener('click', e => {
  if (wlTvInput && wlTvSuggestEl && !wlTvInput.contains(e.target) && !wlTvSuggestEl.contains(e.target)) {
    wlTvSuggestEl.style.display = 'none';
  }
});
document.getElementById('wl-tv-add-btn')?.addEventListener('click', () => {
  const val = wlTvInput.value.trim();
  if (!val) return;
  wlTvSuggestEl.style.display = 'none';
  const list = loadTvWatchlist();
  if (list.find(i => i.title.toLowerCase() === val.toLowerCase())) { showToast('Déjà dans la liste.'); wlTvInput.value = ''; return; }
  list.unshift({ title: val, year: '', poster: '', genre: '', tmdbId: null, addedAt: new Date().toISOString() });
  saveTvWatchlist(list);
  window._justSavedTvWatchlistTitle = val.toLowerCase();
  renderTvWatchlist();
  wlTvInput.value = '';
});

// ── Recherche éditoriale compacte ──────────────────────────────────────────
// Les champs et leurs comportements d'ajout restent ceux définis ci-dessus.
// Ce contrôleur ne gère que leur présentation : loupe compacte, focus,
// Escape et bascule du champ visible avec le switch Films/Séries.
function setWatchlistSearchOpen(searchEl, open, { restoreFocus = false } = {}) {
  if (!searchEl) return;
  const input = searchEl.querySelector('.watchlist-add-input');
  const addButton = searchEl.querySelector('.watchlist-add-btn');
  const toggle = searchEl.querySelector('.watchlist-search-toggle');
  const suggestions = searchEl.querySelector('.wl-suggestions');
  if (!input || !addButton || !toggle) return;

  searchEl.classList.toggle('is-open', open);
  input.disabled = !open;
  addButton.disabled = !open;
  toggle.setAttribute('aria-expanded', String(open));
  const mediaLabel = searchEl.dataset.watchlistSearch === 'tv' ? 'Séries' : 'Films';
  toggle.setAttribute('aria-label', `${open ? 'Fermer' : 'Ouvrir'} la recherche ${mediaLabel}`);

  if (open) {
    requestAnimationFrame(() => input.focus());
    return;
  }
  clearTimeout(searchEl.dataset.watchlistSearch === 'tv' ? wlTvSearchTimer : wlSearchTimer);
  input.value = '';
  if (suggestions) suggestions.style.display = 'none';
  if (restoreFocus) toggle.focus();
}

function wireWatchlistEditorialSearch(searchId) {
  const searchEl = document.getElementById(searchId);
  const toggle = searchEl?.querySelector('.watchlist-search-toggle');
  if (!searchEl || !toggle) return;
  toggle.addEventListener('click', () => {
    const shouldOpen = !searchEl.classList.contains('is-open');
    hapticPulse(toggle, 'light');
    setWatchlistSearchOpen(searchEl, shouldOpen, { restoreFocus: !shouldOpen });
  });
  searchEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    setWatchlistSearchOpen(searchEl, false, { restoreFocus: true });
  });
}

function setWatchlistSearchMedia(mediaType) {
  document.querySelectorAll('[data-watchlist-search]').forEach(searchEl => {
    const isCurrent = searchEl.dataset.watchlistSearch === mediaType;
    if (!isCurrent) setWatchlistSearchOpen(searchEl, false);
    searchEl.hidden = !isCurrent;
    searchEl.classList.toggle('is-current', isCurrent);
  });
}

wireWatchlistEditorialSearch('watchlist-movie-search');
wireWatchlistEditorialSearch('watchlist-tv-search');

// ── Toggle Films/Séries ──
document.getElementById('wl-tab-movie')?.addEventListener('click', () => {
  document.getElementById('wl-tab-movie').classList.add('active');
  document.getElementById('wl-tab-tv').classList.remove('active');
  document.getElementById('wl-movie-section').style.display = '';
  document.getElementById('wl-tv-section').style.display = 'none';
  setWatchlistSearchMedia('movie');
});
document.getElementById('wl-tab-tv')?.addEventListener('click', () => {
  document.getElementById('wl-tab-tv').classList.add('active');
  document.getElementById('wl-tab-movie').classList.remove('active');
  document.getElementById('wl-tv-section').style.display = '';
  document.getElementById('wl-movie-section').style.display = 'none';
  setWatchlistSearchMedia('tv');
  renderWatchlistTabs('tv');
  renderTvWatchlist();
});

setWatchlistSearchMedia('movie');
renderWatchlistTabs('tv');
renderTvWatchlist();
