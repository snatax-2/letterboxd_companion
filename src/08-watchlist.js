// ═══════════════════════════════════════════
//  WATCHLIST & DYNAMIC RECOMMENDATIONS
// ═══════════════════════════════════════════
const WATCHLIST_KEY = 'lbx_watchlist';

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || []; } catch { return []; }
}
function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
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
      setTimeout(() => removeWatchlist(idx), 200);
    } else if (dx >= SWIPE_THRESHOLD) {
      cardEl.classList.add('wl-swipe-out-right');
      contentEl.style.transform = 'translateX(110%)';
      if (navigator.vibrate) navigator.vibrate(20);
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
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.target}</div>Aucun film dans la liste.<button type="button" class="empty-state-cta" id="empty-state-watchlist-cta">Découvrir des films à ajouter</button></div>`;
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
      <div class="wl-card-content">
        ${posterHtml}
        <div class="wl-body">
          <div class="wl-title">${item.title}</div>
          <div class="wl-meta">${[item.year, item.genre].filter(Boolean).join(' · ')}</div>
          <div class="wl-providers" id="wl-providers-${i}">
            <span class="wl-provider-loading">⏳ Chargement streaming...</span>
          </div>
        </div>
        <div class="wl-actions">
          <button class="wl-btn rate" onclick="watchlistToForm(${i})" title="Je l'ai vu, noter">${ICONS.star}</button>
          <button class="wl-btn del" onclick="removeWatchlist(${i})" title="Retirer">${ICONS.close}</button>
        </div>
      </div>`;

    container.appendChild(div);
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

    let html = '';

    const flat = providerRoot.flatrate || [];
    if (flat.length > 0) {
      html += `<span class="wl-provider-tag flatrate">Inclus</span>`;
      flat.slice(0, 5).forEach(p => {
        html += `<img class="wl-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }

    const rent = providerRoot.rent || [];
    const rentOnly = rent.filter(r => !flat.find(f => f.provider_id === r.provider_id));
    if (rentOnly.length > 0) {
      html += `<span class="wl-provider-tag rent">Location</span>`;
      rentOnly.slice(0, 4).forEach(p => {
        html += `<img class="wl-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }

    if (!html) {
      el.innerHTML = '<span class="wl-no-streaming">Non disponible en streaming 🇧🇪</span>';
    } else {
      el.innerHTML = html;
    }
  } catch {
    if (el) el.innerHTML = '<span class="wl-no-streaming">Providers indisponibles</span>';
  }
}

async function addToWatchlistFromTMDb(movie, year) {
  const list = loadWatchlist();
  const key = (movie.title + '|' + year).toLowerCase();
  if (list.find(i => (i.title + '|' + (i.year||'')).toLowerCase() === key)) {
    showToast('Déjà dans la liste.');
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
  saveWatchlist(list);
  window._justSavedWatchlistTitle = movie.title.toLowerCase();
  renderWatchlist();
  showToast(`"${movie.title}" ajouté à la liste 🎯`);
}

window.removeWatchlist = function(idx) {
  const list = loadWatchlist();
  const item = list[idx];
  const title = item?.title;
  list.splice(idx, 1);
  saveWatchlist(list);
  if (item) recordTombstone(WATCHLIST_TOMBSTONES_KEY, watchlistItemKey(item));
  renderWatchlist();
  if (title) showToast(`"${title}" retiré`);
};

window.watchlistToForm = function(idx) {
  const list = loadWatchlist();
  const item = list[idx];
  if (!item) return;
  searchEl.value = item.title;
  searchEl.dispatchEvent(new Event('input'));
  list.splice(idx, 1);
  saveWatchlist(list);
  recordTombstone(WATCHLIST_TOMBSTONES_KEY, watchlistItemKey(item));
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
      const res = await fetch(`/api/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.results?.length) { wlSuggestEl.style.display = 'none'; return; }
      wlSuggestEl.innerHTML = '';
      wlSuggestEl.style.display = 'block';
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

renderWatchlist();

