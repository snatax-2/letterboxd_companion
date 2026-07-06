// ⚠️ FICHIER GÉNÉRÉ AUTOMATIQUEMENT — NE PAS ÉDITER DIRECTEMENT.
// Modifie les fichiers dans src/, puis lance `npm run build`.
// Assemblé depuis : 00-pwa.js, 01-navigation.js, 02-theme.js, 03-foundation.js, 04-search.js, 05-rating-form.js, 06-history.js, 07-data-io.js, 08-watchlist.js, 09-modal-init.js, 10-cloud-sync.js

// ═══════════════════════════════════════════
//  PWA : enregistrement du service worker
// ═══════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Échec silencieux : l'app reste 100% fonctionnelle sans service worker,
      // seul l'usage hors-ligne / l'installation ne sera pas dispo.
    });
  });
}

// ═══════════════════════════════════════════
//  GESTION DES ONGLETS (Desktop & Mobile)
// ═══════════════════════════════════════════
const tabHistBtn = document.getElementById('tab-right-history');
const tabWlBtn = document.getElementById('tab-right-watchlist');
const viewHist = document.getElementById('view-history');
const viewWl = document.getElementById('view-watchlist');

function switchRightTab(tabName) {
  if (tabName === 'history') {
    tabHistBtn.classList.add('active');
    tabWlBtn.classList.remove('active');
    viewHist.classList.add('active');
    viewWl.classList.remove('active');
  } else {
    tabHistBtn.classList.remove('active');
    tabWlBtn.classList.add('active');
    viewHist.classList.remove('active');
    viewWl.classList.add('active');
  }
}

tabHistBtn.addEventListener('click', () => switchRightTab('history'));
tabWlBtn.addEventListener('click', () => switchRightTab('watchlist'));

const navRating = document.getElementById('nav-rating');
const navHistory = document.getElementById('nav-history');
const navWatchlist = document.getElementById('nav-watchlist');
const colRating = document.getElementById('col-rating');
const colRightViews = document.getElementById('col-right-views');

function switchMobileNav(view) {
  navRating.classList.remove('active');
  navHistory.classList.remove('active');
  navWatchlist.classList.remove('active');
  
  colRating.style.display = 'none';
  colRightViews.style.display = 'none';

  if (view === 'rating') {
    navRating.classList.add('active');
    colRating.style.display = 'block'; 
  } else if (view === 'history') {
    navHistory.classList.add('active');
    colRightViews.style.display = 'flex';
    switchRightTab('history');
  } else if (view === 'watchlist') {
    navWatchlist.classList.add('active');
    colRightViews.style.display = 'flex';
    switchRightTab('watchlist');
  }
}

navRating.addEventListener('click', () => switchMobileNav('rating'));
navHistory.addEventListener('click', () => switchMobileNav('history'));
navWatchlist.addEventListener('click', () => switchMobileNav('watchlist'));

window.addEventListener('resize', () => {
  if (window.innerWidth > 860) {
    colRating.style.display = '';
    colRightViews.style.display = '';
  } else {
    const activeNavId = document.querySelector('.nav-btn.active')?.id;
    if (activeNavId === 'nav-history') switchMobileNav('history');
    else if (activeNavId === 'nav-watchlist') switchMobileNav('watchlist');
    else switchMobileNav('rating');
  }
});

if (window.innerWidth <= 860) {
  switchMobileNav('rating');
}

// ═══════════════════════════════════════════
//  THEMING & SETTINGS
// ═══════════════════════════════════════════
function loadSettings() {
  const defaultSettings = { appName: "<em>Ludex</em> Rating Companion", theme: "default" };
  try {
    const saved = JSON.parse(localStorage.getItem('lbx_settings')) || defaultSettings;
    applySettings(saved);
  } catch (e) {
    applySettings(defaultSettings);
  }
}

function applySettings(settings) {
  document.getElementById('main-app-title').innerHTML = settings.appName || "<em>Ludex</em> Rating Companion";
  
  let themeToApply = settings.theme || "default";
  
  if (themeToApply === "system") {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    themeToApply = prefersDark ? "default" : "filmnoir"; 
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (JSON.parse(localStorage.getItem('lbx_settings') || '{}').theme === 'system') {
            document.documentElement.setAttribute('data-theme', e.matches ? "default" : "filmnoir");
            renderAll();
        }
    });
  }
  
  document.documentElement.setAttribute('data-theme', themeToApply);
  
  document.getElementById('setting-app-name').value = (settings.appName || "").replace(/<\/?em>/g, '');
  const th = settings.theme || 'default';
  document.querySelectorAll('.theme-card').forEach(tc =>
    tc.classList.toggle('selected', tc.dataset.theme === th)
  );
}

document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('settings-modal').classList.add('open');
});

document.getElementById('settings-cancel').addEventListener('click', () => {
  const s = JSON.parse(localStorage.getItem('lbx_settings') || '{}');
  applySettings(s); 
  document.getElementById('settings-modal').classList.remove('open');
});

document.getElementById('theme-grid').addEventListener('click', e => {
  const card = e.target.closest('.theme-card');
  if (!card) return;
  document.querySelectorAll('.theme-card').forEach(tc => tc.classList.remove('selected'));
  card.classList.add('selected');
  if(card.dataset.theme !== "system") {
      document.documentElement.setAttribute('data-theme', card.dataset.theme);
  } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? "default" : "filmnoir");
  }
  renderAll();
});

document.getElementById('settings-save').addEventListener('click', () => {
  let rawName = document.getElementById('setting-app-name').value.trim();
  if(!rawName) rawName = "Ludex Rating Companion";
  const firstWord = rawName.split(' ')[0];
  const formattedName = rawName.replace(firstWord, `<em>${firstWord}</em>`);
  
  const newSettings = {
    appName: formattedName,
    theme: (document.querySelector('.theme-card.selected')||{dataset:{theme:'default'}}).dataset.theme
  };
  
  localStorage.setItem('lbx_settings', JSON.stringify(newSettings));
  applySettings(newSettings);
  renderAll();
  document.getElementById('settings-modal').classList.remove('open');
});

loadSettings();

// ═══════════════════════════════════════════
//  GESTION DE LA DATE LOCALE
// ═══════════════════════════════════════════
function setTodayDate() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(today - offset)).toISOString().slice(0, -1);
  document.getElementById('view-date').value = localISOTime.split('T')[0];
}

// ═══════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════
const STORE_KEY = "lbx_v2";
const CRITERIA = ['scenario','realisation','photo','acteurs','ambiance','affect'];

