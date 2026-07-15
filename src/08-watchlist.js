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
const WATCHLISTS_META_KEY = 'lbx_watchlists_meta';
const ACTIVE_WATCHLIST_KEY = 'lbx_active_watchlist_id';
const LEGACY_WATCHLIST_KEY = 'lbx_watchlist'; // ancienne clé (liste unique), migrée au premier chargement

function loadWatchlistsMeta() {
  try { return JSON.parse(localStorage.getItem(WATCHLISTS_META_KEY)) || []; } catch { return []; }
}
function saveWatchlistsMeta(meta) {
  localStorage.setItem(WATCHLISTS_META_KEY, JSON.stringify(meta));
}
function watchlistStorageKey(id) { return `lbx_watchlist_${id}`; }
function watchlistTombstonesKey(id) { return `lbx_watchlist_tombstones_${id}`; }
const WATCHLIST_LIST_TOMBSTONES_KEY = 'lbx_watchlist_list_tombstones'; // listes ENTIÈRES supprimées (pas juste des items)
const LEGACY_WATCHLIST_TOMBSTONES_KEY = 'lbx_watchlist_tombstones'; // ancienne clé (liste unique), migrée avec le reste

// Migration ponctuelle : si l'ancienne clé unique existe et qu'aucune liste
// nommée n'a encore été créée, on la transforme en une première liste "À voir"
// — aucune perte de données pour les utilisateurs déjà en place.
(function migrateLegacyWatchlist() {
  if (loadWatchlistsMeta().length > 0) return; // déjà migré
  let legacyItems = [];
  try { legacyItems = JSON.parse(localStorage.getItem(LEGACY_WATCHLIST_KEY)) || []; } catch {}
  let legacyTombstones = [];
  try { legacyTombstones = JSON.parse(localStorage.getItem(LEGACY_WATCHLIST_TOMBSTONES_KEY)) || []; } catch {}
  const defaultId = 'default';
  saveWatchlistsMeta([{ id: defaultId, name: 'À voir' }]);
  localStorage.setItem(watchlistStorageKey(defaultId), JSON.stringify(legacyItems));
  localStorage.setItem(watchlistTombstonesKey(defaultId), JSON.stringify(legacyTombstones));
  localStorage.setItem(ACTIVE_WATCHLIST_KEY, defaultId);
})();

function getActiveWatchlistId() {
  let id = localStorage.getItem(ACTIVE_WATCHLIST_KEY);
  const meta = loadWatchlistsMeta();
  if (!id || !meta.find(l => l.id === id)) {
    id = meta[0]?.id || 'default';
    localStorage.setItem(ACTIVE_WATCHLIST_KEY, id);
  }
  return id;
}
function setActiveWatchlistId(id) {
  localStorage.setItem(ACTIVE_WATCHLIST_KEY, id);
}

function createWatchlistList(name) {
  const meta = loadWatchlistsMeta();
  const id = 'wl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  meta.push({ id, name: name.trim() || 'Nouvelle liste' });
  saveWatchlistsMeta(meta);
  localStorage.setItem(watchlistStorageKey(id), JSON.stringify([]));
  return id;
}
function renameWatchlistList(id, newName) {
  const meta = loadWatchlistsMeta();
  const entry = meta.find(l => l.id === id);
  if (entry) { entry.name = newName.trim() || entry.name; saveWatchlistsMeta(meta); }
}
function deleteWatchlistList(id) {
  let meta = loadWatchlistsMeta();
  if (meta.length <= 1) return false; // toujours garder au moins une liste
  meta = meta.filter(l => l.id !== id);
  saveWatchlistsMeta(meta);
  localStorage.removeItem(watchlistStorageKey(id));
  localStorage.removeItem(watchlistTombstonesKey(id));
  recordTombstone(WATCHLIST_LIST_TOMBSTONES_KEY, id); // pour que la suppression de la LISTE elle-même se propage via la synchro
  if (getActiveWatchlistId() === id) setActiveWatchlistId(meta[0].id);
  return true;
}

