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