const DESCS = {
  scenario: [
    [9,  "Un chef-d'œuvre narratif. Écriture brillante, dialogues ciselés, structure parfaite et thèmes profonds qui hantent longtemps après le visionnage."],
    [7.5,"Excellent scénario. Récit captivant, personnages bien écrits et rebondissements intelligents qui maintiennent un fort engagement."],
    [5.5,"Une histoire classique et fonctionnelle. Fait le travail correctement, mais suit des sentiers battus ou manque d'une vraie prise de risque."],
    [4.5,"Des maladresses évidentes. Rythme inconstant, facilités scénaristiques ou dialogues un peu artificiels qui sortent du récit."],
    [2.5,"Récit laborieux. De graves incohérences, des intrigues secondaires inutiles ou des personnages aux réactions incompréhensibles."],
    [0,  "Un naufrage scénaristique total. Dénué de sens, ennuyeux à mourir ou insultant pour l'intelligence du spectateur."]
  ],
  realisation: [
    [9,  "Une masterclass de mise en scène. Une vision d'auteur absolue où chaque plan respire l'intelligence, la maîtrise et l'audace visuelle."],
    [7.5,"Réalisation forte et inspirée. Le réalisateur a un vrai point de vue, avec une caméra dynamique qui sublime le propos du film."],
    [5.5,"Mise en scène artisanale et propre. Efficace, lisible, mais qui s'efface souvent derrière son sujet sans fulgurance visuelle."],
    [4.5,"Une réalisation impersonnelle. Ressemble plus à un produit de commande ou à un téléfilm manquant cruellement de caractère."],
    [2.5,"Mise en scène paresseuse ou confuse. Découpage hasardeux, absence de rythme ou tics visuels qui fatiguent l'œil."],
    [0,  "Catastrophique. Incompétence technique crasse, montage épileptique ou plans littéralement illisibles."]
  ],
  photo: [
    [9,  "Une claque visuelle absolue. Chaque plan est un tableau. Gestion de la lumière, colorimétrie et cadrages atteignent le sublime."],
    [7.5,"Superbe photographie. Une identité visuelle très marquée qui participe activement à l'ambiance et flatte constamment la rétine."],
    [5.5,"Esthétique soignée mais standardisée. L'image est belle et propre, mais reste académique ou familière."],
    [4.5,"Visuellement terne ou inégal. Éclairages plats, étalonnage douteux (trop gris/sombre) ou effets spéciaux qui jurent."],
    [2.5,"Laideur visuelle manifeste. Cadrages ratés, image numérique sans texture, ou filtres appliqués sans aucune cohérence artistique."],
    [0,  "Une agression oculaire. Illisible, bouillie de pixels ou éclairage d'une pauvreté affligeante."]
  ],
  acteurs: [
    [9,  "Des performances magistrales et habitées. Des acteurs en état de grâce qui transcendent leurs personnages et crèvent l'écran."],
    [7.5,"Un casting redoutable. Des interprétations justes, intenses et nuancées qui portent le film avec un grand charisme."],
    [5.5,"Jeu solide et convaincant. Les acteurs font le job honnêtement, sans pour autant livrer la performance de leur carrière."],
    [4.5,"Interprétations inégales. Certains tirent leur épingle du jeu, mais d'autres surjouent ou manquent cruellement d'alchimie."],
    [2.5,"Casting en roue libre. Mauvaise direction d'acteurs, expressions forcées, ou têtes d'affiche visiblement venues pour le chèque."],
    [0,  "Un festival de jeu monolithique ou d'hystérie ridicule. Impossible de croire une seule seconde aux personnages."]
  ],
  ambiance: [
    [9,  "Une immersion sensorielle totale. Bande originale mythique et sound design viscéral qui prennent littéralement aux tripes."],
    [7.5,"Excellente atmosphère. La musique et les effets sonores enveloppent le spectateur et renforcent magistralement l'impact émotionnel."],
    [5.5,"Ambiance réussie. Accompagnement sonore fonctionnel et agréable, qui soutient l'action sans pour autant marquer les esprits."],
    [4.5,"Sonorité générique. Musique d'ascenseur, thèmes oubliables ou mixage sonore parfois douteux en retrait."],
    [2.5,"Bande-son envahissante ou hors sujet. Musique omniprésente qui dicte les émotions, ou sound design artificiel qui brise l'immersion."],
    [0,  "Supplice auditif. Bruitages ratés, doublages asynchrones, ou bande originale qui ruine littéralement les scènes clés."]
  ],
  affect: [
    [9,  "Coup de foudre absolu. Un film qui bouleverse, obsède, et trouve une place immédiate dans mon panthéon personnel."],
    [7.5,"Énorme coup de cœur. Une œuvre marquante qui m'a fait vibrer, rire ou pleurer, et que je reverrai avec grand plaisir."],
    [5.5,"Un très bon moment de cinéma. J'ai pris du plaisir devant ce film, même s'il ne me laissera pas un souvenir impérissable."],
    [4.5,"Sentiment mitigé. Pas désagréable, mais je reste totalement sur ma faim. Vite vu, assez vite oublié."],
    [2.5,"Ennui ou agacement profond. Une expérience pénible, où le temps a semblé particulièrement long. Très peu d'accroche."],
    [0,  "Rejet viscéral. Une perte de temps absolue, un film que j'ai détesté de bout en bout et que je veux effacer de ma mémoire."]
  ]
};

const _descCache = {};
function getDesc(criterion, val) {
  const key = criterion + val;
  if (_descCache[key]) return _descCache[key];
  const tiers = DESCS[criterion];
  for (const [thresh, text] of tiers) {
    if (val >= thresh) { _descCache[key] = text; return text; }
  }
  const fallback = tiers[tiers.length - 1][1];
  _descCache[key] = fallback;
  return fallback;
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function buildStripMeta({ genre = '', runtime = '', year = '', director = '', actors = '' } = {}) {
  let meta = [genre, runtime, year].filter(Boolean).join(' · ');
  if (director) meta += `<br><span style="color:var(--text-mid);font-size:0.75rem;font-family:var(--font-body)">Réalisé par <b>${director}</b></span>`;
  if (actors)   meta += `<br><span style="color:var(--text-mid);font-size:0.75rem;font-family:var(--font-body)">Avec <b>${actors}</b></span>`;
  return meta;
}

// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let isLiked     = false;
let currentMode = 'detail'; 
let quickRating = 2.5;      
let sortOrder   = 'date';
let activeGenre = null; 
let weightsOpen = false;
let pendingAction = null; 
let activeContextTags = new Set(); 
let historySearchQuery = ''; 
let isFetchingMovie = false; 
let activeScoreFilter = null; 

// ═══════════════════════════════════════════
//  STORAGE & DRAFT
// ═══════════════════════════════════════════
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}
function saveHistory(history) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(history));
    if (window.storage) window.storage.set(STORE_KEY, JSON.stringify(history));
  } catch(e) { console.warn('Storage full', e); }
}

function saveDraft() {
  if (isFetchingMovie) return;
  const draft = {
    title: document.getElementById('movie-title').value,
    year: document.getElementById('movie-year').value,
    poster: document.getElementById('movie-poster').value,
    genre: document.getElementById('movie-genre').value,
    runtime: document.getElementById('movie-runtime').value,
    director: document.getElementById('movie-director').value,
    actors: document.getElementById('movie-actors').value,
    tmdbScore: document.getElementById('movie-tmdb-score').value,
    searchValue: document.getElementById('movie-search').value,
    date: document.getElementById('view-date').value,
    liked: isLiked,
    mode: currentMode,
    quickRating: quickRating,
    values: CRITERIA.reduce((acc, c) => { acc[c] = document.getElementById(c).value; return acc; }, {}),
    review: document.getElementById('review-text').value,
    tags: Array.from(activeContextTags)
  };
  localStorage.setItem('lbx_draft', JSON.stringify(draft));
}

function loadDraft() {
  try {
    const draftStr = localStorage.getItem('lbx_draft');
    if (!draftStr) {
      setTodayDate();
      return;
    }
    const draft = JSON.parse(draftStr);
    
    if (draft.title) {
      document.getElementById('movie-title').value = draft.title;
      document.getElementById('movie-year').value = draft.year || '';
      document.getElementById('movie-poster').value = draft.poster || '';
      document.getElementById('movie-genre').value = draft.genre || '';
      document.getElementById('movie-runtime').value = draft.runtime || '';
      document.getElementById('movie-director').value = draft.director || '';
      document.getElementById('movie-actors').value = draft.actors || '';
      document.getElementById('movie-tmdb-score').value = draft.tmdbScore || '';
      document.getElementById('movie-search').value = draft.searchValue || '';
      
      const strip = document.getElementById('film-strip');
      strip.classList.add('visible');
      document.getElementById('strip-title').textContent = draft.title;
      document.getElementById('strip-genre').innerHTML = buildStripMeta({
        genre: draft.genre, runtime: draft.runtime, year: draft.year,
        director: draft.director, actors: draft.actors
      });
      if (draft.poster) {
        document.getElementById('strip-poster').src = draft.poster;
        document.getElementById('strip-poster').style.display = 'block';
      }
      if (draft.tmdbScore) {
        document.getElementById('strip-tmdb-score').textContent = draft.tmdbScore + '/10';
        document.getElementById('strip-ratings').style.display = 'flex';
      }
    }

    if (draft.date) {
      document.getElementById('view-date').value = draft.date;
    } else {
      setTodayDate();
    }

    if (draft.review) document.getElementById('review-text').value = draft.review;
    
    isLiked = draft.liked || false;
    document.getElementById('heart-btn').classList.toggle('active', isLiked);

    activeContextTags = new Set(draft.tags || []);
    document.querySelectorAll('.ctx-tag').forEach(b => {
      if (activeContextTags.has(b.dataset.tag)) b.classList.add('active');
      else b.classList.remove('active');
    });

    if (draft.mode) setMode(draft.mode);
    if (draft.quickRating) {
      quickRating = parseFloat(draft.quickRating);
      const radioId = 's' + (quickRating * 2);
      const radioEl = document.getElementById(radioId);
      if(radioEl) radioEl.checked = true;
    }
    if (draft.values) {
      CRITERIA.forEach(c => {
        if (draft.values[c]) document.getElementById(c).value = draft.values[c];
      });
    }
    calculateScore();
    updateAllSliders();

  } catch(e) { console.error("Erreur de chargement du brouillon", e); }
}