function loadWatchlist(listId) {
  try { return JSON.parse(localStorage.getItem(watchlistStorageKey(listId || getActiveWatchlistId()))) || []; } catch { return []; }
}
function saveWatchlist(list, listId) {
  localStorage.setItem(watchlistStorageKey(listId || getActiveWatchlistId()), JSON.stringify(list));
}


// Swipe sur un film de la watchlist : glisser à gauche = retirer, à droite =
// "vu, noter" (réutilise removeWatchlist/watchlistToForm, les mêmes fonctions
// que les boutons ✕/⭐ — juste un chemin de déclenchement en plus, pas de
// nouvelle logique). stopPropagation() évite que ce geste horizontal ne
// déclenche AUSSI le swipe global de changement d'onglet.
function attachWatchlistSwipeHandlers(cardEl, idx) {
  const SWIPE_THRESHOLD = 80;
  const MAX_DRAG = 130;
  const contentEl = cardEl.querySelector('.wl-card-content');
  let startX = 0, startY = 0, dx = 0, dragging = false, wasSwipe = false;

  function onStart(x, y) {
    startX = x; startY = y; dx = 0; dragging = true; wasSwipe = false;
    cardEl.classList.add('wl-dragging');
  }
  function onMove(x, y) {
    if (!dragging) return;
    const rawDx = x - startX;
    const dy = y - startY;
    if (Math.abs(dy) > Math.abs(rawDx) * 1.2) return; // trop vertical : probablement un scroll, pas un swipe
    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    if (Math.abs(dx) > 8) wasSwipe = true;
    contentEl.style.transform = `translateX(${dx}px)`;
    cardEl.classList.toggle('wl-swipe-left', dx < -10);
    cardEl.classList.toggle('wl-swipe-right', dx > 10);
  }
  function onEnd() {
    if (!dragging) return;
    dragging = false;
    cardEl.classList.remove('wl-dragging');

    if (dx <= -SWIPE_THRESHOLD) {
      cardEl.classList.add('wl-swipe-out-left');
      contentEl.style.transform = 'translateX(-110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(cardEl, 'strong');
      setTimeout(() => removeWatchlist(idx), 200);
    } else if (dx >= SWIPE_THRESHOLD) {
      cardEl.classList.add('wl-swipe-out-right');
      contentEl.style.transform = 'translateX(110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(cardEl, 'strong');
      setTimeout(() => watchlistToForm(idx), 200);
    } else {
      contentEl.style.transform = '';
      cardEl.classList.remove('wl-swipe-left', 'wl-swipe-right');
    }
    // Empêche le tap-pour-ouvrir-la-fiche de se déclencher juste après un
    // swipe avorté (retour à zéro) — seul un vrai tap sans mouvement l'ouvre.
    if (wasSwipe) {
      setTimeout(() => { wasSwipe = false; }, 50);
    }
  }

  cardEl.addEventListener('touchstart', e => {
    e.stopPropagation();
    onStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  cardEl.addEventListener('touchmove', e => {
    e.stopPropagation();
    onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  cardEl.addEventListener('touchend', e => {
    e.stopPropagation();
    onEnd();
  });
  cardEl.addEventListener('touchcancel', onEnd);

  // Souris (pratique pour tester sur desktop / vercel dev)
  cardEl.addEventListener('mousedown', e => {
    onStart(e.clientX, e.clientY);
    const moveHandler = ev => onMove(ev.clientX, ev.clientY);
    const upHandler = () => {
      onEnd();
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  });

  // Empêche le tap-pour-détail de s'ouvrir juste après un swipe (voir le
  // listener délégué de watchlist-list plus bas).
  cardEl.addEventListener('click', e => {
    if (wasSwipe) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}

function renderWatchlist() {
  const list = loadWatchlist();
  const container = document.getElementById('watchlist-list');
  const badge = document.getElementById('watchlist-count-badge');
  badge.textContent = list.length + ' film' + (list.length > 1 ? 's' : '');

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.target}</div>Rien au programme pour l'instant — ajoute les films que tu veux voir.<button type="button" class="empty-state-cta" id="empty-state-watchlist-cta">Découvrir des films à ajouter</button></div>`;
    window._justSavedWatchlistTitle = null;
    return;
  }

  container.innerHTML = '';
  list.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'wl-card';
    div.id = `wl-item-${i}`;
    if (window._justSavedWatchlistTitle && item.title.toLowerCase() === window._justSavedWatchlistTitle) {
      div.classList.add('wl-card-entering');
    }

    const posterHtml = item.poster
      ? `<div class="wl-poster"><img src="${item.poster}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" onerror="this.parentElement.textContent='🎬'"></div>`
      : `<div class="wl-poster">${ICONS.clapper}</div>`;

    div.innerHTML = `
      <div class="wl-swipe-hint wl-swipe-hint-left" aria-hidden="true">${ICONS.close} Retirer</div>
      <div class="wl-swipe-hint wl-swipe-hint-right" aria-hidden="true">${ICONS.star} Vu, noter</div>
      <div class="wl-card-content" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
        ${posterHtml}
        <div class="wl-body">
          <div class="wl-title">${item.title}</div>
          <div class="wl-meta">${[item.year, item.genre].filter(Boolean).join(' · ')}</div>
          <div class="wl-providers" id="wl-providers-${i}">
            <span class="wl-provider-loading">⏳ Chargement streaming...</span>
          </div>
        </div>
        <div class="wl-actions">
          <button class="wl-btn rate" onclick="watchlistToForm(${i})" title="Je l'ai vu, noter" aria-label="Noter ${escAttr(item.title)}, vu">${ICONS.star}</button>
          <button class="wl-btn del" onclick="removeWatchlist(${i})" title="Retirer" aria-label="Retirer ${escAttr(item.title)} de la watchlist">${ICONS.close}</button>
        </div>
      </div>`;

    container.appendChild(div);
    applyPosterAccent(item.poster, div);
    attachWatchlistSwipeHandlers(div, i);

    if (item.tmdbId) {
      fetchProviders(item.tmdbId, i);
    } else {
      const pd = document.getElementById(`wl-providers-${i}`);
      if (pd) pd.innerHTML = '';
    }
  });
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
        html += `<img class="wl-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }
    if (rentOnly.length > 0) {
      html += `<span class="wl-provider-tag rent">Location</span>`;
      rentOnly.slice(0, 4).forEach(p => {
        html += `<img class="wl-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
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

  let genre = '';
  try {
    const res = await fetch(`/api/search?id=${movie.id}`);
    const data = await res.json();
    genre = data.genres?.map(g => g.name).join(', ') || '';
  } catch {}

  list.unshift({
    title: movie.title,
    year,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : '',
    genre,
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
  const newRow = document.getElementById('wl-picker-new-row');
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
    pickList(id);
  };
  newInput.onkeydown = (e) => { if (e.key === 'Enter') newConfirm.click(); };
  cancelBtn.onclick = () => closeModal(modal);

  lastFocusedBeforeModal = document.activeElement;
  modal.classList.add('open');
  (meta.length > 0 ? listEl.querySelector('.wl-picker-item') : newBtn)?.focus();
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
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key)) || []; } catch {}
  list.splice(Math.min(deletedWlItemIndex, list.length), 0, deletedWlItemCache);
  localStorage.setItem(key, JSON.stringify(list));
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
      const data = await res.json();
      if (!data.results?.length && !personMatch) { wlSuggestEl.style.display = 'none'; return; }
      wlSuggestEl.innerHTML = '';
      wlSuggestEl.style.display = 'block';

      if (personMatch) {
        const photoUrl = personMatch.profile_path ? `https://image.tmdb.org/t/p/w92${personMatch.profile_path}` : '';
        const personEl = document.createElement('div');
        personEl.className = 'wl-suggest-item';
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
        const el = document.createElement('div');
        el.className = 'wl-suggest-item';
        el.innerHTML = `
          ${m.poster_path
            ? `<img class="wl-suggest-poster" src="https://image.tmdb.org/t/p/w92${m.poster_path}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">`
            : `<div class="wl-suggest-poster" style="display:flex;align-items:center;justify-content:center;">${ICONS.clapper}</div>`}
          <div>
            <div class="wl-suggest-title">${m.title}</div>
            <div class="wl-suggest-year">${year}</div>
          </div>`;
        el.addEventListener('click', () => {
          wlSuggestEl.style.display = 'none';
          wlInput.value = '';
          addToWatchlistFromTMDb(m, year);
        });
        wlSuggestEl.appendChild(el);
      });
    } catch {
      wlSuggestEl.style.display = 'none';
      showToast('Recherche indisponible, vérifie ta connexion.');
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
function renderWatchlistTabs() {
  const meta = loadWatchlistsMeta();
  const activeId = getActiveWatchlistId();
  const activeMeta = meta.find(l => l.id === activeId) || meta[0];
  const nameEl = document.getElementById('watchlist-active-name');
  if (nameEl) nameEl.textContent = activeMeta ? activeMeta.name : 'À voir';

  const row = document.getElementById('wl-lists-row');
  if (!row) return;
  row.innerHTML = meta.map(l =>
    `<button type="button" class="wl-list-pill${l.id === activeId ? ' active' : ''}" data-id="${l.id}">${l.name.replace(/</g, '&lt;')}</button>`
  ).join('') + `<button type="button" class="wl-list-pill wl-list-add" id="wl-list-add-btn">${ICONS.plus} Nouvelle liste</button>`;
}

function openWlListManageMenu(id) {
  const meta = loadWatchlistsMeta();
  const entry = meta.find(l => l.id === id);
  if (!entry) return;

  actionSheetTitleEl.textContent = entry.name;
  const actions = [
    { label: 'Renommer', icon: ICONS.edit, onClick: () => openWlListModal('rename', id) },
    {
      label: 'Supprimer cette liste', icon: ICONS.trash, danger: true,
      onClick: () => {
        if (loadWatchlistsMeta().length <= 1) { showToast('Impossible de supprimer la dernière liste.'); return; }
        openModal('Supprimer la liste', `Supprimer "${entry.name}" et tous ses films ? Cette action est définitive.`, () => {
          deleteWatchlistList(id);
          renderWatchlistTabs();
          renderWatchlist();
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

  lastFocusedBeforeModal = document.activeElement;
  actionSheetEl.classList.add('open');
}

let wlModalMode = 'create';
let wlModalTargetId = null;

function openWlListModal(mode, targetId = null) {
  wlModalMode = mode;
  wlModalTargetId = targetId;
  document.getElementById('wl-list-modal-title').textContent = mode === 'create' ? 'Nouvelle liste' : 'Renommer la liste';
  document.getElementById('wl-list-modal-confirm').textContent = mode === 'create' ? 'Créer' : 'Renommer';
  const input = document.getElementById('wl-list-name-input');
  input.value = mode === 'rename' ? (loadWatchlistsMeta().find(l => l.id === targetId)?.name || '') : '';
  lastFocusedBeforeModal = document.activeElement;
  document.getElementById('wl-list-modal').classList.add('open');
  setTimeout(() => input.focus(), 50);
}

document.getElementById('wl-lists-row').addEventListener('click', (e) => {
  if (e.target.closest('#wl-list-add-btn')) { openWlListModal('create'); return; }
  const pill = e.target.closest('.wl-list-pill');
  if (!pill) return;
  const id = pill.dataset.id;
  if (id === getActiveWatchlistId()) {
    openWlListManageMenu(id); // déjà active : un tap dessus propose de la gérer
  } else {
    setActiveWatchlistId(id);
    renderWatchlistTabs();
    renderWatchlist();
  }
});

document.getElementById('wl-list-modal-confirm').addEventListener('click', () => {
  const name = document.getElementById('wl-list-name-input').value.trim();
  if (!name) { showToast('Donne un nom à la liste.'); return; }
  if (wlModalMode === 'create') {
    const id = createWatchlistList(name);
    setActiveWatchlistId(id);
    showToast(`Liste "${name}" créée.`);
  } else {
    renameWatchlistList(wlModalTargetId, name);
    showToast('Liste renommée.');
  }
  closeModal(document.getElementById('wl-list-modal'));
  renderWatchlistTabs();
  renderWatchlist();
});
document.getElementById('wl-list-modal-cancel').addEventListener('click', () => {
  closeModal(document.getElementById('wl-list-modal'));
});

renderWatchlistTabs();
renderWatchlist();

