// ═══════════════════════════════════════════
//  FONCTIONNALITÉS ACTIVABLES/DÉSACTIVABLES
// ═══════════════════════════════════════════
// Purement de l'affichage : désactiver une fonctionnalité masque sa section,
// mais ne touche JAMAIS aux données sous-jacentes (le classement de duels
// existant reste intact si on coupe les Duels, par exemple — la case à
// cocher "Réinitialiser les duels" dans Réglages est une action séparée et
// explicite pour ça).

const FEATURES_KEY = 'lbx_features';
const FEATURE_DEFAULTS = { duels: true, quiz: true, trending: true, discoverRecs: true };

function loadFeatureFlags() {
  try {
    const stored = JSON.parse(localStorage.getItem(FEATURES_KEY)) || {};
    return { ...FEATURE_DEFAULTS, ...stored }; // les clés absentes retombent sur "activé"
  } catch {
    return { ...FEATURE_DEFAULTS };
  }
}

function saveFeatureFlags(flags) {
  localStorage.setItem(FEATURES_KEY, JSON.stringify(flags));
}

// Applique l'état actuel des bascules à l'interface : masque/affiche chaque
// section concernée. Appelé au chargement ET à chaque changement dans
// Réglages — jamais besoin de recharger la page pour qu'un changement prenne effet.
//
// IMPORTANT : cette fonction ne fait QUE montrer/cacher des conteneurs déjà
// en place, elle ne déclenche JAMAIS elle-même un chargement de contenu
// (renderDailyDuel/loadDailyQuiz/loadTrendingCarousel restent uniquement
// déclenchés par la navigation vers Découvrir, voir 01-navigation.js). Les
// appeler ici, sans condition d'onglet, créait des éléments .duel-side
// cachés (le Duel du jour se rendait même en restant sur Profil) qui
// entraient en collision avec le même sélecteur utilisé ailleurs.
function applyFeatureFlags() {
  const flags = loadFeatureFlags();

  const duelsCard = document.getElementById('duels-card');
  if (duelsCard) duelsCard.style.display = flags.duels ? '' : 'none';
  const dailyDuelWrap = document.getElementById('daily-duel-wrap');
  if (dailyDuelWrap && !flags.duels) dailyDuelWrap.style.display = 'none';

  const quizWrap = document.getElementById('quiz-wrap');
  if (quizWrap && !flags.quiz) quizWrap.style.display = 'none';

  const trendingWrap = document.getElementById('trending-carousel-wrap');
  if (trendingWrap && !flags.trending) trendingWrap.style.display = 'none';

  const discoverTinder = document.querySelector('.discover-section-tinder');
  if (discoverTinder) discoverTinder.style.display = flags.discoverRecs ? '' : 'none';
}

// Recharge le contenu d'UNE fonctionnalité qu'on vient de réactiver depuis
// Réglages — action explicite déclenchée par le changement de bascule
// uniquement, jamais au chargement de page (voir le commentaire ci-dessus).
function reloadReenabledFeature(key) {
  if (key === 'duels' && typeof renderDailyDuel === 'function') renderDailyDuel();
  if (key === 'quiz' && typeof loadDailyQuiz === 'function') loadDailyQuiz();
  if (key === 'trending' && typeof loadTrendingCarousel === 'function') loadTrendingCarousel();
  // discoverRecs : la pile existante réapparaît simplement avec applyFeatureFlags
  // (son contenu n'a jamais été détruit, juste masqué) — rien à recharger.
}

// Réglages : lit l'état actuel à l'ouverture, sauvegarde à chaque bascule.
function initFeatureToggleUI() {
  const map = {
    'setting-feature-duels': 'duels',
    'setting-feature-quiz': 'quiz',
    'setting-feature-trending': 'trending',
    'setting-feature-discover-recs': 'discoverRecs',
  };
  const flags = loadFeatureFlags();
  for (const [id, key] of Object.entries(map)) {
    const input = document.getElementById(id);
    if (!input) continue;
    input.checked = flags[key];
    input.addEventListener('change', () => {
      const current = loadFeatureFlags();
      const wasOff = !current[key];
      current[key] = input.checked;
      saveFeatureFlags(current);
      applyFeatureFlags();
      // Rechargement du contenu UNIQUEMENT si on vient de réactiver une
      // fonctionnalité ET que Découvrir est l'onglet réellement affiché —
      // sinon on créerait le même problème qu'au chargement de page (contenu
      // rendu alors qu'un autre onglet est actif).
      const discoverView = document.getElementById('view-discover');
      const discoverActive = discoverView && discoverView.classList.contains('active');
      if (wasOff && input.checked && discoverActive) reloadReenabledFeature(key);
    });
  }
}
document.addEventListener('DOMContentLoaded', initFeatureToggleUI);

// Application initiale : différée comme le reste du premier rendu (voir le
// commentaire sur setTimeout(...,0) dans 03-foundation.js — évite tout accès
// à une fonction/constante d'un fichier pas encore exécuté).
setTimeout(applyFeatureFlags, 0);