renderAll();
loadDraft();

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
        ? `<img class="suggestion-poster" src="https://image.tmdb.org/t/p/w92${m.poster_path}" loading="lazy">`
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
    document.getElementById('strip-poster').style.display = 'block';
  }
  
  saveDraft();
}

document.addEventListener('click', e => {
  if (e.target !== searchEl) suggestEl.style.display = 'none';
});

// ═══════════════════════════════════════════
//  HEART & DATES & REVIEW TEXT
// ═══════════════════════════════════════════
document.getElementById('heart-btn').addEventListener('click', () => {
  if (navigator.vibrate) navigator.vibrate(50);
  isLiked = !isLiked;
  document.getElementById('heart-btn').classList.toggle('active', isLiked);
  saveDraft();
});

document.getElementById('view-date').addEventListener('change', saveDraft);
document.getElementById('review-text').addEventListener('input', saveDraft);

// ═══════════════════════════════════════════
//  MODE (Détaillé / Rapide)
// ═══════════════════════════════════════════
function setMode(mode) {
  currentMode = mode;
  document.body.classList.toggle('quick-mode', mode === 'quick');
  
  document.getElementById('tab-detail').classList.toggle('active', mode === 'detail');
  document.getElementById('tab-quick').classList.toggle('active', mode === 'quick');
  document.getElementById('mode-badge').textContent = mode === 'detail' ? 'Mode détaillé' : 'Mode rapide';
  
  calculateScore();
  saveDraft();
}

// ═══════════════════════════════════════════
//  QUICK STARS RATING
// ═══════════════════════════════════════════
document.getElementById('quick-stars-container').addEventListener('change', (e) => {
    quickRating = parseFloat(e.target.value);
    calculateScore();
    updateQuickLabel();
    saveDraft();
});

function updateQuickLabel() {
  const label = document.getElementById('quick-rating-label');
  if (!label) return;
  const score = quickRating * 2;
  const stars = getStarStr(Math.round((score / 2) * 2) / 2);
  label.innerHTML = `<span>${stars}</span> — ${score.toFixed(1)}/10`;
}

// ═══════════════════════════════════════════
//  WEIGHTS
// ═══════════════════════════════════════════
function toggleWeights() {
  weightsOpen = !weightsOpen;
  document.getElementById('weights-panel').classList.toggle('open', weightsOpen);
  document.getElementById('weights-toggle').style.color = weightsOpen ? 'var(--orange)' : '';
}

function getWeights() {
  const w = {};
  CRITERIA.forEach(c => {
    const v = parseFloat(document.getElementById(`w-${c}`).value);
    w[c] = isNaN(v) || v < 0 ? 0 : v;
  });
  return w;
}

function resetWeights() {
  CRITERIA.forEach(c => { document.getElementById(`w-${c}`).value = 1; });
  updateWeightBadges();
  calculateScore();
}

function updateWeightBadges() {
  const w = getWeights();
  CRITERIA.forEach(c => {
    document.getElementById(`wb-${c}`).textContent = `×${w[c]}`;
  });
}

CRITERIA.forEach(c => {
  const el = document.getElementById(`w-${c}`);
  if (el) el.addEventListener('input', () => { updateWeightBadges(); calculateScore(); });
});

// ═══════════════════════════════════════════
//  SCORE CALCULATION
// ═══════════════════════════════════════════
function getStarStr(stars) {
  let s = '';
  const full = Math.floor(stars);
  const half = (stars % 1) !== 0;
  for (let i = 0; i < full; i++) s += '★';
  if (half) s += '½';
  return s || '½';
}

function calculateScore() {
  let score;

  if (currentMode === 'quick') {
    score = quickRating * 2; 
  } else {
    const w = getWeights();
    let weightedSum = 0, totalWeight = 0;
    CRITERIA.forEach(c => {
      const val = parseFloat(document.getElementById(c).value);
      const wt  = w[c];
      document.getElementById(`val-${c}`).textContent = val.toFixed(1);
      document.getElementById(`desc-${c}`).textContent = getDesc(c, val);
      weightedSum  += val * wt;
      totalWeight  += wt;
    });
    score = totalWeight > 0 ? weightedSum / totalWeight : 5;
  }

  const scoreEl = document.getElementById('score-big');
  const denomEl = document.querySelector('.score-denom');

  scoreEl.textContent = score.toFixed(1);
  denomEl.textContent = '/10';
  scoreEl.className = 'score-big ' + (score >= 7.5 ? 'good' : score >= 5.0 ? 'mid' : 'bad');

  const stars = Math.round((score / 2) * 2) / 2;
  document.getElementById('stars-display').textContent = getStarStr(stars);

  return score;
}

function updateSliderPct(el) {
  const val = parseFloat(el.value);
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max) || 10;
  el.style.setProperty('--slider-pct', ((val - min) / (max - min)) * 100 + '%');
}

function updateAllSliders() {
  CRITERIA.forEach(c => {
    const el = document.getElementById(c);
    if (el) updateSliderPct(el);
  });
}

CRITERIA.forEach(c => {
  document.getElementById(c).addEventListener('input', () => {
    updateSliderPct(document.getElementById(c));
    calculateScore();
    saveDraft();
  });
});

// ═══════════════════════════════════════════
//  NOUVELLE CRITIQUE (RESET)
// ═══════════════════════════════════════════
document.getElementById('new-btn').addEventListener('click', () => {
  openModal('Nouvelle critique', 'Voulez-vous effacer le formulaire actuel pour commencer une nouvelle critique ?', () => {
    localStorage.removeItem('lbx_draft');
    resetForm();
    showToast('Formulaire réinitialisé');
  });
});

// ═══════════════════════════════════════════
//  COPY TEXT
// ═══════════════════════════════════════════
document.getElementById('copy-btn').addEventListener('click', () => {
  const title    = document.getElementById('movie-title').value.trim() || searchEl.value.trim() || 'Film sans titre';
  const year     = document.getElementById('movie-year').value;
  const director = document.getElementById('movie-director').value;
  const actors   = document.getElementById('movie-actors').value;
  const dateVal  = document.getElementById('view-date').value;
  const dateStr  = dateVal ? new Date(dateVal + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : '';
  const review   = document.getElementById('review-text').value.trim();
  const score    = calculateScore(); 
  const stars    = document.getElementById('stars-display').textContent;
  const heartStr = isLiked ? ' ❤️' : '';

  let text = `📽 ${title} ${year ? '('+year+') ' : ''}${heartStr}\n`;
  if (director) text += `🎬 Un film de ${director}\n`;
  if (actors) text += `🎭 Avec ${actors}\n`;
  if (dateStr) text += `🗓 Vu le ${dateStr}\n`;
  if (activeContextTags.size > 0) text += `🏷 ${Array.from(activeContextTags).join(' · ')}\n`;
  
  text += `⭐ ${stars} (${score.toFixed(1)}/10)\n`;

  if (currentMode === 'detail') {
    const vals = CRITERIA.reduce((acc, c) => {
      acc[c] = parseFloat(document.getElementById(c).value).toFixed(1);
      return acc;
    }, {});
    text += `\nScénario ${vals.scenario} · Réal ${vals.realisation} · Photo ${vals.photo} · Acteurs ${vals.acteurs} · Son ${vals.ambiance} · Affect ${vals.affect}\n`;
  }

  if (review) text += `\n${review}`;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Copié !';
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = '📋 Texte'; btn.classList.remove('copied'); }, 2000);
    showToast('Critique copiée dans le presse-papier');
  });
});

