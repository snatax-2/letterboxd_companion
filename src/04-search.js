// ═══════════════════════════════════════════
//  CONTEXT TAGS
// ═══════════════════════════════════════════
document.querySelectorAll('.ctx-tag').forEach(btn => {
  btn.addEventListener('click', () => {
    const tag = btn.dataset.tag;
    if (activeContextTags.has(tag)) {
      activeContextTags.delete(tag);
      btn.classList.remove('active');
    } else {
      activeContextTags.add(tag);
      btn.classList.add('active');
    }
    saveDraft();
  });
});

// ═══════════════════════════════════════════
//  TMDb SEARCH & VISUAL FEEDBACK
// ═══════════════════════════════════════════
const searchEl  = document.getElementById('movie-search');
const suggestEl = document.getElementById('suggestions');
const searchStatus = document.getElementById('search-status');
let searchTimer;

searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchEl.value.trim();
  saveDraft();
  if (q.length < 2) { 
    suggestEl.style.display = 'none'; 
    searchStatus.style.display = 'none';
    return; 
  }
  
  searchStatus.style.display = 'none';
  suggestEl.style.display = 'block';
  suggestEl.innerHTML = `
    <div class="skeleton-item"><div class="skeleton-poster skeleton-bg"></div><div style="flex:1"><div class="skeleton-text long skeleton-bg"></div><div class="skeleton-text short skeleton-bg"></div></div></div>
    <div class="skeleton-item"><div class="skeleton-poster skeleton-bg"></div><div style="flex:1"><div class="skeleton-text long skeleton-bg"></div><div class="skeleton-text short skeleton-bg"></div></div></div>
    <div class="skeleton-item"><div class="skeleton-poster skeleton-bg"></div><div style="flex:1"><div class="skeleton-text long skeleton-bg"></div><div class="skeleton-text short skeleton-bg"></div></div></div>
  `;
  
  searchTimer = setTimeout(() => fetchSuggestions(q), 280);
});

searchEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const q = searchEl.value.trim();
    if (!q) return;
    suggestEl.style.display = 'none';
    searchStatus.style.display = 'none';
    clearTimeout(searchTimer);
    selectManual(q);
  }
});

function selectManual(title) {
  document.getElementById('movie-title').value  = title;
  document.getElementById('movie-year').value   = '';
  document.getElementById('movie-poster').value = '';
  document.getElementById('movie-genre').value  = '';
  document.getElementById('movie-runtime').value = '';
  document.getElementById('movie-director').value = '';
  document.getElementById('movie-actors').value  = '';
  document.getElementById('movie-tmdb-score').value = '';
  document.getElementById('movie-tmdb-id').value = '';
  document.getElementById('strip-ratings').style.display = 'none';

  const strip = document.getElementById('film-strip');
  strip.classList.add('visible');
  document.getElementById('strip-title').textContent = title;
  document.getElementById('strip-genre').innerHTML = '<span style="color:var(--text);font-size:0.75rem;">Film ajouté manuellement</span>';
  document.getElementById('strip-poster').style.display = 'none';
  saveDraft();
}

async function fetchSuggestions(q) {
  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(q)}`);
    const data = await res.json();
    searchStatus.style.display = 'none';
    if (!data.results?.length) { suggestEl.style.display = 'none'; return; }
    suggestEl.innerHTML = '';
    suggestEl.style.display = 'block';
    data.results.slice(0, 6).forEach(m => {
      const year = m.release_date?.slice(0, 4) || '????';
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      const imgHtml = m.poster_path
        ? `<img class="suggestion-poster" src="https://image.tmdb.org/t/p/w92${m.poster_path}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">`
        : `<div class="suggestion-poster-placeholder">🎬</div>`;
      item.innerHTML = `${imgHtml}<div class="suggestion-info"><div class="suggestion-title">${m.title}</div><div class="suggestion-year">${year}</div></div>`;
      item.addEventListener('click', () => selectMovie(m, year));
      suggestEl.appendChild(item);
    });
    const manualItem = document.createElement('div');
    manualItem.className = 'suggestion-item suggestion-manual';
    manualItem.innerHTML = `<div class="suggestion-poster-placeholder" style="font-size:1rem;">✏️</div><div class="suggestion-info"><div class="suggestion-title" style="color:var(--text-mid);">Utiliser "${q}" sans TMDb</div><div class="suggestion-year">Saisie manuelle</div></div>`;
    manualItem.addEventListener('click', () => { suggestEl.style.display = 'none'; selectManual(q); });
    suggestEl.appendChild(manualItem);
  } catch { 
    searchStatus.style.display = 'none'; 
    suggestEl.style.display = 'none'; 
    showToast('Recherche indisponible, vérifie ta connexion.');
  }
}

async function selectMovie(m, year) {
  document.getElementById('movie-title').value  = m.title;
  document.getElementById('movie-year').value   = year;
  document.getElementById('movie-poster').value = m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : '';
  document.getElementById('movie-tmdb-id').value = m.id;
  searchEl.value = `${m.title} (${year})`;
  suggestEl.style.display = 'none';
  document.getElementById('strip-ratings').style.display = 'none';

  searchStatus.style.display = 'block';
  searchStatus.textContent = '⏳ Récupération des détails...';
  isFetchingMovie = true;

  try {
    const res = await fetch(`/api/search?id=${m.id}`);
    const data = await res.json();

    const genres = data.genres?.map(g => g.name).join(', ') || '';
    const runtime = data.runtime ? `${data.runtime} min` : '';
    
    let director = '';
    let actors = ''; 
    
    if (data.credits && data.credits.crew) {
      const dirObj = data.credits.crew.find(c => c.job === 'Director');
      if (dirObj) director = dirObj.name;
      if (data.credits.cast && data.credits.cast.length > 0) {
        actors = data.credits.cast.slice(0, 3).map(a => a.name).join(', ');
      }
    } else if (data.director) {
      director = data.director;
    }

    document.getElementById('movie-genre').value = genres;
    document.getElementById('movie-runtime').value = runtime;
    document.getElementById('movie-director').value = director;
    document.getElementById('movie-actors').value = actors; 

    document.getElementById('strip-genre').innerHTML = buildStripMeta({
      genre: genres, runtime, year, director, actors
    });

    const score = data.vote_average;
    const count = data.vote_count;
    if (score && score > 0) {
      document.getElementById('movie-tmdb-score').value = score.toFixed(1);
      document.getElementById('strip-tmdb-score').textContent = score.toFixed(1) + '/10';
      document.getElementById('strip-votes').textContent = count ? `${count.toLocaleString('fr-FR')} votes` : '';
      document.getElementById('strip-ratings').style.display = 'flex';
    }
  } catch (err) {
    document.getElementById('strip-genre').textContent = year || '';
    showToast('Détails du film indisponibles, réessaie plus tard.');
  } finally {
    searchStatus.style.display = 'none';
    isFetchingMovie = false;
  }

  const strip = document.getElementById('film-strip');
  strip.classList.add('visible');
  document.getElementById('strip-title').textContent = m.title;
  if (m.poster_path) {
    document.getElementById('strip-poster').src = `https://image.tmdb.org/t/p/w92${m.poster_path}`;
    document.getElementById('strip-poster').alt = `Affiche de ${m.title}`;
    document.getElementById('strip-poster').style.display = 'block';
  }
  
  saveDraft();
}

document.addEventListener('click', e => {
  if (e.target !== searchEl) suggestEl.style.display = 'none';
});

