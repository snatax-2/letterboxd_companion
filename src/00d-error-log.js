// ═══════════════════════════════════════════
//  JOURNAL D'ERREURS (filet de sécurité)
// ═══════════════════════════════════════════
// Jusqu'ici, une erreur JS imprévue (chemin de code non couvert par les
// tests, bug d'un futur changement...) échouait silencieusement : écran figé
// ou partiellement cassé, et RIEN n'était jamais visible nulle part — ni pour
// l'utilisateur, ni pour un développeur qui voudrait corriger ensuite.
//
// Ce module ne fait QUE deux choses, volontairement peu ambitieuses :
// 1. Journaliser localement les erreurs (petit tampon circulaire, jamais les
//    données de films — uniquement des messages techniques et une pile
//    d'appels), consultable/exportable depuis Réglages.
// 2. Prévenir une fois, discrètement (pas de rechargement automatique, pas de
//    tentative de "réparation" — trop risqué, pourrait perdre des données non
//    sauvegardées ; la personne reste maître de ce qu'elle fait ensuite).
//
// Ce N'EST PAS un système de télémétrie : rien ne quitte l'appareil tant que
// l'utilisateur ne choisit pas explicitement de copier/partager le journal.

const ERROR_LOG_KEY = 'lbx_error_log';
const ERROR_LOG_MAX = 20; // tampon circulaire : les plus anciennes sortent

function loadErrorLog() {
  try { return JSON.parse(localStorage.getItem(ERROR_LOG_KEY)) || []; }
  catch { return []; }
}

function logClientError(entry) {
  try {
    const log = loadErrorLog();
    log.push({ ...entry, at: new Date().toISOString() });
    while (log.length > ERROR_LOG_MAX) log.shift();
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(log));
  } catch {
    // localStorage plein/inaccessible : on abandonne la journalisation plutôt
    // que de risquer une boucle (une erreur DANS le gestionnaire d'erreurs
    // serait le pire des scénarios).
  }
  notifyOnce();
}

// Un seul avertissement par session, même si plusieurs erreurs surviennent en
// cascade (une erreur en entraîne souvent d'autres) — jamais un flot de toasts.
let notified = false;
function notifyOnce() {
  if (notified) return;
  notified = true;
  // Différé : si l'erreur survient tout au début du chargement, showToast /
  // le DOM du toast peuvent ne pas encore être prêts.
  setTimeout(() => {
    try {
      if (typeof showToast === 'function') {
        showToast("Un problème technique est survenu. Tes données sont saines — voir Réglages pour le signaler.");
      }
      const section = document.getElementById('error-log-section');
      if (section) section.style.display = 'block';
    } catch { /* le toast lui-même ne doit jamais faire planter la page */ }
  }, 300);
}

window.addEventListener('error', (e) => {
  logClientError({
    type: 'error',
    message: e.message || String(e.error),
    stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 2000) : '',
    source: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : '',
  });
});

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  logClientError({
    type: 'unhandledrejection',
    message: reason && reason.message ? reason.message : String(reason),
    stack: reason && reason.stack ? String(reason.stack).slice(0, 2000) : '',
    source: '',
  });
});

// Affichage/export depuis Réglages (voir index.html #error-log-section) :
// affiche la section si un journal existe déjà (rouvrir Réglages après coup),
// et copie un résumé texte dans le presse-papiers pour signalement facile.
function initErrorLogUI() {
  const section = document.getElementById('error-log-section');
  const copyBtn = document.getElementById('error-log-copy-btn');
  if (!section || !copyBtn) return;

  if (loadErrorLog().length > 0) section.style.display = 'block';

  copyBtn.addEventListener('click', async () => {
    const log = loadErrorLog();
    const text = log.map(e => `[${e.at}] ${e.type}: ${e.message}${e.source ? ' (' + e.source + ')' : ''}`).join('\n')
      || 'Aucune erreur journalisée.';
    try {
      await navigator.clipboard.writeText(text);
      showToast('Journal copié dans le presse-papiers.');
    } catch {
      showToast('Impossible de copier automatiquement — le journal reste visible dans les données du site.');
    }
  });
}
document.addEventListener('DOMContentLoaded', initErrorLogUI);