// ═══════════════════════════════════════════
//  SAVE
// ═══════════════════════════════════════════
document.getElementById('save-btn').addEventListener('click', () => {
  if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  
  const title = document.getElementById('movie-title').value.trim() || searchEl.value.trim();
  if (!title) { showToast('Entrez un titre de film avant de sauvegarder.'); return; }

  const history  = loadHistory();
  const existing = history.find(h => h.title.toLowerCase() === title.toLowerCase());
  const score    = calculateScore();

  const movie = {
    title,
    year:       document.getElementById('movie-year').value,
    poster:     document.getElementById('movie-poster').value,
    genre:      document.getElementById('movie-genre').value,
    runtime:    document.getElementById('movie-runtime').value,
    director:   document.getElementById('movie-director').value,
    actors:     document.getElementById('movie-actors').value, 
    tmdbScore:  document.getElementById('movie-tmdb-score').value || null,
    date:       document.getElementById('view-date').value,
    liked:      isLiked,
    contextTags: Array.from(activeContextTags),
    score:      score.toFixed(1),
    stars:      document.getElementById('stars-display').textContent,
    mode:       currentMode,
    review:     document.getElementById('review-text').value.trim(),
    values: currentMode === 'detail'
      ? CRITERIA.reduce((acc, c) => { acc[c] = document.getElementById(c).value; return acc; }, {})
      : { quick: quickRating },
    savedAt: existing && existing.savedAt ? existing.savedAt : new Date().toISOString(),
    updatedAt: new Date().toISOString() // sert à la fusion lors de la synchro cloud
  };

  if (existing) {
    openModal(
      'Film déjà noté',
      `"${title}" est déjà dans votre historique avec ${existing.score}/10.\nVoulez-vous écraser cette note ?`,
      () => {
        const idx = history.findIndex(h => h.title.toLowerCase() === title.toLowerCase());
        history.splice(idx, 1);
        history.unshift(movie);
        saveHistory(history);
        localStorage.removeItem('lbx_draft');
        resetForm();
        renderAll();
        showToast(`"${title}" mis à jour`);
      }
    );
  } else {
    history.unshift(movie);
    saveHistory(history);
    localStorage.removeItem('lbx_draft'); 
    resetForm();
    renderAll();
    showToast(`"${title}" enregistré`);
    const saveBtn = document.getElementById('save-btn');
    const origSave = saveBtn.innerHTML;
    saveBtn.innerHTML = '✓ Sauvé !';
    saveBtn.style.background = 'var(--green)';
    saveBtn.style.color = '#0d1117';
    setTimeout(() => { saveBtn.innerHTML = origSave; saveBtn.style.background = ''; saveBtn.style.color = ''; }, 1800);
  }
});

function resetForm() {
  searchEl.value = '';
  document.getElementById('movie-title').value     = '';
  document.getElementById('movie-year').value      = '';
  document.getElementById('movie-poster').value    = '';
  document.getElementById('movie-genre').value     = '';
  document.getElementById('movie-runtime').value   = '';
  document.getElementById('movie-director').value  = '';
  document.getElementById('movie-actors').value    = '';
  document.getElementById('movie-tmdb-score').value = '';
  document.getElementById('review-text').value     = '';
  document.getElementById('strip-ratings').style.display = 'none';
  document.getElementById('film-strip').classList.remove('visible');
  
  isLiked = false;
  document.getElementById('heart-btn').classList.remove('active');
  setTodayDate();
  
  activeContextTags.clear();
  document.querySelectorAll('.ctx-tag').forEach(b => b.classList.remove('active'));

  CRITERIA.forEach(c => { document.getElementById(c).value = 5; });
  quickRating = 2.5;
  const defaultRadio = document.getElementById('s5'); 
  if(defaultRadio) defaultRadio.checked = true;
  
  setMode('detail'); 
  updateAllSliders();
  updateQuickLabel();
}

