// ═══════════════════════════════════════════
//  FONCTIONNALITÉS ACTIVABLES/DÉSACTIVABLES
// ═══════════════════════════════════════════
// Purement de l'affichage : désactiver une fonctionnalité masque sa section,
// mais ne touche JAMAIS aux données sous-jacentes (le classement de duels
// existant reste intact si on coupe les Duels — la case à cocher
// "Réinitialiser les duels" dans Réglages est une action séparée et
// explicite pour ça).
//
// Ludex 2.0 : Découvrir repensé entièrement retire Quiz, Suggestions
// (swipe), Devine le Film du Jour, Ce jour-là, Explorer par thème et le
// raccourci Classiques — ces bascules n'ont donc plus de section à
// masquer/afficher et ont été retirées d'ici. Duels est la seule
// fonctionnalité qui survit, déplacée vers Profil.

const FEATURES_KEY = 'lbx_features';
const FEATURE_DEFAULTS = { duels: true };

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
function applyFeatureFlags() {
  const flags = loadFeatureFlags();
  const duelsCard = document.getElementById('duels-card');
  if (duelsCard) duelsCard.style.display = flags.duels ? '' : 'none';
}

// Recharge le contenu d'UNE fonctionnalité qu'on vient de réactiver depuis
// Réglages — action explicite déclenchée par le changement de bascule
// uniquement, jamais au chargement de page.
function reloadReenabledFeature(key) {
  if (key === 'duels' && typeof renderDuelsSection === 'function') renderDuelsSection();
}

// Réglages : lit l'état actuel à l'ouverture, sauvegarde à chaque bascule.
function initFeatureToggleUI() {
  const map = {
    'setting-feature-duels': 'duels',
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
      // fonctionnalité ET que Profil est l'onglet réellement affiché.
      const profileView = document.getElementById('view-profile');
      const profileActive = profileView && profileView.classList.contains('active');
      if (wasOff && input.checked && profileActive) reloadReenabledFeature(key);
    });
  }
}
document.addEventListener('DOMContentLoaded', initFeatureToggleUI);

// Application initiale : différée comme le reste du premier rendu (voir le
// commentaire sur setTimeout(...,0) dans 03-foundation.js — évite tout accès
// à une fonction/constante d'un fichier pas encore exécuté).
setTimeout(applyFeatureFlags, 0);
