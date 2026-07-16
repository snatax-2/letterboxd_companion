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
const CRITERIA = ['scenario','realisation','photo','acteurs','ambiance','rythme','affect'];


// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function buildStripMeta({ genre = '', runtime = '', year = '', director = '', actors = '' } = {}) {
  let meta = [genre, runtime, year].filter(Boolean).join(' · ');
  if (director) meta += `<br><span style="color:var(--text-mid);font-size:0.75rem;font-family:var(--font-body)">Réalisé par <b>${director}</b></span>`;
  if (actors)   meta += `<br><span style="color:var(--text-mid);font-size:0.75rem;font-family:var(--font-body)">Avec <b>${actors}</b></span>`;
  return meta;
}

// Échappe une chaîne pour une insertion sûre dans un attribut HTML (alt, aria-label, title...)
// Utilisé pour les titres de films (qui peuvent contenir des guillemets ou des chevrons).
function escAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
    tmdbId: document.getElementById('movie-tmdb-id').value,
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
      document.getElementById('movie-tmdb-id').value = draft.tmdbId || '';
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
        document.getElementById('strip-poster').alt = draft.title ? `Affiche de ${escAttr(draft.title)}` : '';
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
  document.getElementById('heart-btn').setAttribute('aria-pressed', String(isLiked));

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
    renderCriteriaAverageMarkers();

  } catch(e) { console.error("Erreur de chargement du brouillon", e); }
}

// ═══════════════════════════════════════════
//  RETOUR VISUEL "PSEUDO-HAPTIQUE"
// ═══════════════════════════════════════════
// Safari iOS n'implémente l'API Vibration sur AUCUNE version (choix
// délibéré d'Apple, pas un bug) — `navigator.vibrate` y est simplement
// absent, donc tous les `if (navigator.vibrate) navigator.vibrate(...)` de
// l'app s'y taisent silencieusement, sans erreur mais aussi sans aucun
// retour. Cette fonction ajoute un petit à-coup visuel (léger/moyen/fort)
// sur l'élément concerné, en complément de chaque appel à vibrate() — pour
// que la sensation de "clic" reste présente même sans vraie vibration.
function hapticPulse(el, intensity = 'light') {
  if (!el) return;
  const cls = `haptic-pulse-${intensity}`;
  el.classList.remove('haptic-pulse-light', 'haptic-pulse-medium', 'haptic-pulse-strong');
  // requestAnimationFrame (plutôt qu'une lecture forcée de offsetWidth) pour
  // rejouer l'animation : évite un reflow SYNCHRONE à chaque appel. Sur cette
  // fonction en particulier, c'est important — elle est appelée à CHAQUE
  // glissement de slider (potentiellement des dizaines de fois par seconde
  // pendant un geste), et un reflow forcé à cette fréquence-là créait du
  // saccadé pendant l'interaction la plus courante de l'app.
  requestAnimationFrame(() => {
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  });
}

// Différé au tick suivant (setTimeout 0) plutôt qu'appelé immédiatement ici :
// app.js est la concaténation de 16 fichiers exécutés dans l'ordre, et ce
// fichier-ci (03-foundation.js) est encore tôt dans cet ordre. Un appel
// immédiat à renderAll()/loadDraft() peut donc atteindre du code plus tard
// dans le fichier (une const d'un fichier chargé après) qui n'a pas encore
// été exécuté — c'est la cause de plusieurs bugs "Cannot access ... before
// initialization" rencontrés dans ce projet (CRITERIA_SHORT_LABELS,
// CONTEXT_TAG_ICONS, GENRE_BADGE_THRESHOLD, _descCache, DESCS...). En
// repoussant l'appel au tick suivant, TOUT le script (les 16 fichiers) a fini
// de s'exécuter avant que renderAll()/loadDraft() ne démarrent réellement —
// plus aucune const ne peut alors être "pas encore initialisée", quel que
// soit l'ordre des fichiers.
setTimeout(() => {
  renderAll();
  loadDraft();
}, 0);