// ═══════════════════════════════════════════
//  LOAD MOVIE
// ═══════════════════════════════════════════
window.loadItem = function(idx) {
  const history = loadHistory(); const item = history[idx]; if (!item) return;
  document.getElementById('movie-title').value  = item.title;
  document.getElementById('movie-year').value   = item.year || '';
  document.getElementById('movie-poster').value = item.poster || '';
  document.getElementById('movie-genre').value  = item.genre  || '';
  document.getElementById('movie-runtime').value = item.runtime || '';
  document.getElementById('movie-director').value = item.director || '';
  document.getElementById('movie-actors').value   = item.actors || ''; 
  
  searchEl.value = item.title;
  document.getElementById('view-date').value     = item.date  || '';
  document.getElementById('review-text').value   = item.review || '';
  isLiked = item.liked || false;
  document.getElementById('heart-btn').classList.toggle('active', isLiked);

  activeContextTags = new Set(item.contextTags || []);
  document.querySelectorAll('.ctx-tag').forEach(b => {
    if (activeContextTags.has(b.dataset.tag)) b.classList.add('active');
    else b.classList.remove('active');
  });

  const strip = document.getElementById('film-strip');
  strip.classList.add('visible');
  document.getElementById('strip-title').textContent = item.title;
  
  document.getElementById('strip-genre').innerHTML = buildStripMeta({
    genre: item.genre, runtime: item.runtime, year: item.year,
    director: item.director, actors: item.actors
  });

  if (item.poster) {
    document.getElementById('strip-poster').src = item.poster;
    document.getElementById('strip-poster').style.display = 'block';
  }

  if (item.mode === 'quick' && item.values?.quick !== undefined) {
    setMode('quick');
    quickRating = parseFloat(item.values.quick);
    const radioId = 's' + (quickRating * 2); 
    const radioEl = document.getElementById(radioId);
    if(radioEl) radioEl.checked = true; 
  } else {
    setMode('detail');
    CRITERIA.forEach(c => {
      document.getElementById(c).value = item.values && item.values[c] !== undefined ? item.values[c] : 5;
    });
  }

  calculateScore();
  saveDraft(); 
  
  if (window.innerWidth <= 860) switchMobileNav('rating');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ═══════════════════════════════════════════
//  TOAST & DELETE WITH UNDO
// ═══════════════════════════════════════════
let toastTimer;
let deletedItemCache = null; 
let deletedItemIndex = null;

function showToast(msg, withUndo = false) {
  const t = document.getElementById('toast');
  
  let html = `<span>${msg}</span>`;
  if (withUndo) {
    html += `<button class="toast-undo-btn" onclick="undoDelete()">Annuler</button>`;
  }
  t.innerHTML = html;
  
  t.classList.add('show');
  clearTimeout(toastTimer);
  
  toastTimer = setTimeout(() => { 
      t.classList.remove('show');
      deletedItemCache = null; 
  }, withUndo ? 4500 : 2800);
}

window.deleteItem = function(idx, btnEl) {
  const history = loadHistory();
  deletedItemCache = history[idx]; 
  deletedItemIndex = idx;
  
  if (btnEl) {
    const cardToAnimate = btnEl.closest('.hist-item');
    cardToAnimate.classList.add('deleting');
  }

  setTimeout(() => {
    history.splice(idx, 1);
    saveHistory(history);
    if (deletedItemCache?.title) {
      recordTombstone(HISTORY_TOMBSTONES_KEY, deletedItemCache.title.toLowerCase());
    }
    renderAll();
    showToast(`Film supprimé.`, true);
  }, 300);
};

window.undoDelete = function() {
  if (!deletedItemCache) return;
  const history = loadHistory();
  history.splice(deletedItemIndex, 0, deletedItemCache); 
  saveHistory(history);
  if (deletedItemCache?.title) {
    removeTombstone(HISTORY_TOMBSTONES_KEY, deletedItemCache.title.toLowerCase());
  }
  renderAll();
  showToast(`Suppression annulée.`);
  deletedItemCache = null;
};

// ═══════════════════════════════════════════
//  RECHERCHE HISTORIQUE
// ═══════════════════════════════════════════
let histSearchTimer;
document.getElementById('history-search').addEventListener('input', (e) => {
  historySearchQuery = e.target.value.toLowerCase();
  clearTimeout(histSearchTimer);
  histSearchTimer = setTimeout(renderHistory, 150);
});

// ═══════════════════════════════════════════
//  RENDER HISTORY / DASHBOARD / STATS
// ═══════════════════════════════════════════
function getGenres(history) {
  const set = new Set();
  history.forEach(item => {
    if (item.genre) {
      item.genre.split(',').forEach(g => { const t = g.trim(); if (t) set.add(t); });
    }
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

function renderGenreChips(history) {
  const genres = getGenres(history);
  const row    = document.getElementById('genre-filter-row');
  const chips  = document.getElementById('genre-chips');

  if (genres.length === 0) { row.style.display = 'none'; return; }
  row.style.display = 'flex';
  chips.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'genre-chip all-chip' + (activeGenre === null ? ' active' : '');
  allChip.textContent = 'Tous';
  allChip.addEventListener('click', () => { activeGenre = null; activeScoreFilter = null; renderGenreChips(history); renderHistory(); });
  chips.appendChild(allChip);

  genres.forEach(g => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip' + (activeGenre === g ? ' active' : '');
    chip.textContent = g;
    chip.addEventListener('click', () => {
      activeGenre = (activeGenre === g) ? null : g;
      renderGenreChips(history);
      renderHistory();
    });
    chips.appendChild(chip);
  });
}

function getSorted(history) {
  let h = history;

  if (activeGenre) {
    h = h.filter(item => item.genre && item.genre.split(',').map(g => g.trim()).includes(activeGenre));
  }

  if (activeScoreFilter !== null) {
    const scoreRanges = {
      '50': [9,10], '45': [8.5,9], '40': [7.5,8.5], '35': [6.5,7.5], '30': [5.5,6.5],
      '25': [4.5,5.5], '20': [3.5,4.5], '15': [2.5,3.5], '10': [1.5,2.5], '05': [0,1.5]
    };
    const [lo, hi] = scoreRanges[activeScoreFilter] || [0,10];
    h = h.filter(item => {
      const s = parseFloat(item.score);
      return s >= lo && (activeScoreFilter === '50' ? s <= hi : s < hi);
    });
  }

  if (historySearchQuery) {
    h = h.filter(item => {
      const titleMatch = item.title && item.title.toLowerCase().includes(historySearchQuery);
      const dirMatch = item.director && item.director.toLowerCase().includes(historySearchQuery);
      const actMatch = item.actors && item.actors.toLowerCase().includes(historySearchQuery);
      return titleMatch || dirMatch || actMatch;
    });
  }

  if (sortOrder === 'date') {
    return h.sort((a, b) => {
      const dateA = a.date || a.savedAt || "";
      const dateB = b.date || b.savedAt || "";
      return dateB.localeCompare(dateA); 
    });
  }

  if (sortOrder === 'score-desc') return h.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  if (sortOrder === 'score-asc')  return h.sort((a, b) => parseFloat(a.score) - parseFloat(b.score));
  if (sortOrder === 'title')      return h.sort((a, b) => a.title.localeCompare(b.title));
  
  return h; 
}

function renderHistory() {
  const history   = loadHistory();
  const sorted    = getSorted(history);
  const container = document.getElementById('history-list');

  const badge = document.getElementById('hist-count-badge');
  if (activeGenre || historySearchQuery || activeScoreFilter) {
    badge.textContent = `${sorted.length} / ${history.length} film${history.length > 1 ? 's' : ''}`;
    badge.style.color = 'var(--orange)';
  } else {
    badge.textContent = history.length + ' film' + (history.length > 1 ? 's' : '');
    badge.style.color = '';
  }

  renderGenreChips(history);

  if (history.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎬</div>Aucun film noté. Évaluez votre premier film !</div>`;
    return;
  }

  if (sorted.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div>Aucun résultat pour cette recherche.</div>`;
    return;
  }

  container.innerHTML = '';
  sorted.forEach((item, i) => {
    const realIdx = history.findIndex(h => h.savedAt === item.savedAt && h.title === item.title);
    const div = document.createElement('div');
    div.className = 'hist-item';

    const scoreNum = parseFloat(item.score);
    let scoreColor = 'var(--red)';
    if(scoreNum >= 7.5) scoreColor = 'var(--green)';
    else if(scoreNum >= 5.0) scoreColor = 'var(--gold)';

    const imgHtml = item.poster
      ? `<img class="hist-poster" src="${item.poster}" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=\\'hist-poster-ph\\'>🎬</div>'">`
      : `<div class="hist-poster-ph">🎬</div>`;

    const tmdbHtml = item.tmdbScore
      ? `<span class="hist-tmdb">★ ${item.tmdbScore} TMDb</span>`
      : '';

    let metaHTML = '';
    if (item.year) metaHTML += item.year + ' · ';
    if (item.runtime) metaHTML += item.runtime + ' · ';
    metaHTML += item.genre || '';
    if (item.director) metaHTML += `<br><span style="color:var(--text-mid)">Réalisé par <b>${item.director}</b></span>`;
    if (item.actors) metaHTML += `<br><span style="color:var(--text-mid)">Avec <b>${item.actors}</b></span>`;

    let tagsHTML = '';
    if (item.contextTags && item.contextTags.length > 0) {
      tagsHTML = `<div class="hist-tags-disp">${item.contextTags.map(t => `<span class="h-tag">${t}</span>`).join('')}</div>`;
    }

    let reviewHTML = '';
    if (item.review) {
      reviewHTML = `
        <div class="hist-review" onclick="this.classList.toggle('expanded')">
          <div class="hist-review-content">"${item.review}"</div>
          <span class="hist-review-toggle"></span>
        </div>
      `;
    }

    div.innerHTML = `
      ${imgHtml}
      <div class="hist-body">
        <div class="hist-title">${item.title}${item.liked ? ' ❤️' : ''}</div>
        <div class="hist-meta">${metaHTML}</div>
        ${tagsHTML}
        <div style="margin-bottom:4px;"><span style="color:${scoreColor};font-weight:700;">${item.score}/10</span>${tmdbHtml}</div>
        <div class="hist-stars">${item.stars}<span class="hist-score"></span></div>
        ${reviewHTML}
      </div>
      <div class="hist-actions">
        <button class="hist-action-btn" onclick="loadItem(${realIdx})" title="Modifier">✏️</button>
        <button class="hist-action-btn del" onclick="deleteItem(${realIdx}, this)" title="Supprimer">🗑</button>
      </div>`;
    container.appendChild(div);
  });
}

function createRadarSVG(averages) {
  if (averages.every(a => a === 0)) return null;

  const s = 180, c = s/2, r = s*0.42;
  const angles = [0, 60, 120, 180, 240, 300].map(a => (a - 90) * Math.PI / 180);
  const labels = ['Scén.', 'Réal.', 'Photo.', 'Casting', 'Son', 'Affect'];

  let svg = `<svg viewBox="0 0 ${s} ${s}" width="100%" height="100%" style="max-width:250px; overflow:visible;">`;
  
  [10, 6.66, 3.33].forEach(lvl => {
    const pts = angles.map(a => `${c + (lvl/10)*r*Math.cos(a)},${c + (lvl/10)*r*Math.sin(a)}`).join(' ');
    svg += `<polygon points="${pts}" fill="none" class="svg-grid" />`;
  });

  angles.forEach((a, i) => {
    svg += `<line x1="${c}" y1="${c}" x2="${c + r*Math.cos(a)}" y2="${c + r*Math.sin(a)}" class="svg-axis" />`;
    const lx = c + (r + 14) * Math.cos(a), ly = c + (r + 8) * Math.sin(a);
    const anch = lx < c - 10 ? 'end' : (lx > c + 10 ? 'start' : 'middle');
    svg += `<text x="${lx}" y="${ly}" class="svg-text" text-anchor="${anch}" dominant-baseline="middle">${labels[i]}</text>`;
  });

  const dataPts = angles.map((a, i) => `${c + (averages[i]/10)*r*Math.cos(a)},${c + (averages[i]/10)*r*Math.sin(a)}`).join(' ');
  svg += `<polygon points="${dataPts}" fill="var(--orange)" fill-opacity="0.3" stroke="var(--orange)" stroke-width="2" style="transition:all 0.5s ease" />`;
  
  angles.forEach((a, i) => {
    svg += `<circle cx="${c + (averages[i]/10)*r*Math.cos(a)}" cy="${c + (averages[i]/10)*r*Math.sin(a)}" r="3" fill="var(--blue)" />`;
  });

  svg += `</svg>`;
  return svg;
}

function createTimelineSVG(history) {
  const months = {};
  const now = new Date();
  for(let i=5; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = { c: 0 };
  }
  history.forEach(h => {
    if(h.date) { const k = h.date.substring(0,7); if(months[k]) months[k].c++; }
  });

  const keys = Object.keys(months).sort();
  const maxC = Math.max(...keys.map(k => months[k].c), 1);
  const w = 300, h = 100, pad = 20, barW = (w - pad*2)/6 - 10;

  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="overflow:visible;">`;
  keys.forEach((k, i) => {
    const count = months[k].c;
    const barH = (count / maxC) * (h - pad - 10);
    const x = pad + i*(barW + 10), y = h - pad - barH;
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="var(--border-hi)" rx="2" style="transition:height 0.5s ease, y 0.5s ease" />`;
    if(count > 0) svg += `<text x="${x + barW/2}" y="${y - 4}" class="svg-text-mono" text-anchor="middle">${count}</text>`;
    const mLab = new Date(k+'-01').toLocaleDateString('fr-FR', {month:'short'}).substring(0,3);
    svg += `<text x="${x + barW/2}" y="${h - 5}" class="svg-text" fill="var(--text-mid)" text-anchor="middle">${mLab}</text>`;
  });
  svg += `</svg>`;
  return svg;
}

function renderStats() {
  const history = loadHistory();
  document.getElementById('kpi-total').textContent = history.length;
  
  if (history.length === 0) {
    document.getElementById('kpi-avg').textContent = '-'; 
    document.getElementById('kpi-year').textContent = '0';
    document.getElementById('radar-chart-container').innerHTML = ''; 
    document.getElementById('radar-empty').style.display = 'block';
    document.getElementById('timeline-chart-container').innerHTML = '';
    document.getElementById('top-directors-list').innerHTML = '<div style="font-size:0.8rem;color:var(--text-mid);text-align:center">Enregistrez plus de films avec un réalisateur pour générer ce top.</div>';
    buildHistogram({});
    return;
  }

  const avg = history.reduce((sum, h) => sum + parseFloat(h.score), 0) / history.length;
  document.getElementById('kpi-avg').textContent = avg.toFixed(1);

  const currentYear = new Date().getFullYear().toString();
  const yearCount = history.filter(h => h.date && h.date.startsWith(currentYear)).length;
  document.getElementById('kpi-year').textContent = yearCount;

  let critSums = [0,0,0,0,0,0], detailCount = 0;
  history.forEach(h => { 
    if(h.mode === 'detail' && h.values && h.values.scenario !== undefined) { 
      detailCount++; 
      CRITERIA.forEach((c,i) => critSums[i]+=parseFloat(h.values[c])); 
    }
  });
  const avgs = detailCount > 0 ? critSums.map(s => s/detailCount) : [0,0,0,0,0,0];
  const radarSvg = createRadarSVG(avgs);
  if (radarSvg) { 
    document.getElementById('radar-chart-container').innerHTML = radarSvg; 
    document.getElementById('radar-empty').style.display = 'none'; 
  } else { 
    document.getElementById('radar-chart-container').innerHTML = ''; 
    document.getElementById('radar-empty').style.display = 'block'; 
  }

  document.getElementById('timeline-chart-container').innerHTML = createTimelineSVG(history);

  const dirs = {};
  history.forEach(h => {
    if(h.director) { 
      h.director.split(',').forEach(d => {
        const t = d.trim(); if(!t) return;
        if(!dirs[t]) dirs[t] = { count:0, sum:0 }; 
        dirs[t].count++; dirs[t].sum+=parseFloat(h.score);
      });
    }
  });
  const topD = Object.entries(dirs).map(([name,d]) => ({name, count:d.count, avg:d.sum/d.count})).filter(d=>d.count>1).sort((a,b)=>b.count-a.count || b.avg-a.avg).slice(0,4);
  const dirCont = document.getElementById('top-directors-list');
  if(topD.length > 0) {
    dirCont.innerHTML = topD.map(d => `<div class="top-item" onclick="document.getElementById('history-search').value='${d.name}';document.getElementById('history-search').dispatchEvent(new Event('input'))"><span class="top-item-name">${d.name}</span><div class="top-item-meta"><span>${d.count} films</span><span class="top-item-score">★ ${d.avg.toFixed(1)}</span></div></div>`).join('');
  } else { 
    dirCont.innerHTML = `<div style="font-size:0.8rem;color:var(--text-mid);text-align:center">Enregistrez plus de films avec un réalisateur pour générer ce top.</div>`; 
  }

  const dist = { '50':0, '45':0, '40':0, '35':0, '30':0, '25':0, '20':0, '15':0, '10':0, '05':0 };
  history.forEach(item => {
    const stars = Math.round((parseFloat(item.score) / 2) * 2) / 2;
    const key   = Math.round(stars * 10).toString().padStart(2,'0');
    if (dist[key] !== undefined) dist[key]++;
  });
  buildHistogram(dist);
}

function buildHistogram(dist) {
  const container = document.getElementById('histogram');
  container.innerHTML = '';
  const order = [50, 45, 40, 35, 30, 25, 20, 15, 10, '05'];
  const labels = {
    50: '★★★★★', 45: '★★★★½', 40: '★★★★', 35: '★★★½', 30: '★★★',
    25: '★★½',   20: '★★',    15: '★½',    10: '★',    '05': '½'
  };
  const maxVal = Math.max(...Object.values(dist), 1);
  order.forEach(key => {
    const count   = dist[key] || 0;
    const pct     = (count / maxVal) * 100;
    const row     = document.createElement('div');
    const isActive = activeScoreFilter === String(key);
    row.className = 'histo-row' + (isActive ? ' active' : '');
    row.title = count > 0 ? `Filtrer par ${labels[key]}` : '';
    row.innerHTML = `
      <span class="histo-label">${labels[key]}</span>
      <div class="histo-track"><div class="histo-bar" style="width:${pct}%"></div></div>
      <span class="histo-count">${count}</span>`;
    if (count > 0) {
      row.addEventListener('click', () => {
        if (activeScoreFilter === String(key)) {
          activeScoreFilter = null;
        } else {
          activeScoreFilter = String(key);
          activeGenre = null; 
        }
        renderAll();
        document.querySelector('.history-scroller')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    container.appendChild(row);
  });
}

function renderAll() {
  renderStats();
  renderHistory();
}

// ═══════════════════════════════════════════
//  SORT FILTERS
// ═══════════════════════════════════════════
document.getElementById('filter-row').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  sortOrder = btn.dataset.sort;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistory();
});

// ═══════════════════════════════════════════
//  EXPORT / IMPORT
// ═══════════════════════════════════════════
document.getElementById('export-btn').addEventListener('click', () => {
  const history = loadHistory();
  if (!history.length) { showToast('Aucun film à exporter.'); return; }
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ludex-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast(`${history.length} film${history.length > 1 ? 's' : ''} exporté${history.length > 1 ? 's' : ''}`);
});

document.getElementById('import-trigger').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error('Format invalide');
      openModal(
        "Importer l'historique",
        `Importer ${data.length} film${data.length > 1 ? 's' : ''} ? Cela fusionnera avec votre historique actuel (les doublons seront ignorés).`,
        () => {
          const existing = loadHistory();
          const existingKeys = new Set(existing.map(h => (h.title + '|' + (h.year||'')).toLowerCase()));
          const toAdd = data.filter(d => !existingKeys.has((d.title + '|' + (d.year||'')).toLowerCase()));
          const merged = [...toAdd, ...existing];
          saveHistory(merged);
          renderAll();
          showToast(`${toAdd.length} film${toAdd.length > 1 ? 's' : ''} importé${toAdd.length > 1 ? 's' : ''}`);
        }
      );
    } catch {
      showToast('Fichier JSON invalide.');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

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

async function renderRecommendations() {
  const container = document.getElementById('carousel-container');
  const card = document.getElementById('recommendations-card');
  if (!container || !card) return;

  const history = loadHistory();
  const watchlist = loadWatchlist();

  // 1. On cherche les films bien notés (>= 8.0)
  const topFilms = history.filter(h => parseFloat(h.score) >= 8.0);
  
  if (topFilms.length === 0) {
    card.style.display = 'none';
    return;
  }

  // Affiche la carte avec un état de chargement
  card.style.display = 'block';
  container.innerHTML = '<span class="wl-provider-loading" style="padding: 10px;">⏳ Recherche de suggestions basées sur vos goûts...</span>';

  // 2. On sélectionne jusqu'à 3 films aléatoires du top pour varier les plaisirs
  const shuffledTop = [...topFilms].sort(() => 0.5 - Math.random()).slice(0, 3);
  let allRecommendations = [];
  
  // Ensembles pour éviter de suggérer des films déjà vus ou déjà dans la watchlist
  const seenIds = new Set(history.map(h => String(h.tmdbId)).filter(Boolean));
  const watchlistIds = new Set(watchlist.map(w => String(w.tmdbId)).filter(Boolean));

  for (const film of shuffledTop) {
    if (!film.tmdbId) continue;
    try {
      const res = await fetch(`/api/search?id=${film.tmdbId}&recommendations=true`);
      const data = await res.json();
      
      // Sécurité : TMDb renvoie parfois les films directement dans un tableau, parfois dans data.results
      const moviesArray = data.results || (Array.isArray(data) ? data : null);
      
      if (moviesArray && moviesArray.length > 0) {
        allRecommendations.push(...moviesArray);
      }
    } catch (e) {
      console.warn("Impossible de charger les suggestions pour l'ID " + film.tmdbId, e);
    }
  }

  // 3. Filtrage des doublons et des films déjà connus
  const uniqueRecs = [];
  const addedIds = new Set();

  allRecommendations.forEach(m => {
    if (!m || !m.id) return;
    const idStr = String(m.id);
    if (!addedIds.has(idStr) && !seenIds.has(idStr) && !watchlistIds.has(idStr)) {
      addedIds.add(idStr);
      uniqueRecs.push(m);
    }
  });

  // 4. Rendu visuel
  if (uniqueRecs.length === 0) {
    card.style.display = 'none';
    return;
  }

  container.innerHTML = '';

  uniqueRecs.slice(0, 10).forEach(m => {
    const year = m.release_date?.slice(0, 4) || '????';
    const item = document.createElement('div');
    item.className = 'carousel-item';
    item.title = `${m.title} (${year})`;

    const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : '';
    item.innerHTML = posterUrl 
      ? `<img class="carousel-poster" src="${posterUrl}" loading="lazy">`
      : `<div class="carousel-poster" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--text);">🎬</div>`;

    // Clic : ajoute à la watchlist et rafraîchit le carrousel
    item.addEventListener('click', () => {
      addToWatchlistFromTMDb(m, year);
      setTimeout(renderRecommendations, 300);
    });
    container.appendChild(item);
  });
}

function renderWatchlist() {
  renderRecommendations(); // Met à jour dynamiquement les suggestions
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
      ? `<div class="wl-poster"><img src="${item.poster}" loading="lazy" onerror="this.parentElement.textContent='🎬'"></div>`
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
        html += `<img class="wl-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" loading="lazy">`;
      });
    }

    const rent = providerRoot.rent || [];
    const rentOnly = rent.filter(r => !flat.find(f => f.provider_id === r.provider_id));
    if (rentOnly.length > 0) {
      html += `<span class="wl-provider-tag rent">Location</span>`;
      rentOnly.slice(0, 4).forEach(p => {
        html += `<img class="wl-provider-logo" src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}" loading="lazy">`;
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
            ? `<img class="wl-suggest-poster" src="https://image.tmdb.org/t/p/w92${m.poster_path}" loading="lazy">`
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

// ═══════════════════════════════════════════
//  MODAL DE CONFIRMATION
// ═══════════════════════════════════════════
function openModal(title, body, onConfirm, danger = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = body;
  const confirmBtn = document.getElementById('modal-confirm');
  confirmBtn.className = 'modal-btn ' + (danger ? 'danger' : 'primary');
  confirmBtn.textContent = danger ? 'Supprimer' : 'Confirmer';
  pendingAction = onConfirm;
  document.getElementById('modal').classList.add('open');
}

document.getElementById('modal-confirm').addEventListener('click', () => {
  if (pendingAction) { pendingAction(); pendingAction = null; }
  document.getElementById('modal').classList.remove('open');
});
document.getElementById('modal-cancel').addEventListener('click', () => {
  pendingAction = null;
  document.getElementById('modal').classList.remove('open');
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.classList.remove('open');
      if (modal.id === 'modal') pendingAction = null;
    }
  });
});

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
updateWeightBadges();
calculateScore();
updateAllSliders();

