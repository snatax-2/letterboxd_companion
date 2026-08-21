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

// Construit une URL d'affiche/photo TMDb à partir d'un chemin brut — évite
// de répéter "https://image.tmdb.org/t/p/..." à la main à chaque appelant
// (un audit en a compté ~33 occurrences dispersées). Retourne une chaîne
// vide si path est absent, pour que les appelants gardent leur `? :` habituel
// sans avoir à vérifier deux fois.
// Ludex 2.0 : la composition "entrée vedette + liste groupée par mois +
// grille d'affiches watchlist" est spécifique au thème par défaut (voir
// "Vers Ludex 2.0" §01 — les 6 autres thèmes gardent leur composition
// d'origine). Un seul point de vérité, partagé par l'historique, la
// watchlist et l'écran Noter.
function isDefaultComposition() {
  const t = document.documentElement.dataset.theme;
  return !t || t === 'default';
}

function tmdbImage(path, size = 'w185') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : '';
}

// État vide unifié — soit compact (juste un texte, pour une section déjà
// titrée comme "Top Réalisateurs" ou "Distribution des notes"), soit
// complet (icône + message + CTA optionnel, pour un écran autonome comme
// Historique/À voir vides). Les états déjà riches et fonctionnels ne sont
// pas retouchés par cette fonction — elle sert à ne plus avoir à
// réinventer le motif à la main à chaque nouvel endroit qui en a besoin.
function renderEmptyState({ icon = null, message, ctaLabel = null, ctaId = null } = {}) {
  const iconHtml = icon ? `<div class="empty-state-icon">${icon}</div>` : '';
  const ctaHtml = ctaLabel ? `<button type="button" class="empty-state-cta"${ctaId ? ` id="${ctaId}"` : ''}>${escAttr(ctaLabel)}</button>` : '';
  const cls = icon || ctaLabel ? 'empty-state' : 'empty-state empty-state-compact';
  return `<div class="${cls}">${iconHtml}${escAttr(message)}${ctaHtml}</div>`;
}

// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let isLiked     = false;
let currentMode = 'detail'; 
let quickRating = 2.5;      
let sortOrder   = 'date';
// Bascule Film/Série (module Séries) : déclarée ici plutôt que dans
// 18-tv-shows.js (son fichier "naturel", chargé en dernier) car
// calculateScore() (05-rating-form.js) la lit, et calculateScore() est
// appelée dès l'initialisation par 09-modal-init.js — AVANT que
// 18-tv-shows.js n'ait eu la chance d'exécuter sa propre déclaration.
// Contrairement aux fonctions (hissées entièrement), un "let" reste
// inaccessible tant que sa ligne n'a pas été atteinte : la même variable
// déclarée dans le fichier 18 provoquait "Cannot access before
// initialization" au chargement — trouvé en testant le flux complet de
// notation de saison, pas visible sur des tests plus étroits.
let currentMediaType = 'movie';
// Bascule Films/Séries dans l'Historique — déclarée ici pour la même
// raison que currentMediaType juste au-dessus (voir ce commentaire).
let historyMediaFilter = 'movie';
let statsMediaFilter = 'movie';
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

// Bascule l'affichage entre deux éléments mutuellement exclusifs (onglets
// Films/Séries, dans Historique/Statistiques/Noter) avec un léger fondu
// plutôt qu'un changement instantané — motif répété à 3 endroits, d'où
// cette fonction partagée. Reste sobre (juste opacity, pas de mouvement)
// pour rester cohérent avec le reste de l'app, jamais chargée en effets.
function fadeSwitchDisplay(hideEl, showEl) {
  if (!hideEl || !showEl || hideEl === showEl) return;
  hideEl.style.transition = 'opacity var(--dur-fast) var(--ease-out)';
  hideEl.style.opacity = '0';
  setTimeout(() => {
    hideEl.style.display = 'none';
    hideEl.style.removeProperty('opacity');
    hideEl.style.removeProperty('transition');
    showEl.style.display = '';
    showEl.style.opacity = '0';
    requestAnimationFrame(() => {
      showEl.style.transition = 'opacity var(--dur-fast) var(--ease-out)';
      showEl.style.opacity = '1';
      setTimeout(() => {
        showEl.style.removeProperty('opacity');
        showEl.style.removeProperty('transition');
      }, 150);
    });
  }, 140);
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


// ── Lecture fiable des réponses de l'API (voir describeSyncFailure dans
//    10-cloud-sync.js pour le même principe côté synchro cloud) ──
// Sans ça, une vraie erreur serveur (limite de requêtes, panne, mauvaise
// configuration) — qui renvoie un statut non-200 avec un message précis dans
// le corps JSON — était traitée exactement comme "aucun résultat trouvé" :
// aucune erreur n'apparaissait nulle part, la recherche semblait juste vide.
// readApiJson() lève une erreur explicite dans ce cas, pour que le code
// appelant sache qu'il a vraiment échoué (et puisse le dire).
async function readApiJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur de l'API (${res.status})`);
  return data;
}

// Message d'erreur honnête pour un appel API en échec : ne blâme "ta
// connexion" que si c'est vraiment le cas (hors ligne), affiche le message
// précis du serveur s'il y en a un, et reste neutre sinon — jamais un
// "vérifie ta connexion" générique qui peut être complètement à côté.
function describeApiFailure(err) {
  if (!navigator.onLine) return 'Tu es hors ligne.';
  const msg = err && err.message ? err.message : '';
  const isGeneric = !msg || /Failed to fetch|NetworkError/i.test(msg);
  return isGeneric ? 'Service indisponible pour le moment, réessaie dans un instant.' : msg;
}
