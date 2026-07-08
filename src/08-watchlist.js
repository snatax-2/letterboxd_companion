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


function renderWatchlist() {
  const list = loadWatchlist();
  const container = document.getElementById('watchlist-list');
  const badge = document.getElementById('watchlist-count-badge');
  badge.textContent = list.length + ' film' + (list.length > 1 ? 's' : '');

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎯</div>Aucun film dans la liste.</div>';
    return;
  }

  container.innerHTML = '';
  list.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'wl-card';
    div.id = `wl-item-${i}`;

    const posterHtml = item.poster
      ? `<div class="wl-poster"><img src="${item.poster}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" onerror="this.parentElement.textContent='🎬'"></div>`
      : `<div class="wl-poster">🎬</div>`;

    div.innerHTML = `
      ${posterHtml}
      <div class="wl-body">
        <div class="wl-title">${item.title}</div>
        <div class="wl-meta">${[item.year, item.genre].filter(Boolean).join(' · ')}</div>
        <div class="wl-providers" id="wl-providers-${i}">
          <span class="wl-provider-loading">⏳ Chargement streaming...</span>
        </div>
      </div>
      <div class="wl-actions">
        <button class="wl-btn rate" onclick="watchlistToForm(${i})" title="Je l'ai vu, noter">⭐</button>
        <button class="wl-btn del" onclick="removeWatchlist(${i})" title="Retirer">✕</button>
      </div>`;

    container.appendChild(div);

    if (item.tmdbId) {
      fetchProviders(item.tmdbId, i);
    } else {
      const pd = document.getElementById(`wl-providers-${i}`);
      if (pd) pd.innerHTML = '';
    }
  });
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
            : `<div class="wl-suggest-poster" style="display:flex;align-items:center;justify-content:center;">🎬</div>`}
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
  renderWatchlist();
  showToast(`"${val}" ajouté à la liste 🎯`);
  wlInput.value = '';
});

wlInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') { wlSuggestEl.style.display = 'none'; }
});

renderWatchlist();