// ═══════════════════════════════════════════
//  SYNCHRONISATION CLOUD (Supabase, via /api/sync)
// ═══════════════════════════════════════════
//
// Principe : un "code de synchronisation" choisi par l'utilisateur (pas de vrai
// compte) identifie ses données côté serveur. Le même code utilisé sur un autre
// appareil permet de récupérer historique + watchlist + réglages.
//
// FUSION (et non écrasement) : à chaque synchronisation (push ou pull), les
// données locales et celles du cloud sont FUSIONNÉES plutôt que remplacées :
// - Historique : par titre. Si un film a été noté sur les deux appareils, on
//   garde la version la plus récente (`updatedAt`). Si un film n'existe que
//   d'un côté, il est conservé (union).
// - Watchlist : par tmdbId (ou titre si pas d'id). Union des deux listes.
// - Suppressions : chaque suppression (historique ou watchlist) laisse une
//   "tombstone" (trace horodatée) synchronisée elle aussi, pour qu'une entrée
//   supprimée sur un appareil ne réapparaisse pas après une synchro depuis un
//   autre appareil qui l'avait encore.
//
// - Sauvegarde (push) : fusionne avec le cloud puis pousse le résultat, en
//   automatique en arrière-plan toutes les 45s si un changement local est
//   détecté, + un bouton manuel pour forcer.
// - Restauration (pull) : fusionne le cloud dans les données locales. N'écrase
//   plus rien de destructeur (grâce à la fusion), donc pas besoin de modale de
//   confirmation bloquante.

const SYNC_CODE_KEY = 'lbx_sync_code';
const SYNC_LAST_HASH_KEY = 'lbx_sync_last_hash';
const SYNC_LAST_TIME_KEY = 'lbx_sync_last_time';
const HISTORY_TOMBSTONES_KEY = 'lbx_history_tombstones';
const WATCHLIST_TOMBSTONES_KEY = 'lbx_watchlist_tombstones';
const TOMBSTONE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours

const syncCodeInput = document.getElementById('setting-sync-code');
const syncSaveBtn = document.getElementById('sync-save-btn');
const syncRestoreBtn = document.getElementById('sync-restore-btn');
const syncStatusEl = document.getElementById('sync-status');

function getSyncCode() {
  return (localStorage.getItem(SYNC_CODE_KEY) || '').trim();
}

function setSyncCode(code) {
  localStorage.setItem(SYNC_CODE_KEY, code.trim());
}

function setSyncStatus(msg, isError = false) {
  syncStatusEl.textContent = msg;
  syncStatusEl.style.color = isError ? '#ff4040' : 'var(--text-mid)';
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── Tombstones (traces de suppression) ─────────────────────────────────────

function loadTombstones(storageKey) {
  try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch { return []; }
}

function saveTombstones(storageKey, list) {
  localStorage.setItem(storageKey, JSON.stringify(list));
}

function recordTombstone(storageKey, key) {
  const list = loadTombstones(storageKey);
  const now = new Date().toISOString();
  const idx = list.findIndex(t => t.key === key);
  if (idx >= 0) list[idx].deletedAt = now;
  else list.push({ key, deletedAt: now });
  saveTombstones(storageKey, list);
}

function removeTombstone(storageKey, key) {
  saveTombstones(storageKey, loadTombstones(storageKey).filter(t => t.key !== key));
}

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

// ─── Clés d'identité pour la fusion ──────────────────────────────────────────

function historyItemKey(item) {
  return (item.title || '').toLowerCase();
}

function watchlistItemKey(item) {
  return item.tmdbId ? `id:${item.tmdbId}` : `title:${(item.title || '').toLowerCase()}`;
}

// ─── Fusion historique ───────────────────────────────────────────────────────

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

// ─── Fusion watchlist ────────────────────────────────────────────────────────

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

// ─── Cœur de la synchro : fusionne l'état local avec un payload cloud ───────
// Sauvegarde le résultat en local (render inclus) et le retourne, prêt à être
// ré-uploadé si besoin (c'est ce que fait pushToCloud).
function mergeWithRemote(remotePayload) {
  const localHistory = loadHistory();
  const localWatchlist = loadWatchlist();
  const localHistTomb = loadTombstones(HISTORY_TOMBSTONES_KEY);
  const localWlTomb = loadTombstones(WATCHLIST_TOMBSTONES_KEY);

  const remoteHistory = Array.isArray(remotePayload?.history) ? remotePayload.history : [];
  const remoteWatchlist = Array.isArray(remotePayload?.watchlist) ? remotePayload.watchlist : [];
  const remoteHistTomb = Array.isArray(remotePayload?.historyTombstones) ? remotePayload.historyTombstones : [];
  const remoteWlTomb = Array.isArray(remotePayload?.watchlistTombstones) ? remotePayload.watchlistTombstones : [];

  const mergedHistTomb = mergeTombstoneLists(localHistTomb, remoteHistTomb);
  const mergedWlTomb = mergeTombstoneLists(localWlTomb, remoteWlTomb);
  const mergedHistory = mergeHistory(localHistory, remoteHistory, mergedHistTomb);
  const mergedWatchlist = mergeWatchlist(localWatchlist, remoteWatchlist, mergedWlTomb);

  saveHistory(mergedHistory);
  saveWatchlist(mergedWatchlist);
  saveTombstones(HISTORY_TOMBSTONES_KEY, mergedHistTomb);
  saveTombstones(WATCHLIST_TOMBSTONES_KEY, mergedWlTomb);

  // Réglages : pas vraiment "fusionnables" (un thème ou une préférence n'est pas
  // un tableau), on garde ceux du cloud seulement s'ils sont fournis et qu'on
  // n'en a pas localement, pour ne pas écraser un choix local sans raison.
  const localSettings = JSON.parse(localStorage.getItem('lbx_settings') || 'null');
  const settings = localSettings || remotePayload?.settings || null;
  if (remotePayload?.settings && !localSettings) {
    localStorage.setItem('lbx_settings', JSON.stringify(remotePayload.settings));
  }
  applySettings(settings || {});

  renderAll();
  renderWatchlist();

  return {
    history: mergedHistory,
    watchlist: mergedWatchlist,
    historyTombstones: mergedHistTomb,
    watchlistTombstones: mergedWlTomb,
    settings,
  };
}

// Hash simple (non cryptographique), juste pour détecter un changement de contenu
// sans avoir à ré-uploader à chaque tick si rien n'a bougé localement.
function hashPayload(payload) {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function currentLocalSnapshot() {
  return {
    history: loadHistory(),
    watchlist: loadWatchlist(),
    historyTombstones: loadTombstones(HISTORY_TOMBSTONES_KEY),
    watchlistTombstones: loadTombstones(WATCHLIST_TOMBSTONES_KEY),
  };
}

async function fetchCloudPayload(code) {
  const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'bad status');
  return data.found ? data.payload : null;
}

// Sauvegarde : récupère le cloud, fusionne avec le local, sauvegarde le résultat
// localement, puis pousse la version fusionnée vers le cloud.
async function pushToCloud(silent = false) {
  const code = getSyncCode();
  if (!code) {
    if (!silent) setSyncStatus('Renseigne un code de synchronisation avant de sauvegarder.', true);
    return false;
  }
  if (!silent) setSyncStatus('Synchronisation en cours…');
  try {
    const remotePayload = await fetchCloudPayload(code);
    const merged = mergeWithRemote(remotePayload);

    const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    if (!res.ok) throw new Error('bad status');

    const now = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_HASH_KEY, hashPayload(currentLocalSnapshot()));
    localStorage.setItem(SYNC_LAST_TIME_KEY, now);
    if (!silent) setSyncStatus(`Synchronisé ✓ (${formatDateTime(now)})`);
    return true;
  } catch {
    if (!silent) setSyncStatus('Échec de la synchronisation. Vérifie ta connexion.', true);
    return false;
  }
}

// Restauration : fusionne le cloud dans le local, SANS repousser vers le cloud.
// Non destructeur grâce à la fusion (un film local non encore synchronisé n'est
// jamais perdu), donc pas besoin de modale de confirmation bloquante.
async function pullFromCloud() {
  const code = getSyncCode();
  if (!code) {
    setSyncStatus('Renseigne un code de synchronisation avant de restaurer.', true);
    return;
  }
  setSyncStatus('Récupération depuis le cloud…');
  try {
    const remotePayload = await fetchCloudPayload(code);
    if (!remotePayload) {
      setSyncStatus('Aucune sauvegarde trouvée pour ce code.', true);
      return;
    }
    mergeWithRemote(remotePayload);
    const now = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_HASH_KEY, hashPayload(currentLocalSnapshot()));
    localStorage.setItem(SYNC_LAST_TIME_KEY, now);
    setSyncStatus(`Synchronisé depuis le cloud ✓ (${formatDateTime(now)})`);
    showToast('Données synchronisées depuis le cloud.');
  } catch {
    setSyncStatus('Échec de la récupération cloud. Vérifie ta connexion.', true);
  }
}

// Pré-remplit le champ code + affiche le statut à chaque ouverture de la modale réglages
document.getElementById('settings-btn').addEventListener('click', () => {
  syncCodeInput.value = getSyncCode();
  const lastTime = localStorage.getItem(SYNC_LAST_TIME_KEY);
  setSyncStatus(lastTime ? `Dernière synchronisation : ${formatDateTime(lastTime)}` : '');
});

syncCodeInput.addEventListener('change', () => setSyncCode(syncCodeInput.value));

syncSaveBtn.addEventListener('click', () => {
  setSyncCode(syncCodeInput.value);
  pushToCloud(false);
});

syncRestoreBtn.addEventListener('click', () => {
  setSyncCode(syncCodeInput.value);
  pullFromCloud();
});

// Auto-synchronisation silencieuse : toutes les 45s, si un code est renseigné et
// que les données locales ont changé depuis la dernière synchro, on fusionne et
// on pousse vers le cloud. Pas besoin d'y penser après chaque note ou ajout à
// la watchlist — et comme c'est une fusion, ça ne perd jamais rien.
setInterval(() => {
  const code = getSyncCode();
  if (!code) return;
  const currentHash = hashPayload(currentLocalSnapshot());
  if (currentHash !== localStorage.getItem(SYNC_LAST_HASH_KEY)) {
    pushToCloud(true);
  }
}, 45000);
