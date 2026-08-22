// ⚠️ FICHIER GÉNÉRÉ AUTOMATIQUEMENT — NE PAS ÉDITER DIRECTEMENT.
// Modifie les fichiers dans src/, puis lance `npm run build`.
// Assemblé depuis : 00-pwa.js, 00a-migrations.js, 00b-icons.js, 00c-poster-color.js, 00d-error-log.js, 00e-feature-flags.js, 00f-curated-lists-data.js, 01-navigation.js, 02-theme.js, 03-foundation.js, 03b-pure-logic.js, 04-search.js, 05-rating-form.js, 06a-history-list.js, 06b-history-actions.js, 06c-profile-stats.js, 06d-profile-share-cards.js, 07-data-io.js, 08-watchlist.js, 09-modal-init.js, 10-cloud-sync.js, 11-discover.js, 12-movie-detail.js, 13-duels.js, 15-curated-lists.js, 17-film-analysis.js, 18-tv-shows.js, 19-tv-detail.js

// ═══════════════════════════════════════════
//  PWA : enregistrement du service worker
// ═══════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Détecte une NOUVELLE version qui vient de s'installer (pas la toute
      // première installation — on ne veut prévenir que d'un vrai changement
      // de contenu par rapport à ce que l'utilisateur a déjà ouvert).
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const banner = document.getElementById('update-banner');
            if (banner) banner.classList.add('show');
          }
        });
      });
    }).catch(() => {
      // Échec silencieux : l'app reste 100% fonctionnelle sans service worker,
      // seul l'usage hors-ligne / l'installation ne sera pas dispo.
    });
  });
}

document.getElementById('update-banner-reload-btn')?.addEventListener('click', () => {
  window.location.reload();
});

// ── Indicateur hors-ligne ──
// L'app fonctionne largement sans réseau (historique, watchlist, duels,
// stats : tout est local) — seuls TMDb et le quiz en dépendent. Un badge
// discret l'indique plutôt que de laisser les recherches échouer sans
// explication. Créé une fois, simplement montré/caché ensuite.
(function initOfflineIndicator() {
  const badge = document.createElement('div');
  badge.id = 'offline-badge';
  badge.className = 'offline-badge';
  badge.setAttribute('role', 'status');
  badge.textContent = 'Hors-ligne — tes données restent disponibles';
  document.body.appendChild(badge);

  function update() {
    badge.classList.toggle('visible', !navigator.onLine);
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
})();

// ═══════════════════════════════════════════
//  MIGRATIONS DE SCHÉMA
// ═══════════════════════════════════════════
// Les données vivent dans localStorage sans serveur pour les faire évoluer :
// quand la FORME d'un item change (nouveau champ obligatoire, renommage...),
// les données déjà en place chez l'utilisateur doivent être mises à niveau au
// chargement, sinon le code qui suppose la nouvelle forme casse.
//
// Principes de sécurité, dans l'ordre d'importance :
// 1. NON DESTRUCTIF EN CAS D'ÉCHEC : si une migration lève une erreur, on
//    s'arrête, on ne sauvegarde rien de partiel, et la version stockée reste
//    celle de la dernière migration réussie — l'app tourne avec les données
//    telles quelles plutôt que de risquer de les corrompre.
// 2. SAUVEGARDE PRÉ-MIGRATION : avant toute chaîne de migrations, une copie de
//    l'historique (la donnée critique) est posée dans une clé dédiée, écrasée
//    à chaque nouvelle chaîne — un filet de dernier recours.
// 3. MIGRATIONS IDEMPOTENTES : chaque étape peut être rejouée sans effet
//    (propriété vérifiée par les tests) — protège contre les doubles exécutions.
//
// Ce fichier est nommé 00a-* pour s'exécuter AVANT tout code qui lit les
// données (concaténation alphabétique du build). Les clés sont en littéraux
// ici (pas STORE_KEY) : les const des fichiers suivants n'existent pas encore
// à cet instant de l'exécution (zone morte temporelle).

(function runSchemaMigrations() {
  const VERSION_KEY = 'lbx_schema_version';
  const HISTORY_KEY = 'lbx_v2'; // = STORE_KEY de 03-foundation.js
  const BACKUP_KEY = 'lbx_pre_migration_backup';

  // Chaque migration : { to: <version cible>, up: () => void }.
  // Elles s'exécutent en séquence depuis la version stockée.
  const MIGRATIONS = [
    {
      to: 2,
      up: () => {
        // v2 : normalise chaque item d'historique (savedAt, values, title
        // garantis) — voir normalizeHistoryItemV2 dans 03b-pure-logic.js.
        // Ce fichier s'exécute avant 03b : la fonction est disponible quand
        // même car les DÉCLARATIONS de fonctions du script concaténé sont
        // hissées avant toute exécution.
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return;
        const history = JSON.parse(raw);
        if (!Array.isArray(history)) return;
        const migrated = history.map(normalizeHistoryItemV2);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(migrated));
      },
    },
  ];

  const CURRENT_VERSION = MIGRATIONS.length > 0 ? MIGRATIONS[MIGRATIONS.length - 1].to : 1;

  let stored;
  try { stored = parseInt(localStorage.getItem(VERSION_KEY), 10); } catch { stored = NaN; }
  if (isNaN(stored)) stored = 1; // données d'avant le versioning = baseline v1

  if (stored >= CURRENT_VERSION) return; // à jour, rien à faire

  // Filet de dernier recours : copie de l'historique avant la chaîne
  try {
    const current = localStorage.getItem(HISTORY_KEY);
    if (current) {
      localStorage.setItem(BACKUP_KEY, JSON.stringify({ fromVersion: stored, at: new Date().toISOString(), history: current }));
    }
  } catch { /* le quota peut refuser la copie : la migration reste tentée */ }

  for (const migration of MIGRATIONS) {
    if (migration.to <= stored) continue;
    try {
      migration.up();
      stored = migration.to;
      localStorage.setItem(VERSION_KEY, String(stored));
    } catch (e) {
      // Échec : on s'arrête là, version inchangée depuis la dernière réussite,
      // données intactes. L'app fonctionne avec l'ancien schéma.
      console.error(`Migration vers v${migration.to} échouée (données intactes) :`, e);
      break;
    }
  }
})();

// ═══════════════════════════════════════════
//  BIBLIOTHÈQUE D'ICÔNES SVG (remplace les emoji de l'interface)
// ═══════════════════════════════════════════
// Icônes en traits fins (style "line icon"), en `currentColor` : elles héritent
// automatiquement la couleur du texte environnant, donc s'adaptent au thème
// actif sans configuration supplémentaire. L'épaisseur du trait elle-même
// est pilotée par la variable CSS --icon-stroke (définie par thème dans
// styles.css), pour que chaque thème garde une identité de trait différente
// (ex: traits plus fins et élégants pour Wes Anderson, plus épais et
// tranchants pour Scuderia) sans dupliquer les SVG eux-mêmes.
//
// Usage : ICONS.trash, ICONS.heart, etc. — chaîne de balisage SVG prête à
// insérer dans un template literal (voir 06-history.js, 08-watchlist.js...).
// Pour le HTML statique (index.html), les mêmes icônes sont recopiées
// directement dans le balisage (pas de dépendance à l'exécution du JS).

const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--icon-stroke, 2)" stroke-linecap="round" stroke-linejoin="round" class="icon"';

const ICONS = {
  settings: `<svg ${ICON_ATTRS}><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2" fill="currentColor" stroke="none"/></svg>`,

  exportIcon: `<svg ${ICON_ATTRS}><path d="M12 3v11"/><path d="M7 8l5-5 5 5"/><path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>`,

  importIcon: `<svg ${ICON_ATTRS}><path d="M12 14V3"/><path d="M7 9l5 5 5-5"/><path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>`,

  plus: `<svg ${ICON_ATTRS}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,

  heart: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,


  search: `<svg ${ICON_ATTRS}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,

  barChart: `<svg ${ICON_ATTRS}><line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="19" y1="20" x2="19" y2="15"/></svg>`,

  target: `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>`,

  flame: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.5-2-1-3 2 1 4 4 4 7a7 7 0 0 1-14 0c0-4 3-6 4-8 .5-1 .5-2 0-3 1 0 2.5 0 3 0z"/></svg>`,
  medal: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M7 2h4l1.5 4L14 2h4l-3.6 7.2a6 6 0 1 1-4.8 0L7 2z" opacity="0.55"/><circle cx="12" cy="15" r="5.4"/><circle cx="12" cy="15" r="3" fill="#fff" opacity="0.28"/></svg>`,

  clapper: `<svg ${ICON_ATTRS}><path d="M3 8l1.5-3h4L7 8"/><path d="M8.5 8l1.5-3h4l-1.5 3"/><path d="M14 8l1.5-3h4l-1.5 3"/><rect x="3" y="8" width="18" height="12" rx="1"/></svg>`,
  lightbulb: `<svg ${ICON_ATTRS}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.05V17h6v-2.25c0-.85.4-1.55 1-2.05A7 7 0 0 0 12 2z"/></svg>`,

  copy: `<svg ${ICON_ATTRS}><rect x="9" y="9" width="11" height="11" rx="1"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>`,

  refresh: `<svg ${ICON_ATTRS}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>`,

  trash: `<svg ${ICON_ATTRS}><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/><line x1="10" y1="11" x2="10" y2="16"/><line x1="14" y1="11" x2="14" y2="16"/></svg>`,

  palette: `<svg ${ICON_ATTRS}><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.3c1.8 0 3.2-1.4 3.2-3.2C21 6.6 17 2 12 2z"/><circle cx="7" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>`,

  cloud: `<svg ${ICON_ATTRS}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,

  moon: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>`,

  edit: `<svg ${ICON_ATTRS}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,

  check: `<svg ${ICON_ATTRS}><polyline points="20 6 9 17 4 12"/></svg>`,

  close: `<svg ${ICON_ATTRS}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

  pause: `<svg ${ICON_ATTRS}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,

  play: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M8 5v14l11-7z"/></svg>`,

  star: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6z"/></svg>`,

  popcorn: `<svg ${ICON_ATTRS}><path d="M6 8h12l-1.4 12.1a1 1 0 0 1-1 .9H8.4a1 1 0 0 1-1-.9L6 8z"/><path d="M9 8v13M12 8v13M15 8v13"/><path d="M5 8a2 2 0 0 1 2-3h10a2 2 0 0 1 2 3"/></svg>`,

  sofa: `<svg ${ICON_ATTRS}><path d="M5 12a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3H5v-3z"/><path d="M4 15v4M20 15v4"/><path d="M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>`,

  // ── Thèmes Découvrir (remplacent les emoji, cohérence avec le reste de
  //    l'app) : voir 00f-curated-lists-data.js pour l'association thème → icône.
  moneyBag: `<svg ${ICON_ATTRS}><path d="M9 6a3 3 0 0 1 6 0"/><path d="M6.5 6h11l1.3 11a2 2 0 0 1-2 2.2H7.2a2 2 0 0 1-2-2.2L6.5 6z"/><line x1="12" y1="10" x2="12" y2="15"/></svg>`,
  timeLoop: `<svg ${ICON_ATTRS}><circle cx="12" cy="13" r="7"/><path d="M12 9v4l3 2"/><path d="M9 2l3 3 3-3"/></svg>`,
  sword: `<svg ${ICON_ATTRS}><line x1="5" y1="19" x2="19" y2="5"/><line x1="14" y1="8" x2="17" y2="11"/><line x1="4" y1="20" x2="6" y2="18"/></svg>`,
  sprout: `<svg ${ICON_ATTRS}><path d="M12 22v-9"/><path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 9c0-3 2-5 6-5 0 3-2 5-6 5z"/></svg>`,
  compass: `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-6 2 2-6z"/></svg>`,
  road: `<svg ${ICON_ATTRS}><path d="M9 3L5 21"/><path d="M15 3l4 18"/><line x1="12" y1="5" x2="12" y2="8"/><line x1="12" y1="11" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="20"/></svg>`,
  hauntedHouse: `<svg ${ICON_ATTRS}><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5a2 2 0 0 1 4 0v5"/><circle cx="9" cy="14" r="0.7" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="0.7" fill="currentColor" stroke="none"/></svg>`,
  skyline: `<svg ${ICON_ATTRS}><rect x="3" y="10" width="4" height="11"/><rect x="9" y="5" width="4" height="16"/><rect x="15" y="13" width="4" height="8"/></svg>`,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ICONS };
}

// ═══════════════════════════════════════════
//  EXTRACTION DE COULEUR DOMINANTE (thème "Moderne")
// ═══════════════════════════════════════════
// Implémentation "maison" légère (pas de librairie externe type Color Thief) :
// charge l'affiche dans une image SÉPARÉE et invisible (jamais la balise <img>
// réellement affichée à l'écran — celle-ci n'est jamais touchée, aucun risque
// pour son affichage normal), l'échantillonne sur un petit canvas hors-écran
// et moyenne les couleurs (en ignorant les pixels quasi blancs/noirs, souvent
// des bordures ou du texte, pour ne pas biaiser la moyenne). Donne à chaque
// carte un accent visuel tiré de sa propre affiche — signature du thème
// "L'Affiche d'Art Moderne". Se dégrade silencieusement (aucune erreur
// visible) en cas de restriction CORS ou toute autre erreur : la carte garde
// alors simplement la couleur d'accent par défaut du thème.
// Cache en mémoire (URL -> couleur, ou null si l'extraction a échoué) : sans
// lui, la MÊME affiche serait ré-analysée (chargement d'image + dessin canvas
// + boucle sur les pixels) à chaque nouveau rendu de la liste — y compris pour
// des films dont l'affiche n'a pas changé, juste parce qu'un AUTRE film de la
// liste a été modifié/supprimé (ce qui redessine tout). Un vrai coût de
// performance répété inutilement, maintenant évité.
const posterAccentCache = new Map();

function extractPosterAccentColorFromUrl(url) {
  if (posterAccentCache.has(url)) return Promise.resolve(posterAccentCache.get(url));
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const size = 24;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, size, size);
          const { data } = ctx.getImageData(0, 0, size, size);

          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (lum < 15 || lum > 245) continue;
            r += data[i]; g += data[i + 1]; b += data[i + 2];
            count++;
          }
          const color = count === 0 ? null : `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
          posterAccentCache.set(url, color);
          resolve(color);
        } catch (e) {
          posterAccentCache.set(url, null); // canvas "tainted" (CORS) : dégradation silencieuse
          resolve(null);
        }
      };
      img.onerror = () => { posterAccentCache.set(url, null); resolve(null); };
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
}

// N'agit que pour le thème "moderne" — ailleurs, l'extraction ne servirait à
// rien et coûterait du temps de traitement pour rien à chaque affiche chargée.
function applyPosterAccent(posterUrl, cardEl) {
  if (!posterUrl || !cardEl || document.documentElement.dataset.theme !== 'moderne') return;
  extractPosterAccentColorFromUrl(posterUrl).then(color => {
    if (color) cardEl.style.setProperty('--poster-accent', color);
  });
}

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

// ═══════════════════════════════════════════
//  LISTES PRÉDÉFINIES — "Tous les temps"
// ═══════════════════════════════════════════
// Compilée à la main à partir du classement Sight & Sound 2022 (revue du
// British Film Institute, sondage de 1 639 critiques — la référence la plus
// citée du milieu critique, publiée tous les 10 ans, prochaine édition en
// 2032). Une liste de titres n'est pas protégée par le droit d'auteur (ce
// sont des faits, pas une création) — seuls titre/année sont repris ici,
// aucun commentaire ni texte de BFI. Pas d'ID TMDb pré-résolu : résolus à la
// demande (voir resolveCuratedFilm dans 15-curated-lists.js) et mis en
// cache localement une fois trouvés, plutôt que 100 appels réseau à chaque
// consultation.
const CURATED_ALL_TIME = [
  { title: 'Jeanne Dielman, 23, quai du Commerce, 1080 Bruxelles', year: 1975 },
  { title: 'Vertigo', year: 1958 },
  { title: 'Citizen Kane', year: 1941 },
  { title: 'Tokyo Story', year: 1953 },
  { title: 'In the Mood for Love', year: 2000 },
  { title: '2001: A Space Odyssey', year: 1968 },
  { title: 'Beau travail', year: 1998 },
  { title: 'Mulholland Drive', year: 2001 },
  { title: 'Man with a Movie Camera', year: 1929 },
  { title: "Singin' in the Rain", year: 1952 },
  { title: 'Sunrise: A Song of Two Humans', year: 1927 },
  { title: 'The Godfather', year: 1972 },
  { title: 'La Règle du jeu', year: 1939 },
  { title: 'Cléo from 5 to 7', year: 1962 },
  { title: 'The Searchers', year: 1956 },
  { title: 'Meshes of the Afternoon', year: 1943 },
  { title: 'Close-up', year: 1990 },
  { title: 'Persona', year: 1966 },
  { title: 'Apocalypse Now', year: 1979 },
  { title: 'Seven Samurai', year: 1954 },
  { title: 'The Passion of Joan of Arc', year: 1927 },
  { title: 'Late Spring', year: 1949 },
  { title: 'Playtime', year: 1967 },
  { title: 'Do the Right Thing', year: 1989 },
  { title: 'Au hasard Balthazar', year: 1966 },
  { title: 'The Night of the Hunter', year: 1955 },
  { title: 'Shoah', year: 1985 },
  { title: 'Daisies', year: 1966 },
  { title: 'Taxi Driver', year: 1976 },
  { title: 'Portrait of a Lady on Fire', year: 2019 },
  { title: 'Psycho', year: 1960 },
  { title: 'Mirror', year: 1975 },
  { title: '8½', year: 1963 },
  { title: "L'Atalante", year: 1934 },
  { title: 'Pather Panchali', year: 1955 },
  { title: 'M', year: 1931 },
  { title: 'City Lights', year: 1931 },
  { title: 'Rear Window', year: 1954 },
  { title: 'À bout de souffle', year: 1960 },
  { title: 'Some Like It Hot', year: 1959 },
  { title: 'Rashomon', year: 1950 },
  { title: 'Bicycle Thieves', year: 1948 },
  { title: 'Stalker', year: 1979 },
  { title: 'Killer of Sheep', year: 1977 },
  { title: 'Barry Lyndon', year: 1975 },
  { title: 'North by Northwest', year: 1959 },
  { title: 'The Battle of Algiers', year: 1966 },
  { title: 'Ordet', year: 1955 },
  { title: 'Wanda', year: 1970 },
  { title: 'The Piano', year: 1992 },
  { title: 'The 400 Blows', year: 1959 },
  { title: 'News from Home', year: 1976 },
  { title: 'Fear Eats the Soul', year: 1974 },
  { title: 'The Apartment', year: 1960 },
  { title: 'Sherlock Jr.', year: 1924 },
  { title: 'Le Mépris', year: 1963 },
  { title: 'Battleship Potemkin', year: 1925 },
  { title: 'Blade Runner', year: 1982 },
  { title: 'Sans soleil', year: 1983 },
  { title: 'Daughters of the Dust', year: 1991 },
  { title: 'La dolce vita', year: 1960 },
  { title: 'Moonlight', year: 2016 },
  { title: 'The Third Man', year: 1949 },
  { title: 'GoodFellas', year: 1990 },
  { title: 'Casablanca', year: 1942 },
  { title: 'Touki Bouki', year: 1973 },
  { title: 'The Red Shoes', year: 1948 },
  { title: 'Metropolis', year: 1927 },
  { title: 'Andrei Rublev', year: 1966 },
  { title: 'La Jetée', year: 1962 },
  { title: 'The Gleaners and I', year: 2000 },
  { title: "L'avventura", year: 1960 },
  { title: 'Journey to Italy', year: 1954 },
  { title: 'My Neighbour Totoro', year: 1988 },
  { title: 'Spirited Away', year: 2001 },
  { title: 'Sansho the Bailiff', year: 1954 },
  { title: 'Imitation of Life', year: 1959 },
  { title: 'Histoire(s) du cinéma', year: 1988 },
  { title: 'A Matter of Life and Death', year: 1946 },
  { title: 'Modern Times', year: 1936 },
  { title: 'Sunset Boulevard', year: 1950 },
  { title: 'Céline and Julie Go Boating', year: 1974 },
  { title: 'A Brighter Summer Day', year: 1991 },
  { title: 'Sátántangó', year: 1994 },
  { title: 'Blue Velvet', year: 1986 },
  { title: 'The Spirit of the Beehive', year: 1973 },
  { title: 'Pierrot le fou', year: 1965 },
  { title: 'The Shining', year: 1980 },
  { title: 'Chungking Express', year: 1994 },
  { title: 'Yi Yi', year: 2000 },
  { title: 'Ugetsu', year: 1953 },
  { title: 'The Leopard', year: 1963 },
  { title: 'Madame de...', year: 1953 },
  { title: 'Parasite', year: 2019 },
  { title: 'Once Upon a Time in the West', year: 1968 },
  { title: 'A Man Escaped', year: 1956 },
  { title: 'The General', year: 1926 },
  { title: 'Black Girl', year: 1966 },
  { title: 'Tropical Malady', year: 2004 },
  { title: 'Get Out', year: 2017 },
];

// Studios/maisons de production à identité créative forte et catalogue
// resserré (pas les grands studios généralistes type Universal/Warner, qui
// ont des milliers de films sans vraie identité de "collection à
// compléter"). Identifiants TMDb vérifiés un par un (une erreur ici
// casserait silencieusement la fonctionnalité) :
// A24 themoviedb.org/company/41077-a24, Studio Ghibli .../company/10342,
// Pixar .../company/3-pixar, Blumhouse .../company/3172-blumhouse-productions,
// Marvel Studios .../company/420-marvel-studios.
const CURATED_STUDIOS = [
  { id: 41077, name: 'A24', sub: 'Cinéma indépendant et arthouse' },
  { id: 10342, name: 'Studio Ghibli', sub: 'Animation japonaise' },
  { id: 3, name: 'Pixar', sub: 'Animation 3D' },
  { id: 3172, name: 'Blumhouse', sub: 'Horreur à petit budget' },
  { id: 420, name: 'Marvel Studios', sub: 'Univers cinématographique Marvel' },
];

// Carte du monde du cinéma — sélection restreinte de pays à forte identité
// cinématographique (pas les ~195 pays du monde, dont la plupart n'auraient
// pas grand-chose à montrer avec un vrai filtre TMDb). Codes ISO 3166-1
// pour with_origin_country. `top`/`left` en pourcentage : position
// APPROXIMATIVE sur une carte stylisée (pas de vraies frontières
// géographiques précises — voir la discussion sur l'ergonomie tactile),
// juste assez pour suggérer la bonne région du monde.
const CURATED_COUNTRIES = [
  { code: 'JP', name: 'Japon', flag: '🇯🇵' },
  { code: 'KR', name: 'Corée du Sud', flag: '🇰🇷' },
  { code: 'DK', name: 'Danemark', flag: '🇩🇰' },
  { code: 'IT', name: 'Italie', flag: '🇮🇹' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'IN', name: 'Inde', flag: '🇮🇳' },
  { code: 'MX', name: 'Mexique', flag: '🇲🇽' },
];

// Exploration par thème (Découvrir) — mots-clés TMDb, indépendants des
// genres classiques (un genre dit "c'est un thriller", un mot-clé dit
// "c'est un film de braquage"). Sélection choisie à la main plutôt qu'une
// recherche en texte libre (risque réel de recherches sans résultat) —
// identifiants vérifiés un par un. Contrairement aux décennies/studios/pays
// (un vrai "canon" à suivre, dans Profil), un mot-clé n'a pas de nombre
// canonique de films : vit dans Découvrir comme un outil de
// navigation/suggestion, pas de suivi de complétion.
const CURATED_THEMES = [
  { id: 10051, name: 'Braquage', icon: 'moneyBag' },
  { id: 10854, name: 'Boucle temporelle', icon: 'timeLoop' },
  { id: 9748, name: 'Vengeance', icon: 'sword' },
  { id: 10683, name: "Passage à l'âge adulte", icon: 'sprout' },
  { id: 10349, name: 'Survie', icon: 'compass' },
  { id: 7312, name: 'Road trip', icon: 'road' },
  { id: 3358, name: 'Maison hantée', icon: 'hauntedHouse' },
  { id: 4565, name: 'Dystopie', icon: 'skyline' },
];

// ═══════════════════════════════════════════
//  GESTION DES ONGLETS (Desktop & Mobile)
// ═══════════════════════════════════════════
const tabHistBtn = document.getElementById('tab-right-history');
const tabWlBtn = document.getElementById('tab-right-watchlist');
const tabDiscoverBtn = document.getElementById('tab-right-discover');
const tabProfileBtn = document.getElementById('tab-right-profile');
const viewHist = document.getElementById('view-history');
const viewWl = document.getElementById('view-watchlist');
const viewDiscover = document.getElementById('view-discover');
const viewProfile = document.getElementById('view-profile');

// Vit ici (pas dans 11-discover.js) car référencée dès le premier appel de
// switchRightTab() au démarrage — 01-navigation.js s'exécute AVANT
// 11-discover.js dans la concaténation (voir scripts/build-app-js.js), donc
// une déclaration `let` là-bas serait encore dans sa zone morte temporelle
// à ce moment précis : ReferenceError qui bloque tout le script, jamais
// rencontré avant que Découvrir devienne l'onglet ouvert au démarrage.
let discoverLoaded = false;

function switchRightTab(tabName) {
  const tabs = {
    history:   { btn: tabHistBtn,     view: viewHist },
    watchlist: { btn: tabWlBtn,       view: viewWl },
    discover:  { btn: tabDiscoverBtn, view: viewDiscover },
    profile:   { btn: tabProfileBtn,  view: viewProfile },
  };
  for (const [name, { btn, view }] of Object.entries(tabs)) {
    const isActive = name === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    view.classList.toggle('active', isActive);
  }
  // Ludex 2.0 : Découvrir entièrement repensé (voir 11-discover.js) — un
  // seul point d'entrée, chargé une fois au premier affichage (pas de
  // re-fetch à chaque fois qu'on revient sur l'onglet).
  if (tabName === 'discover' && !discoverLoaded) {
    discoverLoaded = true;
    if (typeof loadDiscoverTab === 'function') loadDiscoverTab();
  }
  // Duels vit désormais dans Profil (arène + classement) — rendu à chaque
  // affichage pour que la paire proposée reste à jour avec les derniers
  // films notés, comme avant son déplacement depuis Découvrir.
  if (tabName === 'profile' && typeof renderDuelsSection === 'function') {
    renderDuelsSection();
  }
  if (tabName === 'profile') {
    if (typeof renderProfileExtras === 'function') renderProfileExtras(loadHistory());
    if (typeof renderCuratedListsCard === 'function') renderCuratedListsCard();
  }
  // Rattrape un renderStats() sauté pendant que Profil était masqué (rendu
  // ciblé : pas de recalcul du radar/heatmap/badges à chaque sauvegarde si
  // personne ne regardait cet onglet — voir renderAll() dans 06-history.js).
  if (tabName === 'profile' && typeof renderProfileIfDirty === 'function') {
    renderProfileIfDirty();
  }
  // Ludex 2.0 : l'aperçu de swipe n'a plus lieu d'être — l'Historique est
  // passé en grille, il n'y a plus de geste caché à révéler (voir
  // 06b-history-actions.js). maybePlaySwipeHint() reste définie
  // (06a-history-list.js) mais n'est plus appelée nulle part.
}

tabHistBtn.addEventListener('click', () => switchRightTab('history'));
tabWlBtn.addEventListener('click', () => switchRightTab('watchlist'));
tabDiscoverBtn.addEventListener('click', () => switchRightTab('discover'));
tabProfileBtn.addEventListener('click', () => switchRightTab('profile'));

const navRating = document.getElementById('nav-rating');
const navHistory = document.getElementById('nav-history');
const navWatchlist = document.getElementById('nav-watchlist');
const navDiscover = document.getElementById('nav-discover');
const navProfile = document.getElementById('nav-profile');
const colRating = document.getElementById('col-rating');
const colRightViews = document.getElementById('col-right-views');

// Redémarre l'animation d'entrée (mobileViewIn) sur un élément : on retire la
// classe, on force un reflow (lecture d'une propriété layout), puis on la
// rajoute — sinon le navigateur ne rejoue pas l'animation si la classe était
// déjà présente.
function playMobileViewAnim(el) {
  el.classList.remove('mobile-view-anim');
  requestAnimationFrame(() => el.classList.add('mobile-view-anim'));
}

function switchMobileNav(view) {
  navRating.classList.remove('active');
  navHistory.classList.remove('active');
  navWatchlist.classList.remove('active');
  navDiscover.classList.remove('active');
  navProfile.classList.remove('active');
  navRating.removeAttribute('aria-current');
  navHistory.removeAttribute('aria-current');
  navWatchlist.removeAttribute('aria-current');
  navDiscover.removeAttribute('aria-current');
  navProfile.removeAttribute('aria-current');

  colRating.style.display = 'none';
  colRightViews.style.display = 'none';

  if (view === 'rating') {
    navRating.classList.add('active');
    navRating.setAttribute('aria-current', 'page');
    colRating.style.display = 'block'; 
    playMobileViewAnim(colRating);
  } else if (view === 'history') {
    navHistory.classList.add('active');
    navHistory.setAttribute('aria-current', 'page');
    colRightViews.style.display = 'flex';
    switchRightTab('history');
    playMobileViewAnim(colRightViews);
  } else if (view === 'watchlist') {
    navWatchlist.classList.add('active');
    navWatchlist.setAttribute('aria-current', 'page');
    colRightViews.style.display = 'flex';
    switchRightTab('watchlist');
    playMobileViewAnim(colRightViews);
  } else if (view === 'discover') {
    navDiscover.classList.add('active');
    navDiscover.setAttribute('aria-current', 'page');
    colRightViews.style.display = 'flex';
    switchRightTab('discover');
    playMobileViewAnim(colRightViews);
  } else if (view === 'profile') {
    navProfile.classList.add('active');
    navProfile.setAttribute('aria-current', 'page');
    colRightViews.style.display = 'flex';
    switchRightTab('profile');
    playMobileViewAnim(colRightViews);
  }
}

navRating.addEventListener('click', () => switchMobileNav('rating'));
navHistory.addEventListener('click', () => switchMobileNav('history'));
navWatchlist.addEventListener('click', () => switchMobileNav('watchlist'));
navDiscover.addEventListener('click', () => switchMobileNav('discover'));
navProfile.addEventListener('click', () => switchMobileNav('profile'));

// Un seul système de bascule de vue à toutes les tailles d'écran désormais
// (voir styles.css : la grille à deux colonnes est remplacée par des onglets
// uniques, positionnés en haut sur PC et en bas sur mobile) — plus besoin de
// réagir différemment au redimensionnement selon la largeur.
// Découvrir est désormais l'onglet ouvert au démarrage (au lieu de Noter),
// cohérent avec son nouvel ordre en tête de la barre de navigation.
// Différé au tick suivant (setTimeout 0) : app.js est la concaténation de
// ~28 fichiers exécutés dans l'ordre, et 01-navigation.js est tôt dans cet
// ordre — un appel immédiat à switchMobileNav('discover') atteint le code
// de 11-discover.js (discoverMediaType, CAROUSEL_SOURCES...), pas encore
// exécuté à ce stade. Même classe de bug "Cannot access ... before
// initialization" que celle déjà documentée dans 03-foundation.js, jamais
// rencontrée avant que Découvrir devienne l'onglet ouvert au démarrage
// (l'ancien 'rating' ne déclenchait aucun appel à ce code).
setTimeout(() => switchMobileNav('discover'), 0);

// ─── Swipe pour naviguer entre les onglets mobiles ───────────────────────────
// Glisser vers la gauche = onglet suivant, vers la droite = onglet précédent,
// dans l'ordre affiché en bas de l'écran : Noter → Historique → À voir → Découvrir.
// Complète les boutons de la barre de navigation, ne les remplace pas.
// Zones où un glissement (horizontal ou vertical) a déjà un sens propre
// (scroller un carrousel, déplacer un curseur, swiper une carte "Découvrir"...)
// : ni le changement d'onglet, ni le tirer-pour-rafraîchir ne doivent s'y
// déclencher. Fonction partagée (pas enfermée dans une IIFE) exprès — elle
// sert à plusieurs mécanismes de geste distincts dans ce fichier.
function isExcludedTarget(target) {
  return !!target.closest(
    '#carousel-container, .carousel-row, .choix-du-jour-card, .wl-card, .hist-item, .wl-lists-row, .heatmap-scroll, #quick-stars-container, input[type="range"], input[type="text"], textarea, .modal-overlay.open'
  );
}

(function initMobileSwipeNav() {
  // Ordre aligné sur la disposition visuelle de la barre (gauche à droite) :
  // Découvrir, À voir, Noter, Historique, Profil — un swipe suit désormais
  // le même sens que ce qu'on voit à l'écran.
  const TAB_ORDER = ['discover', 'watchlist', 'rating', 'history', 'profile'];
  const SWIPE_MIN_DISTANCE = 60; // px : en dessous, on considère que ce n'est pas volontaire
  const SWIPE_ANGLE_RATIO = 1.5; // le geste doit être nettement plus horizontal que vertical

  let startX = 0;
  let startY = 0;
  let tracking = false;

  function currentView() {
    if (navHistory.classList.contains('active')) return 'history';
    if (navWatchlist.classList.contains('active')) return 'watchlist';
    if (navDiscover.classList.contains('active')) return 'discover';
    if (navProfile.classList.contains('active')) return 'profile';
    return 'rating';
  }

  document.addEventListener('touchstart', e => {
    if (window.innerWidth > 860) { tracking = false; return; }
    if (e.touches.length !== 1 || isExcludedTarget(e.target)) { tracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_ANGLE_RATIO) return; // trop vertical, probablement un scroll

    const idx = TAB_ORDER.indexOf(currentView());
    if (dx < 0 && idx < TAB_ORDER.length - 1) {
      switchMobileNav(TAB_ORDER[idx + 1]); // glissement vers la gauche -> onglet suivant
      if (navigator.vibrate) navigator.vibrate(15);
      hapticPulse(document.getElementById('mobile-nav'), 'light');
    } else if (dx > 0 && idx > 0) {
      switchMobileNav(TAB_ORDER[idx - 1]); // glissement vers la droite -> onglet précédent
      if (navigator.vibrate) navigator.vibrate(15);
      hapticPulse(document.getElementById('mobile-nav'), 'light');
    }
  }, { passive: true });
})();

// ═══════════════════════════════════════════
//  TIRER VERS LE BAS POUR RAFRAÎCHIR
// ═══════════════════════════════════════════
// Uniquement quand la page est déjà tout en haut (rien à scroller au-dessus) —
// sinon on interférerait avec un simple scroll vers le bas de contenu. Exclut
// les mêmes zones que le swipe d'onglet (cartes, listes, carrousels...) qui
// gèrent déjà leurs propres gestes tactiles.
(function initPullToRefresh() {
  const indicator = document.getElementById('ptr-indicator');
  if (!indicator) return;

  const THRESHOLD = 70;
  const MAX_PULL = 100;
  let startY = 0;
  let pulling = false;
  let refreshing = false;

  document.addEventListener('touchstart', (e) => {
    if (refreshing) return;
    if (window.scrollY > 5) return;
    if (isExcludedTarget(e.target)) return;
    startY = e.touches[0].clientY;
    pulling = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!pulling || refreshing) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY <= 0 || window.scrollY > 5) { pulling = false; indicator.style.opacity = '0'; return; }
    const capped = Math.min(deltaY, MAX_PULL);
    indicator.style.transform = `translateX(-50%) translateY(${capped}px) rotate(${capped * 2.4}deg)`;
    indicator.style.opacity = String(Math.min(capped / THRESHOLD, 1));
    indicator.classList.toggle('ptr-ready', capped >= THRESHOLD);
  }, { passive: true });

  document.addEventListener('touchend', async () => {
    if (!pulling || refreshing) { pulling = false; return; }
    pulling = false;
    const wasReady = indicator.classList.contains('ptr-ready');

    if (!wasReady) {
      indicator.style.opacity = '0';
      return;
    }

    refreshing = true;
    indicator.classList.add('ptr-spinning');
    indicator.style.transform = `translateX(-50%) translateY(${THRESHOLD}px)`;
    try {
      if (getSyncCode()) {
        await pullFromCloud(); // affiche déjà son propre toast de confirmation
      } else {
        renderAll();
        showToast('Actualisé.');
      }
    } catch {
      showToast("Impossible d'actualiser pour l'instant.");
    } finally {
      refreshing = false;
      indicator.classList.remove('ptr-spinning', 'ptr-ready');
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateX(-50%) translateY(0)';
    }
  });
})();

// Accessibilité clavier : un vrai <button> déclenche déjà un clic sur
// Entrée/Espace nativement, mais un <div role="button" tabindex="0"> (utilisé
// pour les cartes cliquables — tendances, casting, filmographie, lignes
// d'historique/watchlist...) ne le fait PAS tout seul, le navigateur ne le
// câble pas automatiquement pour un rôle ARIA sur un élément non natif. Un
// seul écouteur global plutôt que de le répéter à chaque nouvel élément.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const target = e.target.closest('[role="button"][tabindex="0"]');
  if (!target) return;
  e.preventDefault();
  target.click();
});

// ═══════════════════════════════════════════
//  THEMING & SETTINGS
// ═══════════════════════════════════════════

// Applique une classe temporaire qui active une transition douce sur (quasi)
// tous les éléments pendant un changement de thème, plutôt qu'un changement
// de couleurs instantané et net. Limité à une courte fenêtre (350ms) pour ne
// pas garder ces transitions actives en permanence (coût de perf inutile,
// et risque d'interférer avec d'autres animations ponctuelles de l'app).
function withThemeTransition(applyFn) {
  const root = document.documentElement;
  root.classList.add('theme-transitioning');
  applyFn();
  setTimeout(() => root.classList.remove('theme-transitioning'), 350);
}

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
  // Repli pour quiconque avait Méridien enregistré avant son retrait — un
  // data-theme inconnu laisserait l'app sans variables CSS définies plutôt
  // que de retomber sur des couleurs cohérentes.
  if (themeToApply === 'meridien') themeToApply = 'default';
  
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
  document.getElementById('setting-genre-weights-enabled').checked = settings.genreWeightsEnabled !== false; // true par défaut (comportement historique conservé)
  const owned = loadOwnedProviders();
  document.querySelectorAll('.platform-chip').forEach(chip => {
    chip.classList.toggle('selected', owned.includes(chip.dataset.provider));
  });
  const th = settings.theme || 'default';
  document.querySelectorAll('.theme-card').forEach(tc => {
    const isSelected = tc.dataset.theme === th;
    tc.classList.toggle('selected', isSelected);
    tc.setAttribute('aria-checked', String(isSelected));
  });
}

document.getElementById('settings-btn').addEventListener('click', () => {
  lastFocusedBeforeModal = document.getElementById('settings-btn');
  document.getElementById('settings-modal').classList.add('open');
  document.getElementById('setting-app-name').focus();
});

document.getElementById('settings-cancel').addEventListener('click', () => {
  const s = JSON.parse(localStorage.getItem('lbx_settings') || '{}');
  applySettings(s); 
  document.getElementById('settings-modal').classList.remove('open');
  document.getElementById('settings-btn').focus();
});

function selectThemeCard(card) {
  document.querySelectorAll('.theme-card').forEach(tc => {
    tc.classList.remove('selected');
    tc.setAttribute('aria-checked', 'false');
  });
  card.classList.add('selected');
  card.setAttribute('aria-checked', 'true');
  withThemeTransition(() => {
    if (card.dataset.theme !== "system") {
        document.documentElement.setAttribute('data-theme', card.dataset.theme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? "default" : "filmnoir");
    }
  });
  renderAll();
}

document.getElementById('theme-grid').addEventListener('click', e => {
  const card = e.target.closest('.theme-card');
  if (!card) return;
  selectThemeCard(card);
});

// Accessibilité clavier : les cartes de thème ont role="radio" (voir index.html),
// donc Entrée et Espace doivent les activer comme un vrai bouton radio.
document.getElementById('theme-grid').addEventListener('keydown', e => {
  const card = e.target.closest('.theme-card');
  if (!card) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectThemeCard(card);
  }
});

const OWNED_PROVIDERS_KEY = 'lbx_owned_providers';
function loadOwnedProviders() {
  try { return JSON.parse(localStorage.getItem(OWNED_PROVIDERS_KEY)) || []; } catch { return []; }
}
function saveOwnedProviders(list) {
  localStorage.setItem(OWNED_PROVIDERS_KEY, JSON.stringify(list));
}

document.getElementById('platform-chips-grid').addEventListener('click', (e) => {
  const chip = e.target.closest('.platform-chip');
  if (!chip) return;
  chip.classList.toggle('selected');
});

document.getElementById('settings-save').addEventListener('click', () => {
  let rawName = document.getElementById('setting-app-name').value.trim();
  if(!rawName) rawName = "Ludex Rating Companion";
  const firstWord = rawName.split(' ')[0];
  const formattedName = rawName.replace(firstWord, `<em>${firstWord}</em>`);
  
  const newSettings = {
    appName: formattedName,
    theme: (document.querySelector('.theme-card.selected')||{dataset:{theme:'default'}}).dataset.theme,
    genreWeightsEnabled: document.getElementById('setting-genre-weights-enabled').checked,
  };
  
  localStorage.setItem('lbx_settings', JSON.stringify(newSettings));
  const selectedProviders = Array.from(document.querySelectorAll('.platform-chip.selected')).map(c => c.dataset.provider);
  saveOwnedProviders(selectedProviders);
  applySettings(newSettings);
  renderAll();
  document.getElementById('settings-modal').classList.remove('open');
  document.getElementById('settings-btn').focus();
});

loadSettings();


// ── theme-color dynamique ──
// La barre de statut iOS (et la couleur de fenêtre PWA) suit le thème actif
// au lieu de rester figée sur une couleur générique : le meta theme-color est
// resynchronisé avec le --bg calculé à chaque changement d'attribut data-theme
// (MutationObserver : couvre TOUS les chemins d'application — réglages,
// système, bascule jour/nuit de Méridien — sans dupliquer l'appel partout).
(function initDynamicThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  function sync() {
    // rAF : attend que le nouveau thème soit appliqué au style calculé
    requestAnimationFrame(() => {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      if (bg) meta.setAttribute('content', bg);
    });
  }
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  sync(); // etat initial
})();

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
// grille d'affiches watchlist" est désormais appliquée aux 6 thèmes
// (décision confirmée : compositions identiques partout, seules les
// couleurs/polices changent déjà par thème via les tokens) — nom conservé
// pour ne pas devoir toucher chaque site d'appel, mais ne dépend plus du
// thème actif. Un seul point de vérité, partagé par l'historique, la
// watchlist et l'écran Noter.
function isDefaultComposition() {
  return true;
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
// Ludex 2.0 : filtre "Coups de cœur" de l'Historique (films ET séries) —
// déclaré ici, même raison que le reste de ce bloc (référencé avant que
// 06a-history-list.js/18-tv-shows.js ne s'exécutent).
let activeLikedFilter = false;

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

// ═══════════════════════════════════════════
//  LOGIQUE PURE (testable) : calcul du score & fusion cloud
// ═══════════════════════════════════════════
//
// Ce fichier ne touche JAMAIS au DOM ni à localStorage : chaque fonction ici
// prend des données en entrée et renvoie un résultat, sans effet de bord.
// C'est délibéré : c'est ce qui permet de les tester automatiquement avec
// Node (voir tests/) sans avoir besoin d'un navigateur.
//
// Les fichiers qui ont besoin d'effets de bord (lire un slider, écrire dans le
// DOM, lire/écrire localStorage...) restent des fines couches au-dessus de ces
// fonctions — voir calculateScore() dans 05-rating-form.js et mergeWithRemote()
// dans 10-cloud-sync.js.
//
// Le bloc tout en bas (`if (typeof module !== 'undefined')...`) permet à ce
// même fichier de fonctionner à la fois :
//  - dans le navigateur : concaténé tel quel dans app.js, les fonctions
//    deviennent de simples fonctions globales (comme avant l'extraction) ;
//  - dans Node (tests) : `require()` direct, sans DOM.

const TOMBSTONE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours

// ─── Score ────────────────────────────────────────────────────────────────

// Mode rapide : note en étoiles (0.5 à 5, pas de 0.5) -> score sur 10.
function computeQuickScore(quickRatingStars) {
  return quickRatingStars * 2;
}

// Mode détaillé : moyenne pondérée des 6 critères (scenario, realisation,
// photo, acteurs, ambiance, affect), chacun noté de 0 à 10.
// `criteriaValues` : { scenario: 7.5, realisation: 8, ... }
// `weights`        : { scenario: 1, realisation: 1.5, ... }
function computeWeightedScore(criteriaValues, weights) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const key of Object.keys(criteriaValues)) {
    const val = criteriaValues[key];
    const wt = weights[key] ?? 1;
    weightedSum += val * wt;
    totalWeight += wt;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 5;
}

// Note globale d'une série : moyenne des saisons NOTÉES uniquement (une
// saison sans note n'entre pas dans le calcul, plutôt que de compter comme
// 0 et fausser la moyenne). Jamais stockée — toujours recalculée à partir
// des saisons, exactement comme convenu : une série qui change de
// direction en cours de route (True Detective, Twin Peaks...) n'a pas sa
// meilleure/pire saison lissée dans une note unique figée.
function computeShowAverageScore(showEntry) {
  if (!showEntry || !showEntry.seasons) return null;
  const rated = Object.values(showEntry.seasons).filter(s => s.rating && s.rating.score != null);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, s) => acc + parseFloat(s.rating.score), 0);
  return sum / rated.length;
}

// Convertit un score sur 10 en équivalent "étoiles" (pas de 0.5), pour l'affichage.
function scoreToStars(score) {
  return Math.round((score / 2) * 2) / 2;
}

// Formatte un nombre d'étoiles en chaîne ★★★½
function getStarStr(stars) {
  let s = '';
  const full = Math.floor(stars);
  const half = (stars % 1) !== 0;
  for (let i = 0; i < full; i++) s += '★';
  if (half) s += '½';
  return s || '½';
}

// ─── Fusion cloud : clés d'identité ─────────────────────────────────────────

function historyItemKey(item) {
  return (item.title || '').toLowerCase();
}

function watchlistItemKey(item) {
  return item.tmdbId ? `id:${item.tmdbId}` : `title:${(item.title || '').toLowerCase()}`;
}

function tvShowItemKey(show) {
  return String(show.tmdbTvId);
}

// ─── Fusion cloud : séries suivies ───────────────────────────────────────────
// Contrairement aux films/watchlist (listes plates), une série contient des
// saisons imbriquées — la fusion se fait donc à deux niveaux : d'abord les
// séries elles-mêmes, puis pour chaque série ses saisons une par une. Deux
// listes de tombstones séparées (série entière / saison individuelle, clé
// composée tmdbTvId:numéroSaison) — chaque suppression, quel que soit son
// niveau, doit rester respectée après une synchronisation.
function mergeTvShows(local, remote, showTombstones, seasonTombstones) {
  const byId = new Map();
  for (const show of [...local, ...remote]) {
    const key = tvShowItemKey(show);
    if (!key || key === 'undefined') continue;
    if (!byId.has(key)) {
      byId.set(key, { tmdbTvId: show.tmdbTvId, title: show.title, poster_path: show.poster_path, genre: show.genre, seasons: {} });
    }
    const target = byId.get(key);
    if (show.title) target.title = show.title;
    if (show.poster_path) target.poster_path = show.poster_path;
    if (show.genre) target.genre = show.genre;

    for (const [seasonKey, season] of Object.entries(show.seasons || {})) {
      const existing = target.seasons[seasonKey];
      if (!existing) { target.seasons[seasonKey] = season; continue; }
      // Deux versions de la même saison : pas de vrai horodatage de dernière
      // modification au niveau saison pour trancher finement — priorité à
      // celle qui a une note (plus "aboutie"), puis à la date de note la
      // plus récente, puis au nombre d'épisodes vus le plus élevé.
      const existingRated = !!existing.rating;
      const seasonRated = !!season.rating;
      if (seasonRated && !existingRated) {
        target.seasons[seasonKey] = season;
      } else if (seasonRated && existingRated) {
        if (new Date(season.rating.date || 0) > new Date(existing.rating.date || 0)) target.seasons[seasonKey] = season;
      } else if (!seasonRated && !existingRated) {
        if ((season.watchedEpisodes || []).length > (existing.watchedEpisodes || []).length) target.seasons[seasonKey] = season;
      }
    }
  }

  for (const show of byId.values()) {
    for (const seasonKey of Object.keys(show.seasons)) {
      const tomb = seasonTombstones.find(t => t.key === `${show.tmdbTvId}:${seasonKey}`);
      if (!tomb) continue;
      const seasonTime = new Date(show.seasons[seasonKey].rating?.date || 0).getTime();
      if (new Date(tomb.deletedAt).getTime() >= seasonTime) delete show.seasons[seasonKey];
    }
  }

  const result = [];
  for (const show of byId.values()) {
    const tomb = showTombstones.find(t => t.key === tvShowItemKey(show));
    if (tomb) {
      const latestSeasonTime = Math.max(0, ...Object.values(show.seasons).map(s => new Date(s.rating?.date || 0).getTime()));
      if (new Date(tomb.deletedAt).getTime() >= latestSeasonTime) continue;
    }
    if (Object.keys(show.seasons).length === 0) continue;
    result.push(show);
  }
  return result;
}

// ─── Fusion cloud : tombstones (traces de suppression) ──────────────────────

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

// ─── Fusion cloud : historique ───────────────────────────────────────────────

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

// ─── Fusion cloud : watchlist ────────────────────────────────────────────────

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

// ─── Descriptions qualitatives par critère (paliers + qualificatif fin) ────

const DESCS = {
  scenario: [
    [9.5,"Un chef-d'œuvre narratif absolu. Écriture brillante, dialogues ciselés, structure parfaite et thèmes d'une profondeur rare qui hantent longtemps après le visionnage."],
    [8.5,"Scénario magistral. Une construction d'une intelligence rare, des personnages d'une richesse peu commune, presque aucune fausse note."],
    [7.5,"Excellent scénario. Récit captivant, personnages bien écrits et rebondissements intelligents qui maintiennent un fort engagement."],
    [6.5,"Bonne écriture, quelques idées qui sortent du lot, mais sans jamais atteindre une vraie fulgurance."],
    [5.5,"Une histoire classique et fonctionnelle. Fait le travail correctement, mais suit des sentiers battus ou manque d'une vraie prise de risque."],
    [4.5,"Des maladresses évidentes. Rythme narratif inconstant, facilités scénaristiques ou dialogues un peu artificiels qui sortent du récit."],
    [3.5,"Scénario poussif. Les ficelles se voient, certains personnages sonnent creux, l'ensemble peine à convaincre."],
    [2.5,"Récit laborieux. De graves incohérences, des intrigues secondaires inutiles ou des personnages aux réactions incompréhensibles."],
    [1.5,"Écriture quasi inexistante. Le fil narratif se perd, les enjeux ne tiennent debout à aucun moment."],
    [0,  "Un naufrage scénaristique total. Dénué de sens, ennuyeux à mourir ou insultant pour l'intelligence du spectateur."]
  ],
  realisation: [
    [9.5,"Une masterclass de mise en scène. Une vision d'auteur absolue où chaque plan respire l'intelligence, la maîtrise et l'audace visuelle."],
    [8.5,"Réalisation éblouissante. Un vrai geste de cinéma, ambitieux et maîtrisé de bout en bout."],
    [7.5,"Réalisation forte et inspirée. Le réalisateur a un vrai point de vue, avec une caméra dynamique qui sublime le propos du film."],
    [6.5,"Mise en scène assurée, quelques idées visuelles marquantes, sans toutefois transcender le sujet."],
    [5.5,"Mise en scène artisanale et propre. Efficace, lisible, mais qui s'efface souvent derrière son sujet sans fulgurance visuelle."],
    [4.5,"Une réalisation impersonnelle. Ressemble plus à un produit de commande ou à un téléfilm manquant cruellement de caractère."],
    [3.5,"Mise en scène poussive, découpage parfois maladroit, peu d'idées de mise en image."],
    [2.5,"Mise en scène paresseuse ou confuse. Découpage hasardeux, absence de rythme visuel ou tics qui fatiguent l'œil."],
    [1.5,"Réalisation à peine fonctionnelle. Cadres bancals, mise en scène qui dessert constamment le récit."],
    [0,  "Catastrophique. Incompétence technique crasse, montage épileptique ou plans littéralement illisibles."]
  ],
  photo: [
    [9.5,"Une claque visuelle absolue. Chaque plan est un tableau. Gestion de la lumière, colorimétrie et cadrages atteignent le sublime."],
    [8.5,"Photographie somptueuse, une signature visuelle forte et cohérente du début à la fin."],
    [7.5,"Superbe photographie. Une identité visuelle très marquée qui participe activement à l'ambiance et flatte constamment la rétine."],
    [6.5,"Belle image, quelques plans qui sortent du lot, sans être une œuvre visuellement unique."],
    [5.5,"Esthétique soignée mais standardisée. L'image est belle et propre, mais reste académique ou familière."],
    [4.5,"Visuellement terne ou inégal. Éclairages plats, étalonnage douteux (trop gris/sombre) ou effets spéciaux qui jurent."],
    [3.5,"Image assez pauvre, cadrages sans inspiration, colorimétrie qui manque de cohérence."],
    [2.5,"Laideur visuelle manifeste. Cadrages ratés, image numérique sans texture, ou filtres appliqués sans aucune cohérence artistique."],
    [1.5,"Image quasiment illisible ou dénuée de tout soin, très en dessous des standards attendus."],
    [0,  "Une agression oculaire. Illisible, bouillie de pixels ou éclairage d'une pauvreté affligeante."]
  ],
  acteurs: [
    [9.5,"Des performances magistrales et habitées. Des acteurs en état de grâce qui transcendent leurs personnages et crèvent l'écran."],
    [8.5,"Casting exceptionnel, des interprétations d'une justesse rare qui portent le film à elles seules."],
    [7.5,"Un casting redoutable. Des interprétations justes, intenses et nuancées qui portent le film avec un grand charisme."],
    [6.5,"Bonnes performances dans l'ensemble, une ou deux têtes d'affiche particulièrement convaincantes."],
    [5.5,"Jeu solide et convaincant. Les acteurs font le job honnêtement, sans pour autant livrer la performance de leur carrière."],
    [4.5,"Interprétations inégales. Certains tirent leur épingle du jeu, mais d'autres surjouent ou manquent cruellement d'alchimie."],
    [3.5,"Jeu d'acteur assez faible dans l'ensemble, direction d'acteurs peu convaincante."],
    [2.5,"Casting en roue libre. Mauvaise direction d'acteurs, expressions forcées, ou têtes d'affiche visiblement venues pour le chèque."],
    [1.5,"Interprétations quasi risibles, aucune alchimie ni conviction à l'écran."],
    [0,  "Un festival de jeu monolithique ou d'hystérie ridicule. Impossible de croire une seule seconde aux personnages."]
  ],
  ambiance: [
    [9.5,"Une immersion sensorielle totale. Bande originale mythique et sound design viscéral qui prennent littéralement aux tripes."],
    [8.5,"Atmosphère sonore exceptionnelle, musique et sound design qui deviennent indissociables du film."],
    [7.5,"Excellente atmosphère. La musique et les effets sonores enveloppent le spectateur et renforcent magistralement l'impact émotionnel."],
    [6.5,"Bon accompagnement sonore, quelques thèmes marquants, sans devenir mémorable dans son ensemble."],
    [5.5,"Ambiance réussie. Accompagnement sonore fonctionnel et agréable, qui soutient l'action sans pour autant marquer les esprits."],
    [4.5,"Sonorité générique. Musique d'ascenseur, thèmes oubliables ou mixage sonore parfois douteux en retrait."],
    [3.5,"Ambiance sonore faible, musique qui peine à installer une atmosphère cohérente."],
    [2.5,"Bande-son envahissante ou hors sujet. Musique omniprésente qui dicte les émotions, ou sound design artificiel qui brise l'immersion."],
    [1.5,"Son quasiment raté, mixage désagréable, aucune identité sonore."],
    [0,  "Supplice auditif. Bruitages ratés, doublages asynchrones, ou bande originale qui ruine littéralement les scènes clés."]
  ],
  rythme: [
    [9.5,"Un rythme d'une précision chirurgicale. Chaque scène a exactement la durée qu'il faut, montage d'orfèvre, pas une seconde de trop ni de manque."],
    [8.5,"Montage excellent, un tempo qui épouse parfaitement les intentions du film du début à la fin."],
    [7.5,"Très bon rythme. Le film se regarde sans effort, les transitions sont fluides et le montage sert bien le récit."],
    [6.5,"Rythme globalement maîtrisé, quelques longueurs ponctuelles qui n'entament pas trop l'ensemble."],
    [5.5,"Rythme correct mais irrégulier. Certains passages traînent un peu, d'autres filent trop vite, sans que ça gâche l'expérience."],
    [4.5,"Rythme mal calibré. Des longueurs qui se sentent, un montage qui casse parfois l'élan du film."],
    [3.5,"Film qui traîne clairement en longueur ou au contraire semble haché, avec des ruptures de rythme gênantes."],
    [2.5,"Rythme poussif ou décousu sur une bonne partie du film, l'attention décroche régulièrement."],
    [1.5,"Montage confus, tempo constamment à côté de la plaque, on regarde sa montre."],
    [0,  "Rythme complètement raté. Interminable, ou monté de façon si chaotique que le film en devient illisible."]
  ],
  affect: [
    [9.5,"Coup de foudre absolu. Un film qui bouleverse, obsède, et trouve une place immédiate dans mon panthéon personnel."],
    [8.5,"Immense claque émotionnelle. Un film qui restera gravé longtemps, que je recommande sans réserve."],
    [7.5,"Énorme coup de cœur. Une œuvre marquante qui m'a fait vibrer, rire ou pleurer, et que je reverrai avec grand plaisir."],
    [6.5,"Beau moment, quelques scènes qui marquent vraiment, une expérience que j'ai appréciée sincèrement."],
    [5.5,"Un très bon moment de cinéma. J'ai pris du plaisir devant ce film, même s'il ne me laissera pas un souvenir impérissable."],
    [4.5,"Sentiment mitigé. Pas désagréable, mais je reste totalement sur ma faim. Vite vu, assez vite oublié."],
    [3.5,"Peu d'accroche émotionnelle, le film m'a globalement laissé de marbre."],
    [2.5,"Ennui ou agacement profond. Une expérience pénible, où le temps a semblé particulièrement long. Très peu d'accroche."],
    [1.5,"Rejet quasi total, très peu de moments qui ont suscité un intérêt réel."],
    [0,  "Rejet viscéral. Une perte de temps absolue, un film que j'ai détesté de bout en bout et que je veux effacer de ma mémoire."]
  ]
};

// Séries — Phase 3 : descriptions propres aux deux critères reformulés
// pour une saison ("photo" -> Qualité du final, "rythme" -> Rythme &
// Cohérence de la saison). Les 5 autres critères (scenario, realisation,
// acteurs, ambiance, affect) restent transposables tels quels, mêmes
// textes que pour un film — pas de doublon nécessaire pour eux. Même
// structure à 10 paliers que DESCS, pour rester cohérent.
const DESCS_TV_OVERRIDES = {
  photo: [
    [9.5,"Un final parfait, qui élève toute la saison et referme chaque fil narratif avec une intelligence rare."],
    [8.5,"Une conclusion magistrale, à la hauteur de tout ce qui précède, qui restera gravée longtemps."],
    [7.5,"Excellent épisode final. Il conclut la saison avec panache, sans faux pas majeur."],
    [6.5,"Bon final, qui referme l'essentiel sans forcément marquer les esprits."],
    [5.5,"Final honnête et satisfaisant, qui fait le travail sans surprendre."],
    [4.5,"Final en demi-teinte. Quelques fils narratifs bâclés ou une résolution un peu facile."],
    [3.5,"Conclusion décevante, qui peine à être à la hauteur de la saison."],
    [2.5,"Final raté, qui gâche une partie de ce que la saison avait construit."],
    [1.5,"Fin quasiment ratée, qui trahit l'attente installée par les épisodes précédents."],
    [0,  "Un désastre. La fin détruit ce que la saison avait de mieux, ou ne conclut rien du tout."]
  ],
  rythme: [
    [9.5,"Un rythme d'une précision chirurgicale sur toute la saison. Chaque épisode a sa place, aucun ventre mou, une cohérence sans faille du premier au dernier épisode."],
    [8.5,"Excellente cohérence de saison, un tempo qui épouse parfaitement l'arc narratif du premier au dernier épisode."],
    [7.5,"Très bonne tenue sur la durée. La saison se regarde sans effort, les épisodes s'enchaînent avec fluidité."],
    [6.5,"Rythme globalement maîtrisé sur la saison, quelques épisodes plus faibles qui n'entament pas l'ensemble."],
    [5.5,"Cohérence correcte mais irrégulière. Certains épisodes traînent, d'autres filent trop vite, sans que ça gâche l'ensemble."],
    [4.5,"Rythme mal calibré sur la saison. Des épisodes de remplissage qui cassent l'élan général."],
    [3.5,"Saison qui traîne clairement en longueur sur plusieurs épisodes, ou qui semble décousue d'un épisode à l'autre."],
    [2.5,"Cohérence poussive sur une bonne partie de la saison, l'intérêt décroche régulièrement d'un épisode à l'autre."],
    [1.5,"Enchaînement confus, tempo constamment à côté de la plaque sur la majorité des épisodes."],
    [0,  "Rythme complètement raté sur toute la saison. Interminable, ou décousu au point de perdre le fil d'un épisode à l'autre."]
  ]
};

// Le cache est attaché à la fonction elle-même (pas une const top-level) et
// initialisé au premier appel — ainsi aucune ligne de déclaration à atteindre
// avant de pouvoir l'utiliser. C'est exactement la même classe de bug
// rencontrée plusieurs fois dans ce projet (CRITERIA_SHORT_LABELS,
// CONTEXT_TAG_ICONS, GENRE_BADGE_THRESHOLD) : une const top-level référencée
// par une fonction appelée via le renderAll() précoce de 03-foundation.js,
// AVANT que ce fichier-ci (qui charge après) n'ait fini de s'exécuter et
// atteint sa propre déclaration. Cette fois le remède habituel ("rendre la
// constante locale à la fonction") ne suffit pas seul, puisque ce cache doit
// justement SURVIVRE entre les appels — d'où cette variante.
function getDesc(criterion, val, mediaType = 'movie') {
  if (!getDesc._cache) getDesc._cache = {};
  const _descCache = getDesc._cache;
  const key = mediaType + criterion + val;
  if (_descCache[key]) return _descCache[key];
  const tiers = (mediaType === 'tv' && DESCS_TV_OVERRIDES[criterion]) || DESCS[criterion];

  for (let i = 0; i < tiers.length; i++) {
    const [thresh, text] = tiers[i];
    if (val < thresh) continue;

    // Chaque palier couvre en général 2 valeurs voisines (ex: 8.5 et 9.0 pour
    // le seuil 8.5), sauf le dernier qui en couvre 3 (0, 0.5, 1.0). On ajoute
    // un court qualificatif selon la position exacte dans cette fourchette,
    // pour un retour plus fin que le seul texte du palier (qui, lui, ne
    // change qu'environ tous les 1 point) — sans avoir à réécrire 147 textes
    // différents pour un gain de nuance souvent minime entre deux valeurs
    // voisines.
    const nextThresh = i > 0 ? tiers[i - 1][0] : thresh + 1; // borne haute (exclue) du palier actuel
    const rangeSpan = nextThresh - thresh;
    const posInRange = val - thresh;

    let qualifier = '';
    if (rangeSpan > 0.5) {
      if (Math.abs(posInRange) < 0.01) {
        qualifier = ' (plutôt bas dans cette tranche)';
      } else if (Math.abs(posInRange - (rangeSpan - 0.5)) < 0.01) {
        qualifier = ' (plutôt haut dans cette tranche)';
      }
      // Valeur médiane (uniquement pour le dernier palier, qui couvre 3
      // valeurs) : pas de qualificatif, elle est déjà bien au centre.
    }

    const result = text + qualifier;
    _descCache[key] = result;
    return result;
  }

  const fallback = tiers[tiers.length - 1][1];
  _descCache[key] = fallback;
  return fallback;
}

// ─── Moyennes personnelles par critère (repère sur les sliders + radar) ─────
// Retourne { scenario: 7.2, realisation: null, ... } — null si aucune entrée
// de l'historique n'a de valeur pour ce critère (ex: 'rythme' avant son ajout).
function computeCriteriaAverages(history, criteria) {
  const sums = {};
  const counts = {};
  criteria.forEach(c => { sums[c] = 0; counts[c] = 0; });

  history.forEach(h => {
    if (h.mode === 'detail' && h.values) {
      criteria.forEach(c => {
        const val = parseFloat(h.values[c]);
        if (!isNaN(val)) { sums[c] += val; counts[c]++; }
      });
    }
  });

  const avgs = {};
  criteria.forEach(c => { avgs[c] = counts[c] > 0 ? sums[c] / counts[c] : null; });
  return avgs;
}

// ─── Onglet Profil : temps visionné, série en cours, badges ────────────────
function formatWatchTime(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '—';
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days} j`);
  if (hours > 0 || days === 0) parts.push(`${hours} h`);
  return parts.join(' ');
}

// Clé "année-semaine ISO" pour une date donnée — deux dates de la même semaine
// ISO (lundi à dimanche) produisent la même clé, peu importe le jour exact.
function getISOWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

// Nombre de semaines ISO consécutives (en remontant depuis AUJOURD'HUI) avec
// au moins un film noté — 0 si la semaine en cours n'a rien.
function computeWeekStreak(history, referenceDate = new Date()) {
  const weeksWithActivity = new Set();
  history.forEach(h => {
    const raw = h.savedAt || h.date;
    if (!raw) return;
    const d = new Date(raw);
    if (isNaN(d)) return;
    weeksWithActivity.add(getISOWeekKey(d));
  });

  let streak = 0;
  const cursor = new Date(referenceDate);
  while (weeksWithActivity.has(getISOWeekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

// Nombre de JOURS consécutifs (en remontant depuis AUJOURD'HUI) avec au
// moins une note ajoutée — granularité plus fine que computeWeekStreak
// (semaines ISO), nécessaire pour le succès "Fidélité" (3/10/30 jours) qui
// parle explicitement de jours, pas de semaines. Fonctions séparées plutôt
// que fusionnées : le streak hebdomadaire (déjà affiché ailleurs dans le
// Profil) reste inchangé, celui-ci sert uniquement au nouveau succès.
function computeDayStreak(history, referenceDate = new Date()) {
  const daysWithActivity = new Set();
  history.forEach(h => {
    const raw = h.savedAt || h.date;
    if (!raw) return;
    const d = new Date(raw);
    if (isNaN(d)) return;
    daysWithActivity.add(d.toISOString().slice(0, 10));
  });

  let streak = 0;
  const cursor = new Date(referenceDate);
  while (daysWithActivity.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Badges débloqués selon l'historique — chaque entrée est indépendante,
// aucune ne dépend d'un ordre de déblocage particulier.
// ─── Rétrospective annuelle ("Wrapped") ─────────────────────────────────────
// Filtre l'historique sur UNE année (par savedAt, ou date à défaut) et en
// tire les temps forts — genre/réalisateur/acteur/mois les plus présents,
// film le mieux noté, temps total visionné. Fonction pure : ne touche à
// aucun DOM, juste des données en entrée/sortie, pour rester testable
// facilement (contrairement aux tests E2E, plus lents et parfois instables).
// ── Import Letterboxd (voir 07-data-io.js pour l'UI) ──
// Parseur CSV minimal mais correct : gère les champs entre guillemets
// (contenant virgules, retours à la ligne, guillemets doublés ""), le cas le
// plus piégeux des exports Letterboxd (titres comme "Paris, Texas").
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
  return rows;
}

// Convertit les lignes d'un CSV Letterboxd (diary.csv, ratings.csv ou
// watched.csv — colonnes détectées par l'en-tête, insensible à l'ordre) en
// items d'historique Ludex. Note Letterboxd sur 5 étoiles -> score sur 10.
// Retourne aussi le type détecté et les lignes ignorées (sans titre).
function mapLetterboxdCsv(rows) {
  if (!rows || rows.length < 2) return { items: [], skipped: 0, kind: null };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = (name) => header.indexOf(name);
  const iName = col('name'), iYear = col('year'), iRating = col('rating');
  const iWatched = col('watched date'), iDate = col('date');
  if (iName === -1) return { items: [], skipped: 0, kind: null }; // pas un CSV Letterboxd

  const kind = iWatched !== -1 ? 'diary' : (iRating !== -1 ? 'ratings' : 'watched');
  const items = [];
  let skipped = 0;
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const title = (cells[iName] || '').trim();
    if (!title) { skipped++; continue; }
    const year = iYear !== -1 ? (cells[iYear] || '').trim() : '';
    const ratingRaw = iRating !== -1 ? parseFloat(cells[iRating]) : NaN;
    const hasRating = !isNaN(ratingRaw) && ratingRaw > 0;
    const score = hasRating ? (ratingRaw * 2).toFixed(1) : '';
    const watchedDate = (iWatched !== -1 && cells[iWatched]) ? cells[iWatched].trim()
                      : (iDate !== -1 && cells[iDate]) ? cells[iDate].trim() : '';
    items.push({
      title,
      year,
      score,
      mode: 'quick',
      values: hasRating ? { quick: ratingRaw } : {},
      date: watchedDate,
      savedAt: new Date().toISOString(),
      importedFrom: 'letterboxd',
    });
  }
  return { items, skipped, kind };
}

// ── Cartes Profil : "Il y a un an", heatmap, décennies ──
// Compte de films par jour (clé YYYY-MM-DD), pour la heatmap calendrier.
function computeDailyCounts(history) {
  const counts = {};
  for (const item of history) {
    if (!item.date) continue;
    const key = String(item.date).slice(0, 10);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// Films regroupés par décennie de sortie, avec compte et note moyenne.
// Trié par compte décroissant. Les items sans année sont ignorés.
function computeDecadeStats(history) {
  const byDecade = {};
  for (const item of history) {
    const y = parseInt(item.year, 10);
    if (isNaN(y) || y < 1880 || y > 2100) continue;
    const decade = Math.floor(y / 10) * 10;
    if (!byDecade[decade]) byDecade[decade] = { decade, count: 0, scoreSum: 0, scored: 0 };
    byDecade[decade].count++;
    const s = parseFloat(item.score);
    if (!isNaN(s)) { byDecade[decade].scoreSum += s; byDecade[decade].scored++; }
  }
  return Object.values(byDecade)
    .map(d => ({ decade: d.decade, count: d.count, avg: d.scored > 0 ? d.scoreSum / d.scored : null }))
    .sort((a, b) => b.count - a.count);
}

// Le film regardé "il y a un an" : cherche autour de la même date l'an
// dernier, en élargissant progressivement (jour exact, puis ±1, ±2, ±3 jours)
// pour maximiser la chance d'un souvenir sans tricher sur "il y a un an".
function findOneYearAgoFilm(history, today) {
  const base = new Date(today);
  base.setFullYear(base.getFullYear() - 1);
  for (let spread = 0; spread <= 3; spread++) {
    for (const sign of spread === 0 ? [0] : [-1, 1]) {
      const d = new Date(base);
      d.setDate(d.getDate() + spread * sign);
      const key = d.toISOString().slice(0, 10);
      const found = history.find(h => h.date && String(h.date).slice(0, 10) === key);
      if (found) return { item: found, date: key };
    }
  }
  return null;
}

// ── Migrations de schéma (voir 00a-migrations.js pour le runner) ──
// Normalisation v2 d'un item d'historique : garantit les champs que le reste
// du code suppose présents. Idempotente (la rejouer ne change rien) — c'est la
// propriété clé d'une migration sûre. Pure et testée dans tests/migrations.test.js.
function normalizeHistoryItemV2(item) {
  if (!item || typeof item !== 'object') return item;
  const out = { ...item };
  // savedAt : des données très anciennes ou importées à la main peuvent ne pas
  // l'avoir — repli sur la date de visionnage, sinon une époque neutre (pas
  // "maintenant" : ça fausserait les tris "ajouté récemment" à chaque migration).
  if (!out.savedAt) {
    out.savedAt = out.date ? `${out.date}T12:00:00.000Z` : '1970-01-01T00:00:00.000Z';
  }
  // values : le code de rendu (radar, moyennes) suppose un objet
  if (!out.values || typeof out.values !== 'object') out.values = {};
  // title : chaîne toujours (un import cassé pourrait mettre null)
  if (typeof out.title !== 'string') out.title = String(out.title ?? '');
  return out;
}

// ── Duels ELO (voir 13-duels.js pour le stockage/rendu) ──
// Probabilité attendue de victoire selon l'écart de cotes, puis mise à jour
// symétrique : le vainqueur gagne exactement ce que le perdant perd. Battre
// plus fort que soi rapporte gros ; battre plus faible rapporte peu.
function computeEloUpdate(winnerElo, loserElo, k = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const delta = Math.round(k * (1 - expectedWinner));
  return { winnerElo: winnerElo + delta, loserElo: loserElo - delta, delta };
}

function computeWrappedStats(history, year) {
  const yearStr = String(year);
  const filtered = history.filter(h => {
    const d = h.savedAt || h.date;
    return !!d && d.slice(0, 4) === yearStr;
  });

  const totalFilms = filtered.length;
  const avgScore = totalFilms > 0
    ? filtered.reduce((sum, h) => sum + (parseFloat(h.score) || 0), 0) / totalFilms
    : 0;

  function topEntry(counts) {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? { name: entries[0][0], count: entries[0][1] } : null;
  }

  const genreCounts = {};
  filtered.forEach(h => {
    if (h.genre) h.genre.split(',').forEach(g => { const t = g.trim(); if (t) genreCounts[t] = (genreCounts[t] || 0) + 1; });
  });

  const directorCounts = {};
  filtered.forEach(h => { if (h.director) { const t = h.director.trim(); if (t) directorCounts[t] = (directorCounts[t] || 0) + 1; } });

  const actorCounts = {};
  filtered.forEach(h => {
    if (h.actors) h.actors.split(',').forEach(a => { const t = a.trim(); if (t) actorCounts[t] = (actorCounts[t] || 0) + 1; });
  });

  const monthCounts = {};
  filtered.forEach(h => {
    const d = h.savedAt || h.date;
    if (d) { const m = d.slice(0, 7); monthCounts[m] = (monthCounts[m] || 0) + 1; }
  });
  const topMonthRaw = topEntry(monthCounts);

  const bestRated = filtered.length > 0
    ? filtered.slice().sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0))[0]
    : null;

  const totalMinutes = filtered.reduce((sum, h) => {
    const m = parseInt(h.runtime, 10);
    return sum + (isNaN(m) ? 0 : m);
  }, 0);

  return {
    year,
    totalFilms,
    avgScore,
    topGenre: topEntry(genreCounts),
    topDirector: topEntry(directorCounts),
    topActor: topEntry(actorCounts),
    topMonth: topMonthRaw, // { name: "2026-03", count } — le nom du mois est formaté à l'affichage, pas ici
    bestRated,
    totalMinutes,
  };
}

// Ludex 2.0 : système de paliers (I/II/III, bronze/argent/or) — voir
// Ludex_Gamification_Succes.pdf. Chaque badge a 3 seuils au lieu d'un seul ;
// tierify() calcule où on en est. Remplace l'ancien système à seuil unique
// dans son intégralité (mêmes id que les tiers eux-mêmes n'existaient pas
// avant, donc rien à migrer côté stockage — les badges sont toujours
// recalculés à la volée, jamais une donnée primaire).
function tierify(value, tiers) {
  let tier = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (value >= tiers[i]) tier = i + 1;
  }
  const maxed = tier >= tiers.length;
  const nextThreshold = maxed ? null : tiers[tier];
  // Palier 0 : progression vers le PREMIER seuil (pas vers un seuil déjà
  // dépassé) — value/tiers[0], jamais value/nextThreshold quand tier>0 (le
  // dénominateur serait alors le seuil déjà franchi, pas le suivant).
  const progress = maxed ? 1 : Math.min(1, value / nextThreshold);
  return { value, tier, maxed, nextThreshold, progress };
}

// Première vague de succès à paliers (voir Ludex_Gamification_Succes.pdf) —
// seuls les trophées calculables avec les données déjà stockées aujourd'hui.
// Le reste du document (récompenses, popularité TMDb à l'instant T, langue
// originale, franchises, minutage par épisode...) demande de nouvelles
// données jamais suivies jusqu'ici — repoussé à une vague suivante plutôt
// que deviné approximativement.
function computeBadges(history, extras = {}) {
  const totalMinutes = extras.totalMinutes || 0;
  const dayStreak = extras.dayStreak || 0;
  const tvRatings = extras.tvRatings || []; // { score, date } par saison notée — voir getAllTvSeasonRatings()

  const genreSet = new Set();
  const genreCounts = {};
  history.forEach(h => {
    if (h.genre) h.genre.split(',').forEach(g => {
      const t = g.trim(); if (!t) return;
      genreSet.add(t);
      genreCounts[t] = (genreCounts[t] || 0) + 1;
    });
  });

  const scores = history.map(h => parseFloat(h.score)).filter(s => !isNaN(s));
  const masterpieceCount = scores.filter(s => s >= 9).length;
  const demonCount = scores.filter(s => s < 3).length;
  const likedCount = history.filter(h => h.liked).length;

  // "Le Difficile" / "Le Bon Public" : compte de tranches COMPLÈTES et
  // DISJOINTES de 20 notes consécutives (par ordre chronologique
  // d'ajout) dont la moyenne franchit le seuil — pas une fenêtre glissante
  // (qui compterait la même série de bons/mauvais films des dizaines de
  // fois de suite), une vraie répétition de la performance sur des lots
  // différents.
  const chronological = [...history].sort((a, b) => (a.savedAt || a.date || '').localeCompare(b.savedAt || b.date || ''));
  let hardCount = 0, crowdPleaserCount = 0;
  for (let i = 0; i + 20 <= chronological.length; i += 20) {
    const slice = chronological.slice(i, i + 20);
    const sliceAvg = slice.reduce((sum, h) => sum + (parseFloat(h.score) || 0), 0) / slice.length;
    if (sliceAvg < 5) hardCount++;
    if (sliceAvg > 8) crowdPleaserCount++;
  }

  // "Le Puriste" : plus longue série de films notés d'affilée SANS le bonus
  // coup de cœur (ordre chronologique) — l'inverse exact de Coup de Foudre.
  let purestStreak = 0, purestMax = 0;
  chronological.forEach(h => {
    if (h.liked) { purestStreak = 0; } else { purestStreak++; purestMax = Math.max(purestMax, purestStreak); }
  });

  const defs = [
    { id: 'critique',   name: 'Le Critique',   icon: '🎬', ...tierify(history.length + tvRatings.length, [10, 100, 500]) },
    { id: 'marathonien',name: 'Marathonien',    icon: '⏱️', ...tierify(totalMinutes, [24 * 60, 100 * 60, 500 * 60]) },
    { id: 'fidelite',   name: 'Fidélité',       icon: '🔥', ...tierify(dayStreak, [3, 10, 30]) },
    { id: 'chef_oeuvre',name: 'Chef-d\'Œuvre',  icon: '🏆', ...tierify(masterpieceCount, [5, 25, 50]) },
    { id: 'ame_demon',  name: 'L\'Âme du Démon',icon: '😈', ...tierify(demonCount, [1, 10, 25]) },
    { id: 'difficile',  name: 'Le Difficile',   icon: '📉', ...tierify(hardCount, [1, 5, 10]) },
    { id: 'bon_public', name: 'Le Bon Public',  icon: '📈', ...tierify(crowdPleaserCount, [1, 5, 10]) },
    { id: 'coup_foudre',name: 'Coup de Foudre', icon: '❤️', ...tierify(likedCount, [5, 25, 50]) },
    { id: 'puriste',    name: 'Le Puriste',     icon: '🎭', ...tierify(purestMax, [20, 50, 100]) },
  ];

  // Noms "flavor" repris du document quand ils existent pour ce genre
  // précis ; repli générique "Fan de X" sinon — un genre exploré mais non
  // listé dans le document (ex: "Fantastique" seul, sans le "Dark" de
  // "Chasseur de Démons") reste un badge normal, pas un badge absent.
  const GENRE_FLAVOR_NAMES = {
    'Horreur': 'Livre des Morts', 'Comédie': 'Rire en Boîte',
    'Science-Fiction': 'Sabres & Lasers', 'Drame': 'Départ Soudain',
    'Animation': 'Otaku', 'Romance': 'Le Romantique',
    'Aventure': 'Cape et Épée', 'Documentaire': 'Documentaliste',
    'Musique': 'Symphonie', 'Western': 'Westerner',
  };
  const genreBadges = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // les 8 genres les plus regardés seulement, pour ne pas surcharger la grille
    .map(([genre, count]) => ({
      id: 'genre_' + genre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_'),
      name: GENRE_FLAVOR_NAMES[genre] || `Fan de ${genre}`,
      icon: '🎞️',
      ...tierify(count, [5, 50, 100]),
    }));

  return defs.concat(genreBadges);
}

// ─── Compatibilité Node (tests) sans rien changer au comportement navigateur ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeQuickScore,
    computeWeightedScore,
    computeShowAverageScore,
    scoreToStars,
    getStarStr,
    historyItemKey,
    watchlistItemKey,
    tvShowItemKey,
    mergeTombstoneLists,
    mergeHistory,
    mergeWatchlist,
    mergeTvShows,
    TOMBSTONE_MAX_AGE_MS,
    getDesc,
    DESCS,
    DESCS_TV_OVERRIDES,
    computeCriteriaAverages,
    formatWatchTime,
    getISOWeekKey,
    computeWeekStreak,
    computeDayStreak,
    tierify,
    computeBadges,
    computeWrappedStats,
    computeEloUpdate,
    parseCsv,
    mapLetterboxdCsv,
    computeDailyCounts,
    computeDecadeStats,
    findOneYearAgoFilm,
    normalizeHistoryItemV2,
  };
}

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
const searchClearBtn = document.getElementById('search-clear-btn');
let searchTimer;

// Bouton d'effacement : visible dès qu'il y a du texte, évite d'avoir à
// tout effacer au clavier pour relancer une recherche. Redéclenche
// l'événement 'input' plutôt que de dupliquer sa logique (masquage des
// suggestions, sauvegarde du brouillon) — une seule source de vérité.
searchEl.addEventListener('input', () => {
  searchClearBtn.style.display = searchEl.value ? 'flex' : 'none';
});
searchClearBtn.addEventListener('click', () => {
  searchEl.value = '';
  searchEl.dispatchEvent(new Event('input'));
  searchEl.focus();
});

// Recherche une PERSONNE (réalisateur/acteur/etc.) correspondant au texte
// tapé — partagée entre la recherche du formulaire de notation et celle de la
// watchlist. Retourne null si rien de pertinent, plutôt que le premier
// résultat TMDb quel qu'il soit (évite de proposer une correspondance
// approximative sans rapport avec ce qui a été tapé).
async function fetchPersonMatch(q) {
  try {
    const res = await fetch(`/api/search?personSearch=${encodeURIComponent(q)}`);
    const data = await res.json();
    const person = (data.results || [])[0];
    if (!person) return null;
    const qNorm = q.trim().toLowerCase();
    const nameNorm = (person.name || '').toLowerCase();
    return nameNorm.includes(qNorm) ? person : null;
  } catch { return null; }
}

function buildPersonSuggestionEl(person) {
  const photoUrl = tmdbImage(person.profile_path, 'w92');
  const item = document.createElement('div');
  item.className = 'suggestion-item suggestion-person';
  const imgHtml = photoUrl
    ? `<img class="suggestion-poster" style="border-radius:50%;object-fit:cover;" src="${photoUrl}" alt="Photo de ${escAttr(person.name)}" loading="lazy">`
    : `<div class="suggestion-poster-placeholder">${ICONS.clapper}</div>`;
  item.innerHTML = `${imgHtml}<div class="suggestion-info"><div class="suggestion-title">🎬 ${escAttr(person.name)}</div><div class="suggestion-year">Voir sa filmographie</div></div>`;
  item.addEventListener('click', () => {
    suggestEl.style.display = 'none';
    openPersonDetailSheet(person.id, person.name);
  });
  return item;
}

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
    const [res, personMatch] = await Promise.all([
      fetch(`/api/search?query=${encodeURIComponent(q)}`),
      fetchPersonMatch(q),
    ]);
    // readApiJson lève si l'API a réellement échoué (statut non-200), au lieu
    // de laisser passer une réponse d'erreur comme si c'était "0 résultat" —
    // c'est ce qui rendait un vrai problème d'API totalement invisible.
    const data = await readApiJson(res);
    searchStatus.style.display = 'none';
    if (!data.results?.length && !personMatch) { suggestEl.style.display = 'none'; return; }
    suggestEl.innerHTML = '';
    suggestEl.style.display = 'block';

    // Le réalisateur/acteur trouvé (s'il y en a un) apparaît en premier — on
    // tapait probablement un nom, pas un titre de film, dans ce cas.
    if (personMatch) suggestEl.appendChild(buildPersonSuggestionEl(personMatch));

    (data.results || []).slice(0, 6).forEach(m => {
      const year = m.release_date?.slice(0, 4) || '????';
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      const imgHtml = m.poster_path
        ? `<img class="suggestion-poster" src="${tmdbImage(m.poster_path, 'w92')}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">`
        : `<div class="suggestion-poster-placeholder">${ICONS.clapper}</div>`;
      item.innerHTML = `${imgHtml}<div class="suggestion-info"><div class="suggestion-title">${escAttr(m.title)}</div><div class="suggestion-year">${year}</div></div>`;
      item.addEventListener('click', () => selectMovie(m, year));
      suggestEl.appendChild(item);
    });
    const manualItem = document.createElement('div');
    manualItem.className = 'suggestion-item suggestion-manual';
    manualItem.innerHTML = `<div class="suggestion-poster-placeholder" style="font-size:1rem;">${ICONS.edit}</div><div class="suggestion-info"><div class="suggestion-title" style="color:var(--text-mid);">Utiliser "${q}" sans TMDb</div><div class="suggestion-year">Saisie manuelle</div></div>`;
    manualItem.addEventListener('click', () => { suggestEl.style.display = 'none'; selectManual(q); });
    suggestEl.appendChild(manualItem);
  } catch (err) { 
    searchStatus.style.display = 'none'; 
    suggestEl.style.display = 'none'; 
    showToast(describeApiFailure(err));
  }
}

async function selectMovie(m, year) {
  document.getElementById('movie-title').value  = m.title;
  document.getElementById('movie-year').value   = year;
  document.getElementById('movie-poster').value = tmdbImage(m.poster_path, 'w185');
  document.getElementById('movie-tmdb-id').value = m.id;
  searchEl.value = `${escAttr(m.title)} (${year})`;
  suggestEl.style.display = 'none';
  document.getElementById('strip-ratings').style.display = 'none';

  searchStatus.style.display = 'block';
  searchStatus.textContent = '⏳ Récupération des détails...';
  isFetchingMovie = true;

  try {
    const res = await fetch(`/api/search?id=${m.id}`);
    const data = await res.json();

    const genreNames = data.genres?.map(g => g.name) || [];
    const genres = genreNames.join(', ');
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

    const settings = JSON.parse(localStorage.getItem('lbx_settings') || '{}');
    if (settings.genreWeightsEnabled !== false) {
      suggestGenreWeights(genreNames);
    }

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
    document.getElementById('strip-poster').src = tmdbImage(m.poster_path, 'w92');
    document.getElementById('strip-poster').alt = `Affiche de ${escAttr(m.title)}`;
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
  hapticPulse(document.getElementById('heart-btn'), 'medium');
  isLiked = !isLiked;
  document.getElementById('heart-btn').classList.toggle('active', isLiked);
  document.getElementById('heart-btn').setAttribute('aria-pressed', String(isLiked));
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

// Glisser le doigt/la souris sur les étoiles les remplit progressivement, au
// lieu de devoir taper précisément sur chacune — plus fluide et satisfaisant,
// surtout au tap initial où on peut directement glisser jusqu'à la bonne
// valeur sans relâcher. S'appuie sur elementFromPoint (pas un calcul de
// position manuel) : robuste face à la mise en page row-reverse et à toute
// variation de tailles/espacements entre thèmes.
(function initStarDrag() {
  const container = document.getElementById('quick-stars-container');
  if (!container) return;
  let dragging = false;

  function selectLabelAt(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const label = el && el.closest('#quick-stars-container label');
    if (!label || !label.htmlFor) return;
    const radio = document.getElementById(label.htmlFor);
    if (radio && !radio.checked) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  container.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    dragging = true;
    const t = e.touches[0];
    selectLabelAt(t.clientX, t.clientY);
  }, { passive: true });
  container.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    e.stopPropagation();
    const t = e.touches[0];
    selectLabelAt(t.clientX, t.clientY);
  }, { passive: true });
  container.addEventListener('touchend', () => { dragging = false; });
  container.addEventListener('touchcancel', () => { dragging = false; });

  // Souris (pratique pour tester sur desktop / vercel dev)
  container.addEventListener('mousedown', (e) => { dragging = true; selectLabelAt(e.clientX, e.clientY); });
  document.addEventListener('mousemove', (e) => { if (dragging) selectLabelAt(e.clientX, e.clientY); });
  document.addEventListener('mouseup', () => { dragging = false; });
})();

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
  document.getElementById('weights-toggle-chevron').style.transform = weightsOpen ? 'rotate(90deg)' : '';
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
  document.getElementById('genre-weight-suggest').style.display = 'none';
}

function updateWeightBadges() {
  const w = getWeights();
  CRITERIA.forEach(c => {
    document.getElementById(`wb-${c}`).textContent = `×${w[c]}`;
  });
}

CRITERIA.forEach(c => {
  const el = document.getElementById(`w-${c}`);
  if (el) el.addEventListener('input', () => {
    updateWeightBadges();
    calculateScore();
    document.getElementById('genre-weight-suggest').style.display = 'none'; // l'utilisateur personnalise -> on n'insiste plus
  });
});

// ─── Pondérations suggérées selon le genre du film ──────────────────────────
// Certains critères comptent naturellement plus selon le genre (l'ambiance
// sonore pour un film d'horreur, le jeu d'acteur pour un drame...). On propose
// un préréglage adapté, sans jamais écraser silencieusement une personnalisation :
// - si les poids sont encore à leur valeur par défaut (×1 partout), on l'applique direct ;
// - sinon, on affiche juste un bouton pour l'appliquer à la demande.
const GENRE_WEIGHT_PRESETS = {
  'Horreur':         { scenario: 1,    realisation: 1,    photo: 1,    acteurs: 1,    ambiance: 2,    rythme: 1.5,  affect: 1 },
  'Musique':         { scenario: 1,    realisation: 1,    photo: 1,    acteurs: 1.25, ambiance: 2,    rythme: 1,    affect: 1 },
  'Romance':         { scenario: 1,    realisation: 1,    photo: 1,    acteurs: 1.5,  ambiance: 1,    rythme: 0.75, affect: 2 },
  'Documentaire':    { scenario: 1.5,  realisation: 1,    photo: 1,    acteurs: 0.5,  ambiance: 0.75, rythme: 1,    affect: 0.75 },
  'Animation':       { scenario: 1.25, realisation: 1.25, photo: 1.5,  acteurs: 0.75, ambiance: 1,    rythme: 1,    affect: 1 },
  'Science-Fiction': { scenario: 1.5,  realisation: 1.25, photo: 1.5,  acteurs: 1,    ambiance: 1,    rythme: 1,    affect: 1 },
  'Fantastique':     { scenario: 1.25, realisation: 1.25, photo: 1.5,  acteurs: 1,    ambiance: 1.25, rythme: 1,    affect: 1 },
  'Guerre':          { scenario: 1.25, realisation: 1.25, photo: 1,    acteurs: 1.25, ambiance: 1,    rythme: 1,    affect: 1.5 },
  'Thriller':        { scenario: 1.25, realisation: 1.25, photo: 1,    acteurs: 1,    ambiance: 1.25, rythme: 1.5,  affect: 1 },
  'Drame':           { scenario: 1.5,  realisation: 1,    photo: 1,    acteurs: 1.5,  ambiance: 1,    rythme: 1,    affect: 1.5 },
  'Comédie':         { scenario: 1.25, realisation: 1,    photo: 0.75, acteurs: 1.5,  ambiance: 1,    rythme: 1,    affect: 1.5 },
  'Action':          { scenario: 0.75, realisation: 1.25, photo: 1.5,  acteurs: 1,    ambiance: 1,    rythme: 1.5,  affect: 1 },
};
// Ordre de priorité si un film a plusieurs genres correspondants : les genres
// les plus "définissants" d'abord (un film peut être à la fois Action et
// Comédie, mais un genre comme Horreur ou Musique oriente plus fortement
// l'appréciation qu'Action, souvent secondaire).
const GENRE_PRIORITY = ['Horreur','Musique','Romance','Documentaire','Animation','Science-Fiction','Fantastique','Guerre','Thriller','Drame','Comédie','Action'];

let pendingGenrePreset = null; // { name, weights } en attente si l'utilisateur a déjà personnalisé

function weightsAreDefault() {
  return CRITERIA.every(c => parseFloat(document.getElementById(`w-${c}`).value) === 1);
}

function applyWeightPreset(weights) {
  CRITERIA.forEach(c => {
    const el = document.getElementById(`w-${c}`);
    if (el && weights[c] !== undefined) el.value = weights[c];
  });
  updateWeightBadges();
  calculateScore();
}

function pickGenrePreset(genreNames) {
  if (!genreNames || !genreNames.length) return null;
  for (const g of GENRE_PRIORITY) {
    if (genreNames.includes(g) && GENRE_WEIGHT_PRESETS[g]) {
      return { name: g, weights: GENRE_WEIGHT_PRESETS[g] };
    }
  }
  return null;
}

// Appelée après la sélection d'un film (une fois son genre connu depuis TMDb).
function suggestGenreWeights(genreNames) {
  const suggestBtn = document.getElementById('genre-weight-suggest');
  const match = pickGenrePreset(genreNames);
  if (!match) { suggestBtn.style.display = 'none'; pendingGenrePreset = null; return; }

  if (weightsAreDefault()) {
    applyWeightPreset(match.weights);
    showToast(`Pondérations ajustées pour le genre "${match.name}" 🎯`);
    suggestBtn.style.display = 'none';
    pendingGenrePreset = null;
  } else {
    // L'utilisateur a déjà personnalisé : on ne touche à rien, mais on propose.
    pendingGenrePreset = match;
    suggestBtn.textContent = `🎯 Suggestion "${escAttr(match.name)}"`;
    suggestBtn.style.display = 'inline-flex';
  }
}

document.getElementById('genre-weight-suggest').addEventListener('click', () => {
  if (!pendingGenrePreset) return;
  applyWeightPreset(pendingGenrePreset.weights);
  showToast(`Pondérations ajustées pour le genre "${pendingGenrePreset.name}" 🎯`);
  document.getElementById('genre-weight-suggest').style.display = 'none';
  pendingGenrePreset = null;
});

// ═══════════════════════════════════════════
//  SCORE CALCULATION
// ═══════════════════════════════════════════
// Le calcul du score lui-même (computeQuickScore / computeWeightedScore /
// scoreToStars / getStarStr) vit dans 03b-pure-logic.js, pour pouvoir être
// testé automatiquement sans DOM. Cette fonction-ci reste la fine couche qui
// lit les sliders et écrit le résultat à l'écran.
// Anime le score vers sa nouvelle valeur à chaque ajustement, plutôt qu'un
// changement de chiffre instantané. Contrairement à animateCountUp() (utilisée
// une fois par affichage pour les KPI du dashboard), celle-ci part de la
// valeur ACTUELLEMENT affichée (pas de 0) et s'annule/relance proprement si
// une nouvelle valeur arrive avant la fin — indispensable ici car un
// glissement de slider déclenche beaucoup de mises à jour rapprochées.
function animateValueTowards(el, endValue, decimals = 1, duration = 200) {
  const startValue = parseFloat(el.textContent) || 0;
  if (Math.abs(endValue - startValue) < 0.01) {
    el.textContent = endValue.toFixed(decimals);
    return;
  }
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    el.textContent = endValue.toFixed(decimals);
    return;
  }
  if (el._scoreAnimId) cancelAnimationFrame(el._scoreAnimId);
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 2); // ease-out quad : plus vif que l'ease-out cubic des KPI
    el.textContent = (startValue + (endValue - startValue) * eased).toFixed(decimals);
    if (progress < 1) {
      el._scoreAnimId = requestAnimationFrame(step);
    } else {
      el.textContent = endValue.toFixed(decimals);
      el._scoreAnimId = null;
    }
  }
  el._scoreAnimId = requestAnimationFrame(step);
}

function calculateScore() {
  let score;

  if (currentMode === 'quick') {
    score = computeQuickScore(quickRating);
  } else {
    const w = getWeights();
    const criteriaValues = {};
    CRITERIA.forEach(c => {
      const val = parseFloat(document.getElementById(c).value);
      criteriaValues[c] = val;
      document.getElementById(`val-${c}`).textContent = val.toFixed(1);
      const descEl = document.getElementById(`desc-${c}`);
      descEl.textContent = getDesc(c, val, currentMediaType);
      // Repli progressif : le texte descriptif ne s'affiche qu'une fois qu'on
      // s'est écarté de la valeur neutre par défaut (5), pour ne pas noyer le
      // formulaire sous 7 blocs de texte dès l'ouverture d'une fiche vierge.
      descEl.classList.toggle('revealed', val !== 5);
    });
    score = computeWeightedScore(criteriaValues, w);
  }

  const scoreEl = document.getElementById('score-big');
  const denomEl = document.querySelector('.score-denom');
  const ringFillEl = document.getElementById('score-ring-fill');

  animateValueTowards(scoreEl, score, 1, 200);
  denomEl.textContent = '/10';
  const scoreClass = score >= 7.5 ? 'good' : score >= 5.0 ? 'mid' : 'bad';
  scoreEl.className = 'score-big ' + scoreClass;
  // Anneau : même circonférence que celle posée dans styles.css
  // (2π×52 ≈ 326.7) — decalée proportionnellement à score/10, remplie dans
  // le sens horaire grâce à la rotation -90deg posée sur le <svg> lui-même.
  if (ringFillEl) {
    const RING_CIRCUMFERENCE = 326.7;
    ringFillEl.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - score / 10));
    ringFillEl.setAttribute('class', 'score-ring-fill ' + scoreClass);
  }

  const stars = scoreToStars(score);
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

// Positionne le repère de moyenne perso sur chaque slider (voir CSS
// .criterion-avg-marker). Calculé une fois depuis l'historique existant : la
// moyenne "passée" ne change pas pendant qu'on note le film en cours, pas
// besoin de la recalculer à chaque glissement de curseur.
function renderCriteriaAverageMarkers() {
  const avgs = computeCriteriaAverages(loadHistory(), CRITERIA);
  CRITERIA.forEach(c => {
    const marker = document.getElementById(`avg-marker-${c}`);
    if (!marker) return;
    const avg = avgs[c];
    if (avg === null) {
      marker.style.display = 'none';
      return;
    }
    marker.style.left = `${(avg / 10) * 100}%`;
    marker.title = `Ta moyenne habituelle sur ce critère : ${avg.toFixed(1)}`;
    marker.style.display = 'block';
  });
}

CRITERIA.forEach(c => {
  document.getElementById(c).addEventListener('input', () => {
    updateSliderPct(document.getElementById(c));
    calculateScore();
    saveDraft();
    // Un input[type=range] avec un `step` ne déclenche 'input' qu'une fois la
    // valeur quantifiée (donc déjà une fois par graduation de 0.5) : une petite
    // vibration ici suffit à donner un vrai "cranté" tactile au glissement,
    // sans logique supplémentaire de détection de palier.
    if (navigator.vibrate) navigator.vibrate(8);
    // Pulse sur le chiffre affiché (pas le curseur lui-même, pour ne pas
    // interférer avec sa propre transform native pendant le glissement).
    hapticPulse(document.getElementById(`val-${c}`), 'light');
  });
});

// Boutons ± à côté de chaque slider : plus précis qu'un glissé du doigt pour
// viser une valeur exacte sur mobile. Un seul gestionnaire délégué pour les
// 14 boutons (7 critères × 2), via les attributs data-target/data-step.
document.querySelectorAll('.criterion-step-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const slider = document.getElementById(btn.dataset.target);
    const step = parseFloat(btn.dataset.step);
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const next = Math.min(max, Math.max(min, parseFloat(slider.value) + step));
    slider.value = next;
    // Un événement 'input' synthétique réutilise exactement la même logique
    // que le glissement manuel (recalcul du score, sauvegarde du brouillon,
    // vibration), sans dupliquer ce code ici.
    slider.dispatchEvent(new Event('input'));
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
    btn.innerHTML = `${ICONS.check} Copié !`;
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = `${ICONS.copy} Texte`; btn.classList.remove('copied'); }, 2000);
    showToast('Critique copiée dans le presse-papier');
  });
});

// ═══════════════════════════════════════════
//  SAVE
// ═══════════════════════════════════════════
// Animation de validation façon "clap de cinéma" à chaque critique
// enregistrée : renforce le sentiment d'accomplissement (micro-interaction),
// sans bloquer l'interface (pointer-events: none, se retire toute seule).
function playSaveConfirmation() {
  const overlay = document.createElement('div');
  overlay.className = 'save-confirm-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="save-confirm-ticket">
      <div class="save-confirm-ticket-half save-confirm-ticket-left">${ICONS.clapper}</div>
      <div class="save-confirm-ticket-perf"></div>
      <div class="save-confirm-ticket-half save-confirm-ticket-right">✓</div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (navigator.vibrate) navigator.vibrate([12, 25, 12]);
  setTimeout(() => overlay.remove(), 850);
}

document.getElementById('save-btn').addEventListener('click', () => {
  if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  hapticPulse(document.getElementById('save-btn'), 'strong');

  if (currentMediaType === 'tv') {
    saveTvSeasonRating();
    return;
  }

  const title = document.getElementById('movie-title').value.trim() || searchEl.value.trim();
  if (!title) { showToast('Entrez un titre de film avant de sauvegarder.'); return; }

  const history  = loadHistory();
  const existing = history.find(h => h.title.toLowerCase() === title.toLowerCase());
  const score    = calculateScore();

  // Ludex 2.0 : réutilise l'animation stampImpact (déjà en place sur le
  // tampon TMDb de la fiche film) sur le score héros, au moment précis de
  // la validation — retire puis réapplique la classe (avec un reflow forcé
  // entre les deux) pour qu'elle puisse aussi rejouer sur une sauvegarde
  // suivante dans la même session, pas juste la toute première.
  const scoreMainEl = document.getElementById('score-big')?.closest('.score-main');
  if (scoreMainEl) {
    scoreMainEl.classList.remove('stamp-pulse');
    void scoreMainEl.offsetWidth; // force le reflow entre le retrait et la réapplication
    scoreMainEl.classList.add('stamp-pulse');
  }

  const movie = {
    title,
    year:       document.getElementById('movie-year').value,
    poster:     document.getElementById('movie-poster').value,
    genre:      document.getElementById('movie-genre').value,
    runtime:    document.getElementById('movie-runtime').value,
    director:   document.getElementById('movie-director').value,
    actors:     document.getElementById('movie-actors').value, 
    tmdbScore:  document.getElementById('movie-tmdb-score').value || null,
    tmdbId:     document.getElementById('movie-tmdb-id').value || null,
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
        window._justSavedHistoryTitle = title.toLowerCase();
        renderAll();
        showToast(`"${title}" mis à jour`);
        playSaveConfirmation();
      }
    );
  } else {
    history.unshift(movie);
    saveHistory(history);
    localStorage.removeItem('lbx_draft'); 
    resetForm();
    window._justSavedHistoryTitle = title.toLowerCase();
    renderAll();
    showToast(`"${title}" enregistré`);
    playSaveConfirmation();
    const saveBtn = document.getElementById('save-btn');
    const origSave = saveBtn.innerHTML;
    saveBtn.innerHTML = `${ICONS.check} Sauvé !`;
    saveBtn.style.background = 'var(--green)';
    saveBtn.style.color = '#0d1117';
    setTimeout(() => { saveBtn.innerHTML = origSave; saveBtn.style.background = ''; saveBtn.style.color = ''; }, 1800);
  }
});

function resetForm() {
  searchEl.value = '';
  setTodayDate(); // remet la date à aujourd'hui — sinon elle restait bloquée sur la dernière date utilisée
  document.getElementById('movie-title').value     = '';
  document.getElementById('movie-year').value      = '';
  document.getElementById('movie-poster').value    = '';
  document.getElementById('movie-genre').value     = '';
  document.getElementById('movie-runtime').value   = '';
  document.getElementById('movie-director').value  = '';
  document.getElementById('movie-actors').value    = '';
  document.getElementById('movie-tmdb-score').value = '';
  document.getElementById('movie-tmdb-id').value = '';
  document.getElementById('review-text').value     = '';
  document.getElementById('strip-ratings').style.display = 'none';
  document.getElementById('film-strip').classList.remove('visible');
  
  isLiked = false;
  document.getElementById('heart-btn').classList.remove('active');
  document.getElementById('heart-btn').setAttribute('aria-pressed', 'false');
  setTodayDate();
  
  activeContextTags.clear();
  document.querySelectorAll('.ctx-tag').forEach(b => b.classList.remove('active'));

  CRITERIA.forEach(c => { document.getElementById(c).value = 5; });
  quickRating = 2.5;
  const defaultRadio = document.getElementById('s5'); 
  if(defaultRadio) defaultRadio.checked = true;
  
  setMode('detail'); 
  updateAllSliders();
  renderCriteriaAverageMarkers();
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
  document.getElementById('movie-tmdb-id').value  = item.tmdbId || '';
  document.getElementById('movie-tmdb-score').value = item.tmdbScore || '';
  
  searchEl.value = item.title;
  document.getElementById('view-date').value     = item.date  || '';
  document.getElementById('review-text').value   = item.review || '';
  isLiked = item.liked || false;
  document.getElementById('heart-btn').classList.toggle('active', isLiked);
  document.getElementById('heart-btn').setAttribute('aria-pressed', String(isLiked));

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

  if (item.tmdbScore) {
    document.getElementById('strip-tmdb-score').textContent = item.tmdbScore + '/10';
  } else {
    document.getElementById('strip-tmdb-score').textContent = '—';
  }

  if (item.poster) {
    document.getElementById('strip-poster').src = item.poster;
    document.getElementById('strip-poster').alt = item.title ? `Affiche de ${escAttr(item.title)}` : '';
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
  renderCriteriaAverageMarkers();
  saveDraft(); 
  
  if (window.innerWidth <= 860) switchMobileNav('rating');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ═══════════════════════════════════════════
//  MODE FOCUS (un critère à la fois)
// ═══════════════════════════════════════════
// Alternative à la liste empilée : n'affiche qu'un critère à la fois, avec
// navigation dédiée (boutons ‹ › ou swipe). Le score, les descriptions, le
// repère de moyenne perso et la piste colorée continuent de fonctionner
// normalement — seule la mise en page (quel bloc est visible) change.
const FOCUS_MODE_KEY = 'lbx_focus_mode';
// Ludex 2.0 : mode focus activé PAR DÉFAUT désormais (auparavant décoché par
// défaut) — la liste empilée devient l'option de repli plutôt que l'inverse.
// `!== 'false'` plutôt que `=== 'true'` : un utilisateur n'ayant jamais
// touché ce réglage (localStorage vide, donc `null`) doit démarrer en mode
// focus ; seul un choix explicite enregistré comme 'false' désactive.
let focusModeOn = localStorage.getItem(FOCUS_MODE_KEY) !== 'false';
let focusIndex = 0;

const criteriaListEl = document.getElementById('criteria-list');
const focusModeToggle = document.getElementById('focus-mode-toggle');
const focusNavEl = document.getElementById('focus-nav');
const focusPrevBtn = document.getElementById('focus-prev-btn');
const focusNextBtn = document.getElementById('focus-next-btn');
const focusProgressEl = document.getElementById('focus-progress');

function renderFocusStep() {
  CRITERIA.forEach((c, i) => {
    const block = document.getElementById(c).closest('.criterion-block');
    if (block) block.classList.toggle('focus-active', i === focusIndex);
  });
  focusProgressEl.textContent = `${focusIndex + 1} / ${CRITERIA.length}`;
  focusPrevBtn.disabled = focusIndex === 0;
  focusNextBtn.disabled = focusIndex === CRITERIA.length - 1;
}

function applyFocusMode() {
  criteriaListEl.classList.toggle('focus-mode', focusModeOn);
  focusNavEl.style.display = focusModeOn ? 'flex' : 'none';
  focusModeToggle.classList.toggle('active', focusModeOn);
  focusModeToggle.setAttribute('aria-pressed', String(focusModeOn));
  if (focusModeOn) renderFocusStep();
}

function goToFocusStep(newIndex) {
  if (newIndex < 0 || newIndex >= CRITERIA.length || newIndex === focusIndex) return;
  focusIndex = newIndex;
  renderFocusStep();
  if (navigator.vibrate) navigator.vibrate(10);
  hapticPulse(document.getElementById('focus-progress'), 'light');
}

focusModeToggle.addEventListener('click', () => {
  focusModeOn = !focusModeOn;
  localStorage.setItem(FOCUS_MODE_KEY, String(focusModeOn));
  focusIndex = 0;
  applyFocusMode();
});

focusPrevBtn.addEventListener('click', () => goToFocusStep(focusIndex - 1));
focusNextBtn.addEventListener('click', () => goToFocusStep(focusIndex + 1));

// Swipe gauche/droite pour naviguer entre critères, actif seulement en mode
// focus. stopPropagation() empêche ce geste de déclencher AUSSI le swipe
// global de changement d'onglet mobile (voir 01-navigation.js).
(function initFocusSwipe() {
  const SWIPE_MIN_DISTANCE = 40;
  const SWIPE_ANGLE_RATIO = 1.3;
  let startX = 0, startY = 0, tracking = false;

  criteriaListEl.addEventListener('touchstart', e => {
    if (!focusModeOn) { tracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  criteriaListEl.addEventListener('touchend', e => {
    if (!tracking || !focusModeOn) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_ANGLE_RATIO) return;
    e.stopPropagation();
    if (dx < 0) goToFocusStep(focusIndex + 1); // gauche -> critère suivant
    else goToFocusStep(focusIndex - 1);         // droite -> critère précédent
  });
})();

applyFocusMode(); // état initial au chargement, selon la préférence sauvegardée

// ═══════════════════════════════════════════
//  HISTORIQUE — liste, recherche, tri, filtre par genre
// ═══════════════════════════════════════════
// Issu du découpage de l'ancien 06-history.js (1698 lignes, 6
// responsabilités mêlées) — ce fichier ne couvre que le rendu de la
// LISTE elle-même : recherche, tri, filtre par genre, l'indice de
// glissement au premier chargement. Les actions (feuille d'action,
// toast) vivent dans 06b-history-actions.js ; les statistiques du
// Profil et les cartes à partager dans 06c/06d.

// Ludex 2.0 : la composition "entrée vedette + liste groupée par mois" est
// spécifique au thème par défaut (voir "Vers Ludex 2.0" §01 — les 6 autres
// thèmes gardent leur liste de cartes intacte). isDefaultComposition() vit
// désormais dans 03-foundation.js (partagée avec la watchlist).

const MONTH_LABELS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
// item.date / item.savedAt sont des chaînes ISO (YYYY-MM-DD...) — on prend
// les 7 premiers caractères comme clé de regroupement (année-mois), sans
// dépendre d'un format plus permissif que ce que loadHistory() garantit déjà.
function monthKeyOf(item) {
  const raw = item.date || item.savedAt || '';
  return raw.slice(0, 7); // "YYYY-MM"
}
function monthLabelOf(key) {
  const [y, m] = key.split('-');
  const idx = parseInt(m, 10) - 1;
  if (!y || idx < 0 || idx > 11) return 'Date inconnue';
  return `${MONTH_LABELS_FR[idx]} ${y}`;
}

// Entrée vedette : le film le plus récemment noté, en grand, au-dessus de la
// liste — alimentée par la même donnée que la liste (aucun calcul dupliqué).
// N'apparaît qu'en tri chronologique (sortOrder === 'date'), seul contexte où
// "le plus récent" a un sens pour l'utilisateur.
function renderHistoryHero(sorted) {
  const hero = document.getElementById('history-hero');
  if (!hero) return;
  if (!isDefaultComposition() || sortOrder !== 'date' || sorted.length === 0) {
    hero.innerHTML = '';
    return;
  }
  const item = sorted[0];
  const imgHtml = item.poster
    ? `<img class="hero-entry-poster" src="${item.poster}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" decoding="async">`
    : `<div class="hero-entry-poster"></div>`;
  hero.innerHTML = `
    <div class="hero-entry">
      ${imgHtml}
      <div class="hero-entry-body">
        <div class="hero-entry-eyebrow">Dernier film noté</div>
        <div class="hero-entry-title">${escAttr(item.title)}</div>
        <div class="hero-entry-score">${item.score}<small>/10</small></div>
      </div>
    </div>`;
}

let histSearchTimer;
// Dispatche vers le bon rendu selon la bascule Films/Séries — un seul
// point d'entrée pour les 3 déclencheurs (recherche, filtres de tri,
// bascule elle-même) plutôt que de dupliquer la condition partout.
function renderActiveHistoryView() {
  if (historyMediaFilter === 'tv') { if (typeof renderTvHistory === 'function') renderTvHistory(); }
  else renderHistory();
}
const historySearchEl = document.getElementById('history-search');
const historySearchClearBtn = document.getElementById('history-search-clear-btn');
historySearchEl.addEventListener('input', (e) => {
  historySearchQuery = e.target.value.toLowerCase();
  historySearchClearBtn.style.display = e.target.value ? 'flex' : 'none';
  clearTimeout(histSearchTimer);
  histSearchTimer = setTimeout(renderActiveHistoryView, 150);
});
historySearchClearBtn.addEventListener('click', () => {
  historySearchEl.value = '';
  historySearchEl.dispatchEvent(new Event('input'));
  historySearchEl.focus();
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

function renderGenreChips(items, onFilterChange = renderHistory) {
  const genres = getGenres(items);
  const row    = document.getElementById('genre-fold');
  const chips  = document.getElementById('genre-chips');
  const currentLabel = document.getElementById('genre-fold-current');

  if (genres.length === 0) { row.style.display = 'none'; return; }
  row.style.display = 'block';
  // Le genre actif reste lisible plié : c'est ce qui rend le pliage acceptable
  // (l'état du filtre n'est jamais caché, seule la liste des options l'est).
  if (currentLabel) currentLabel.textContent = activeGenre || 'Tous';
  chips.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'genre-chip all-chip' + (activeGenre === null ? ' active' : '');
  allChip.textContent = 'Tous';
  allChip.addEventListener('click', () => { activeGenre = null; activeScoreFilter = null; renderGenreChips(items, onFilterChange); onFilterChange(); });
  chips.appendChild(allChip);

  genres.forEach(g => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip' + (activeGenre === g ? ' active' : '');
    chip.textContent = g;
    chip.addEventListener('click', () => {
      activeGenre = (activeGenre === g) ? null : g;
      renderGenreChips(items, onFilterChange);
      onFilterChange();
    });
    chips.appendChild(chip);
  });
}

// Tranches de note partagées entre films et séries (histogramme, filtre par
// clic sur une barre) — extrait ici pour ne pas dupliquer cette table.
const SCORE_RANGES = {
  '50': [9,10], '45': [8.5,9], '40': [7.5,8.5], '35': [6.5,7.5], '30': [5.5,6.5],
  '25': [4.5,5.5], '20': [3.5,4.5], '15': [2.5,3.5], '10': [1.5,2.5], '05': [0,1.5]
};
function isScoreInActiveRange(score) {
  if (activeScoreFilter === null) return true;
  const [lo, hi] = SCORE_RANGES[activeScoreFilter] || [0, 10];
  const s = parseFloat(score);
  return s >= lo && (activeScoreFilter === '50' ? s <= hi : s < hi);
}

function getSorted(history) {
  let h = history;

  if (activeGenre) {
    h = h.filter(item => item.genre && item.genre.split(',').map(g => g.trim()).includes(activeGenre));
  }

  if (activeScoreFilter !== null) {
    h = h.filter(item => isScoreInActiveRange(item.score));
  }

  // Ludex 2.0 : filtre "Coups de cœur" — réutilise item.liked, déjà posé par
  // le cœur du formulaire Noter (voir 05-rating-form.js), aucune nouvelle
  // donnée à créer.
  if (activeLikedFilter) {
    h = h.filter(item => item.liked);
  }

  if (historySearchQuery) {
    // Une requête à 4 chiffres (ex: "1994") matche aussi l'année du film, et
    // "199" les années 1990-1999 : la recherche sert ainsi de filtre par
    // année/décennie sans UI supplémentaire — combinable avec les puces de
    // genre et le filtre de note comme le reste.
    const isYearQuery = /^\d{3,4}$/.test(historySearchQuery.trim());
    h = h.filter(item => {
      const titleMatch = item.title && item.title.toLowerCase().includes(historySearchQuery);
      const dirMatch = item.director && item.director.toLowerCase().includes(historySearchQuery);
      const actMatch = item.actors && item.actors.toLowerCase().includes(historySearchQuery);
      const yearMatch = isYearQuery && item.year && String(item.year).startsWith(historySearchQuery.trim());
      return titleMatch || dirMatch || actMatch || yearMatch;
    });
  }

  if (sortOrder === 'date') {
    return [...h].sort((a, b) => {
      const dateA = a.date || a.savedAt || "";
      const dateB = b.date || b.savedAt || "";
      return dateB.localeCompare(dateA); 
    });
  }

  if (sortOrder === 'score-desc') return [...h].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  if (sortOrder === 'score-asc')  return [...h].sort((a, b) => parseFloat(a.score) - parseFloat(b.score));
  if (sortOrder === 'title')      return [...h].sort((a, b) => a.title.localeCompare(b.title));
  
  return h; 
}

function renderHistory() {
  // Capture tout geste "armé" AVANT de reconstruire le DOM (voir
  // captureArmedHistoryState/reapplyArmedHistoryState dans initHistoryGestures) —
  // sinon l'état visuel armé disparaîtrait silencieusement sur le nouvel
  // élément si un re-rendu (synchro en arrière-plan, tirer-pour-rafraîchir,
  // une autre suppression confirmée en parallèle...) s'intercale pendant que
  // l'utilisateur attend de confirmer un swipe.
  const capturedArmedState = window.captureArmedHistoryState ? window.captureArmedHistoryState() : null;

  const history   = loadHistory();
  const sorted    = getSorted(history);
  const container = document.getElementById('history-list');

  const badge = document.getElementById('hist-count-badge');
  const showCount = loadTvShows().length;
  const tvFragment = ` \u00b7 ${showCount} s\u00e9rie${showCount > 1 ? 's' : ''}`;
  if (activeGenre || historySearchQuery || activeScoreFilter || activeLikedFilter) {
    badge.textContent = `${sorted.length} / ${history.length} film${history.length > 1 ? 's' : ''}${tvFragment}`;
    badge.style.color = 'var(--orange)';
  } else {
    badge.textContent = history.length + ' film' + (history.length > 1 ? 's' : '') + tvFragment;
    badge.style.color = '';
  }

  renderGenreChips(history);
  document.getElementById('filter-row').style.display = history.length === 0 ? 'none' : '';

  if (history.length === 0) {
    document.getElementById('history-hero').innerHTML = '';
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.clapper}</div>La salle est vide\u2026 Note ton premier film pour lancer la s\u00e9ance !<button type="button" class="empty-state-cta" id="empty-state-history-cta">Rechercher mon premier film</button></div>`;
    window._justSavedHistoryTitle = null;
    return;
  }

  if (sorted.length === 0) {
    document.getElementById('history-hero').innerHTML = '';
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.search}</div>Rien \u00e0 l'affiche sous ce filtre.</div>`;
    window._justSavedHistoryTitle = null;
    return;
  }

  renderHistoryHero(sorted);

  const groupByMonth = isDefaultComposition() && sortOrder === 'date';
  let lastMonthKey = null;
  // Cascade d'entr\u00e9e r\u00e9serv\u00e9e au tout premier affichage R\u00c9EL de l'onglet
  // Historique (pas un rendu d\u00e9clench\u00e9 en arri\u00e8re-plan par renderAll() au
  // d\u00e9marrage pendant qu'un autre onglet est affich\u00e9 \u2014 l'animation serait
  // consomm\u00e9e silencieusement sans jamais \u00eatre vue). M\u00eame principe que
  // renderStats()/statsDirty pour Profil, voir 06c-profile-stats.js.
  const historyViewVisible = document.getElementById('view-history')?.classList.contains('active');
  const cascadeEntrance = groupByMonth && historyViewVisible && !window._historyFirstRenderDone;
  if (groupByMonth && historyViewVisible) window._historyFirstRenderDone = true;

  // Ludex 2.0 : r\u00e9cap mensuel (X films, moyenne) \u2014 calcul\u00e9 une fois sur
  // l'ensemble affich\u00e9 (sorted, donc d\u00e9j\u00e0 pass\u00e9 par les filtres actifs),
  // pas re-parcouru \u00e0 chaque s\u00e9parateur.
  const monthStats = {};
  if (groupByMonth) {
    sorted.forEach(item => {
      const key = monthKeyOf(item);
      const s = (monthStats[key] = monthStats[key] || { count: 0, sum: 0 });
      s.count++;
      s.sum += parseFloat(item.score) || 0;
    });
  }

  container.innerHTML = '';
  let gridEl = null; // conteneur .hist-grid courant \u2014 recr\u00e9\u00e9 \u00e0 chaque nouveau mois
  sorted.forEach((item, i) => {
    const realIdx = history.findIndex(h => h.savedAt === item.savedAt && h.title === item.title);

    if (groupByMonth) {
      const key = monthKeyOf(item);
      if (key !== lastMonthKey) {
        const sep = document.createElement('div');
        sep.className = 'hist-month-sep';
        const stats = monthStats[key];
        const avg = stats.count > 0 ? (stats.sum / stats.count).toFixed(1) : null;
        sep.innerHTML = `<span class="hist-month-label">${escAttr(monthLabelOf(key))}</span><span class="hist-month-recap">${stats.count} film${stats.count > 1 ? 's' : ''}${avg !== null ? ` \u00b7 moy. ${avg}` : ''}</span>`;
        if (cascadeEntrance) sep.classList.add('hist-cascade-in');
        container.appendChild(sep);
        lastMonthKey = key;
        gridEl = document.createElement('div');
        gridEl.className = 'hist-grid';
        container.appendChild(gridEl);
      }
    } else if (!gridEl) {
      // Genre/recherche/coups de c\u0153ur actifs, ou tri diff\u00e9rent de "R\u00e9cents" :
      // pas de s\u00e9parateurs de mois, mais la grille reste \u2014 un seul bloc continu.
      gridEl = document.createElement('div');
      gridEl.className = 'hist-grid';
      container.appendChild(gridEl);
    }

    const scoreNum = parseFloat(item.score);
    let scoreColor = 'var(--red)';
    if (scoreNum >= 7.5) scoreColor = 'var(--green)';
    else if (scoreNum >= 5.0) scoreColor = 'var(--gold)';
    const isHighScore = scoreNum >= 8.5;
    // Ludex 2.0 : traitement "vedette" (2\u00d72, bordure) pour un coup de c\u0153ur
    // OU une note \u2265 8.5 \u2014 les deux crit\u00e8res d\u00e9j\u00e0 utilis\u00e9s c\u00f4t\u00e9 D\u00e9couvrir/
    // Watchlist pour ce m\u00eame genre de mise en avant, gard\u00e9s coh\u00e9rents ici.
    const isFeatured = !!item.liked || isHighScore;

    const div = document.createElement('div');
    div.className = 'hist-item hist-grid-card' + (isFeatured ? ' hist-grid-card-featured' : '');
    div.dataset.idx = realIdx;
    div.dataset.savedAt = item.savedAt || '';
    div.dataset.titleKey = item.title.toLowerCase();
    if (window._justSavedHistoryTitle && item.title.toLowerCase() === window._justSavedHistoryTitle) {
      div.classList.add('hist-item-entering');
    } else if (cascadeEntrance) {
      div.classList.add('hist-cascade-in');
      div.style.animationDelay = `${Math.min(i, 20) * 25}ms`;
    }

    const imgHtml = item.poster
      ? `<img class="hist-grid-poster" src="${item.poster}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=\\'hist-grid-poster-ph\\'>\ud83c\udfac</div>'">`
      : `<div class="hist-grid-poster-ph">${ICONS.clapper}</div>`;

    div.innerHTML = `
      <div class="hist-item-open" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
        ${imgHtml}
      </div>
      <div class="hist-grid-badge" style="color:${scoreColor}">${item.score}</div>
      ${isFeatured ? `<div class="hist-grid-featured-badge">${item.liked ? `${ICONS.heart} Coup de c\u0153ur` : `\u2605 ${item.score}`}</div>` : ''}
      <div class="hist-actions">
        <button class="hist-action-btn" onclick="loadItem(${realIdx})" title="Modifier" aria-label="Modifier ma note pour ${escAttr(item.title)}">${ICONS.edit}</button>
        <button class="hist-action-btn del" onclick="deleteItem(${realIdx}, this)" title="Supprimer" aria-label="Supprimer ${escAttr(item.title)} de l'historique">${ICONS.trash}</button>
      </div>`;
    gridEl.appendChild(div);
    applyPosterAccent(item.poster, div);
  });
  window._justSavedHistoryTitle = null;
  if (window.reapplyArmedHistoryState) window.reapplyArmedHistoryState(capturedArmedState);
}

// ═══════════════════════════════════════════
//  ACTIONS RAPIDES (appui long sur un film de l'historique)
// ═══════════════════════════════════════════

// Reconstruit le même texte partageable que le bouton "Copier" du formulaire,
// mais à partir des données SAUVEGARDÉES d'un film (pas besoin de le charger
// dans le formulaire d'abord). Garde les deux textes strictement identiques.
document.getElementById('filter-row').addEventListener('click', e => {
  // Le bouton "Coups de cœur" est un TOGGLE indépendant du tri (pas de
  // data-sort) — traité à part, sinon la logique générique ci-dessous lui
  // assignerait sortOrder = undefined et retirerait "active" du vrai bouton
  // de tri actuellement sélectionné.
  const likedBtn = e.target.closest('#hist-liked-filter-btn');
  if (likedBtn) {
    activeLikedFilter = !activeLikedFilter;
    likedBtn.classList.toggle('active', activeLikedFilter);
    renderActiveHistoryView();
    return;
  }
  const btn = e.target.closest('.filter-btn[data-sort]');
  if (!btn) return;
  sortOrder = btn.dataset.sort;
  document.querySelectorAll('.filter-btn[data-sort]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderActiveHistoryView();
});

// ── Rendu des trois cartes Profil ajoutées (Il y a un an / Heatmap / Décennies) ──

// ═══════════════════════════════════════════
//  HISTORIQUE — actions rapides (toast, feuille d'action, appui long)
// ═══════════════════════════════════════════
// Issu du découpage de l'ancien 06-history.js — ce fichier couvre les
// actions déclenchées DEPUIS une carte d'historique (toast avec
// annulation, feuille d'action à l'appui long, copier le détail,
// aimer/ne plus aimer). Le rendu de la liste elle-même vit dans
// 06a-history-list.js.

let toastTimer;
let deletedItemCache = null; 
let deletedItemIndex = null;

function showToast(msg, withUndo = false, undoFnName = 'undoDelete') {
  const t = document.getElementById('toast');

  // Construction DOM sûre (textContent) plutôt qu'innerHTML : les messages
  // contiennent souvent des titres de films (données externes TMDb/imports) —
  // corriger ici, au puits, sécurise TOUS les appels d'un coup, sans devoir
  // penser à échapper à chaque site d'appel.
  t.textContent = '';
  const span = document.createElement('span');
  span.textContent = msg;
  t.appendChild(span);
  if (withUndo) {
    const btn = document.createElement('button');
    btn.className = 'toast-undo-btn';
    btn.textContent = 'Annuler';
    btn.addEventListener('click', () => { if (typeof window[undoFnName] === 'function') window[undoFnName](); });
    t.appendChild(btn);
  }

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
function buildCopyTextForItem(item) {
  const heartStr = item.liked ? ' ❤️' : '';
  const dateStr = item.date
    ? new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const score = parseFloat(item.score) || 0;
  const stars = getStarStr(scoreToStars(score));

  let text = `📽 ${escAttr(item.title)} ${item.year ? '(' + item.year + ') ' : ''}${heartStr}\n`;
  if (item.director) text += `🎬 Un film de ${item.director}\n`;
  if (item.actors) text += `🎭 Avec ${item.actors}\n`;
  if (dateStr) text += `🗓 Vu le ${dateStr}\n`;
  if (item.contextTags && item.contextTags.length > 0) text += `🏷 ${item.contextTags.join(' · ')}\n`;

  text += `⭐ ${stars} (${score.toFixed(1)}/10)\n`;

  if (item.mode === 'detail' && item.values) {
    const v = item.values;
    const f = (x) => (parseFloat(x) || 0).toFixed(1);
    text += `\nScénario ${f(v.scenario)} · Réal ${f(v.realisation)} · Photo ${f(v.photo)} · Acteurs ${f(v.acteurs)} · Son ${f(v.ambiance)} · Affect ${f(v.affect)}\n`;
  }

  if (item.review) text += `\n${escAttr(item.review)}`;
  return text;
}

window.toggleLikedForItem = function(idx) {
  const history = loadHistory();
  const item = history[idx];
  if (!item) return;
  item.liked = !item.liked;
  item.updatedAt = new Date().toISOString();
  saveHistory(history);
  renderAll();
  showToast(item.liked ? `"${item.title}" ajouté à tes coups de cœur ❤️` : `"${item.title}" retiré de tes coups de cœur`);
};

const actionSheetEl = document.getElementById('action-sheet');
const actionSheetTitleEl = document.getElementById('action-sheet-title');
const actionSheetListEl = document.getElementById('action-sheet-list');
const actionSheetCancelBtn = document.getElementById('action-sheet-cancel');

function openActionSheetForItem(idx) {
  const history = loadHistory();
  const item = history[idx];
  if (!item) return;

  actionSheetTitleEl.textContent = item.title;

  const actions = [
    { label: 'Modifier', icon: ICONS.edit, onClick: () => loadItem(idx) },
    {
      label: item.liked ? 'Retirer des coups de cœur' : 'Ajouter aux coups de cœur',
      icon: ICONS.heart,
      onClick: () => toggleLikedForItem(idx),
    },
    {
      label: 'Copier le texte',
      icon: ICONS.copy,
      onClick: () => {
        navigator.clipboard.writeText(buildCopyTextForItem(item)).then(() => {
          showToast('Critique copiée dans le presse-papier');
        });
      },
    },
    {
      label: 'Supprimer',
      icon: ICONS.trash,
      danger: true,
      onClick: () => {
        const cardEl = document.querySelector(`.hist-item[data-idx="${idx}"]`);
        deleteItem(idx, cardEl ? cardEl.querySelector('.hist-action-btn.del') : null);
      },
    },
  ];

  actionSheetListEl.innerHTML = '';
  actions.forEach(({ label, icon, onClick, danger }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'action-sheet-item' + (danger ? ' danger' : '');
    btn.innerHTML = `${icon} <span>${label}</span>`;
    btn.addEventListener('click', () => {
      closeActionSheet();
      onClick();
    });
    actionSheetListEl.appendChild(btn);
  });

  lastFocusedBeforeModal = document.activeElement;
  actionSheetEl.classList.add('open');
  actionSheetListEl.querySelector('.action-sheet-item')?.focus();
}

function closeActionSheet() {
  closeModal(actionSheetEl);
}

actionSheetCancelBtn.addEventListener('click', closeActionSheet);
actionSheetEl.addEventListener('click', (e) => { if (e.target === actionSheetEl) closeActionSheet(); });

// Détection de l'appui long (mobile) sur un film de l'historique. Délégué sur
// le conteneur (pas un listener par carte) : fonctionne aussi pour les films
// ajoutés après coup, sans re-câblage. Annulé si le doigt bouge trop (= scroll)
// ou si l'appui vise déjà un bouton (édition/suppression directe).
(function initHistoryGestures() {
  const LONG_PRESS_MS = 500;
  const MOVE_CANCEL_PX = 12; // marge avant de trancher swipe/scroll — le ratio généreux (0.5, voir plus bas) fait maintenant le plus gros du travail, donc ce seuil peut redescendre pour un geste plus réactif dès le départ
  const SWIPE_THRESHOLD = 80;
  const MAX_DRAG = 130;

  let pressTimer = null;
  let startX = 0, startY = 0;
  let pressedItem = null;
  let pressedContent = null;
  let longPressJustFired = false; // évite qu'un tap (click) ne se déclenche juste après un appui long déjà traité
  let wasSwipe = false; // idem, juste après un swipe
  let swipeMode = null; // null = pas encore décidé, 'swipe' = glissement horizontal engagé, 'scroll' = mouvement vertical (on laisse faire nativement)
  let dx = 0;
  // Un swipe qui atteint le seuil n'exécute plus l'action tout de suite : il
  // "arme" l'item (piste révélée, en attente d'un tap de confirmation sur
  // l'indice) plutôt que de supprimer/modifier immédiatement — évite les
  // suppressions accidentelles lors d'un simple scroll un peu appuyé.
  let armedItem = null;
  let armedDirection = null; // 'left' (supprimer) ou 'right' (modifier)

  const container = document.getElementById('history-list');
  if (!container) return;

  function cancelArmed() {
    if (!armedItem) return;
    const content = armedItem.querySelector('.hist-item-content');
    if (content) { content.style.transition = 'transform var(--dur-base) var(--ease-out)'; content.style.transform = ''; }
    armedItem.classList.remove('hist-swipe-armed-left', 'hist-swipe-armed-right', 'hist-swipe-left', 'hist-swipe-right');
    armedItem = null;
    armedDirection = null;
  }

  function confirmArmed() {
    if (!armedItem) return;
    const item = armedItem;
    const dir = armedDirection;
    const content = item.querySelector('.hist-item-content');
    // Capture une clé STABLE (pas juste l'index brut) : entre ce tap de
    // confirmation et l'exécution réelle (~500ms plus tard, deux délais
    // d'animation cumulés), une AUTRE suppression/modification confirmée en
    // parallèle peut décaler tous les index suivants — un index figé ici
    // deviendrait alors celui d'un AUTRE film au moment de l'exécuter. D'où
    // le bug observé : des cartes qui semblaient "figées" en plein envol,
    // l'action retardée s'appliquant au mauvais film (ou à un index qui
    // n'existait plus).
    const savedAt = item.dataset.savedAt;
    const titleKey = item.dataset.titleKey;
    function resolveCurrentIdx() {
      const freshHistory = loadHistory();
      const found = freshHistory.findIndex(h => h.savedAt === savedAt && h.title.toLowerCase() === titleKey);
      return found !== -1 ? found : parseInt(item.dataset.idx, 10); // repli sur l'ancien index si jamais introuvable
    }
    armedItem = null;
    armedDirection = null;
    // 240ms = --dur-base (styles.css :root), doit rester synchronisé avec la
    // transition de sortie ci-dessous (même correctif que watchlist et la
    // fiche film : l'ancien délai de 200ms coupait l'animation 40ms trop tôt).
    const EXIT_DUR_MS = 240;
    if (dir === 'left') {
      item.classList.add('hist-swipe-out-left');
      content.style.transform = 'translateX(-110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(item, 'strong');
      setTimeout(() => deleteItem(resolveCurrentIdx()), EXIT_DUR_MS); // pas de btnEl : évite de cumuler avec l'animation .deleting existante
    } else {
      item.classList.add('hist-swipe-out-right');
      content.style.transform = 'translateX(110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(item, 'strong');
      setTimeout(() => loadItem(resolveCurrentIdx()), EXIT_DUR_MS);
    }
  }

  function resetGesture(e) {
    if (e && pressedItem) e.stopPropagation();
    clearTimeout(pressTimer);
    if (pressedItem) pressedItem.classList.remove('hist-dragging'); // réactive la transition pour l'animation de relâchement
    pressTimer = null;
    pressedItem = null;
    pressedContent = null;
    swipeMode = null;
    dx = 0;
  }

  // Remet aussi le VISUEL à zéro (pas juste le suivi interne) — utilisé pour
  // touchcancel, qui peut se déclencher sur un vrai téléphone (notification,
  // appel entrant, le système qui interrompt le geste en cours) sans jamais
  // passer par resolveGesture(). Sans ce nettoyage visuel, le film glissé au
  // moment de l'interruption restait visuellement coincé à mi-chemin — décalé,
  // sans indice Supprimer/Modifier visible — et le restait indéfiniment,
  // jusqu'à ce qu'on retouche cet item précis. D'où le bug remonté :
  // "après avoir déjà swipé un autre film juste avant".
  function cancelGestureFully(e) {
    if (pressedItem) {
      if (pressedContent) {
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = '';
      }
      pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
    }
    resetGesture(e);
  }

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.hist-item');
    // Ludex 2.0 : Historique passé en grille — plus de swipe possible (une
    // cellule de grille n'a pas la place pour révéler un indice en dessous).
    // .hist-item-content n'existe plus dans le nouveau balisage (voir
    // renderHistory(), 06a-history-list.js) : sa seule présence sert donc de
    // signal fiable "ce geste est pertinent ici" — jamais vrai désormais,
    // ce qui laisse pressedItem/pressedContent à null et neutralise en
    // cascade tout le reste de ce fichier (touchmove/touchend gardent déjà
    // `if (!pressedItem) return;`) sans avoir à toucher chacun séparément.
    if (!item || !item.querySelector('.hist-item-content') || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) { resetGesture(); return; }
    e.stopPropagation(); // évite que ce geste ne remonte jusqu'au swipe de changement d'onglet (01-navigation.js)
    // NOTE : ne PAS annuler ici un item armé — un simple tap déclenche
    // touchstart AVANT click, et annuler dès le toucher tuait l'état armé
    // avant que le clic de confirmation n'arrive (le tap "Supprimer" ouvrait
    // alors la fiche du film). L'annulation pour cause de nouveau geste se
    // fait plus bas, au moment où un VRAI glissement démarre (swipeMode).
    pressedItem = item;
    pressedContent = item.querySelector('.hist-item-content');
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swipeMode = null;
    dx = 0;
    pressTimer = setTimeout(() => {
      if (!pressedItem || swipeMode === 'swipe') return; // déjà en train de glisser : pas d'appui long
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(pressedItem, 'medium');
      openActionSheetForItem(parseInt(pressedItem.dataset.idx, 10));
      longPressJustFired = true;
      setTimeout(() => { longPressJustFired = false; }, 300);
      resetGesture();
    }, LONG_PRESS_MS);
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!pressedItem) return;
    e.stopPropagation();
    const curX = e.touches[0].clientX;
    const curY = e.touches[0].clientY;
    const rawDx = curX - startX;
    const rawDy = curY - startY;

    // Décide UNE FOIS, dès qu'il y a assez de mouvement, si c'est un swipe
    // horizontal (glissement de la carte) ou un scroll vertical (on laisse
    // faire nativement, on ne touche à rien).
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        clearTimeout(pressTimer); // tout mouvement franc annule l'appui long
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll'; // nettement favorable au swipe (etait 1:1, encore trop de faux "scroll" signales par l'utilisateur) : un vrai geste de glissement a souvent un peu de derive verticale, surtout au tout debut
        // C'est ICI (nouveau glissement réellement engagé) qu'on nettoie un
        // éventuel état armé du même film — assez tôt pour éviter les deux
        // états contradictoires (le bug historique du re-swipe), assez tard
        // pour ne pas tuer le tap de confirmation (qui ne passe jamais ici).
        if (swipeMode === 'swipe') {
          if (armedItem === pressedItem) cancelArmed();
          // Désactive la transition CSS pendant le glissement actif (classe
          // prévue mais jamais posée jusqu'ici) : sans ça, chaque mise à jour
          // de translateX() au fil du doigt s'anime sur 240ms au lieu d'être
          // instantanée — un léger effet "élastique" qui traîne derrière le
          // doigt plutôt qu'un suivi 1:1 franc.
          pressedItem.classList.add('hist-dragging');
        }
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;

    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
    pressedItem.classList.toggle('hist-swipe-right', dx > 10);
  }, { passive: true });

  function resolveGesture(e) {
    if (!pressedItem) return;
    if (e) e.stopPropagation();
    clearTimeout(pressTimer);

    if (swipeMode === 'swipe') {
      if (dx <= -SWIPE_THRESHOLD) {
        cancelArmed(); // un seul item armé à la fois
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = 'translateX(-120px)';
        pressedItem.classList.add('hist-swipe-armed-left');
        armedItem = pressedItem;
        armedDirection = 'left';
        hapticPulse(pressedItem, 'medium');
      } else if (dx >= SWIPE_THRESHOLD) {
        cancelArmed();
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = 'translateX(120px)';
        pressedItem.classList.add('hist-swipe-armed-right');
        armedItem = pressedItem;
        armedDirection = 'right';
        hapticPulse(pressedItem, 'medium');
      } else {
        pressedContent.style.transform = '';
        pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
      }
      wasSwipe = true;
      setTimeout(() => { wasSwipe = false; }, 300);
    }
    resetGesture();
  }

  container.addEventListener('touchend', resolveGesture);

  container.addEventListener('touchcancel', cancelGestureFully);

  // Souris (pratique pour tester sur desktop / vercel dev) : même logique que
  // le tactile, juste déclenchée par mousedown/mousemove/mouseup.
  let mouseActive = false;
  container.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.hist-item');
    if (!item || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) return;
    mouseActive = true;
    pressedItem = item;
    pressedContent = item.querySelector('.hist-item-content');
    startX = e.clientX;
    startY = e.clientY;
    swipeMode = null;
    dx = 0;
  });
  document.addEventListener('mousemove', (e) => {
    if (!mouseActive || !pressedItem) return;
    const rawDx = e.clientX - startX;
    const rawDy = e.clientY - startY;
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll'; // nettement favorable au swipe (etait 1:1, encore trop de faux "scroll" signales par l'utilisateur) : un vrai geste de glissement a souvent un peu de derive verticale, surtout au tout debut
        // Même correctif que le tactile : nettoyer un état armé au démarrage
        // d'un VRAI glissement, jamais au simple clic (voir touchstart).
        if (swipeMode === 'swipe') {
          if (armedItem === pressedItem) cancelArmed();
          pressedItem.classList.add('hist-dragging'); // voir le commentaire côté tactile
        }
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;
    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
    pressedItem.classList.toggle('hist-swipe-right', dx > 10);
  });
  document.addEventListener('mouseup', () => {
    if (!mouseActive) return;
    mouseActive = false;
    resolveGesture();
  });

  // Tap (court) sur un film : ouvre sa fiche détaillée. L'appui long (menu
  // d'actions) et le swipe (supprimer/modifier) ont priorité — s'ils viennent
  // de se déclencher, on ignore ce tap.
  container.addEventListener('click', (e) => {
    // Confirmation/annulation d'un item armé (swipe qui a atteint son seuil) :
    // prioritaire sur tout le reste, y compris le garde-fou "wasSwipe" — sinon
    // on ne pourrait jamais confirmer juste après avoir swipé.
    if (armedItem) {
      const hint = e.target.closest('.hist-swipe-hint');
      const clickedItem = e.target.closest('.hist-item');
      if (hint && clickedItem === armedItem) {
        confirmArmed();
        return;
      }
      const wasArmedItself = clickedItem === armedItem;
      cancelArmed();
      if (wasArmedItself) return; // juste annulé : ne rien faire de plus avec ce tap
      // sinon : le tap visait autre chose (un autre film, le CTA...), on continue normalement
    }

    if (e.target.closest('#empty-state-history-cta')) {
      if (window.innerWidth <= 860) switchMobileNav('rating');
      const searchInput = document.getElementById('movie-search');
      if (searchInput) searchInput.focus();
      return;
    }
    if (longPressJustFired || wasSwipe) return;
    const item = e.target.closest('.hist-item');
    if (!item || e.target.closest('.hist-action-btn') || e.target.closest('.hist-review')) return;
    const idx = parseInt(item.dataset.idx, 10);
    const history = loadHistory();
    const movieItem = history[idx];
    if (movieItem) openMovieDetailSheet(movieItem.tmdbId);
  });

  // Activation clavier (Entrée/Espace) de .hist-item-open : role="button" +
  // tabindex="0" rendent l'élément focusable et l'annoncent comme un bouton
  // aux lecteurs d'écran, mais NE déclenchent PAS d'activation clavier tout
  // seuls (contrairement à un vrai <button>) — sans ce gestionnaire, il était
  // impossible d'ouvrir une fiche film au clavier depuis l'historique.
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const opener = e.target.closest('.hist-item-open');
    if (!opener) return;
    e.preventDefault(); // Espace ne doit pas aussi faire défiler la page
    const item = opener.closest('.hist-item');
    if (!item) return;
    const idx = parseInt(item.dataset.idx, 10);
    const movieItem = loadHistory()[idx];
    if (movieItem) openMovieDetailSheet(movieItem.tmdbId);
  });

  // Filet de sécurité : un tap n'importe où EN DEHORS de la liste (changer
  // d'onglet, ouvrir les réglages...) annule aussi un item resté armé.
  document.addEventListener('click', (e) => {
    if (armedItem && !container.contains(e.target)) cancelArmed();
  }, true);

  // Exposé pour renderHistory() : un re-rendu (déclenché par une synchro en
  // arrière-plan, un tirer-pour-rafraîchir, une autre suppression confirmée
  // en parallèle...) reconstruit tout le DOM de la liste. Sans rien faire de
  // plus, l'état "armé" (piste révélée, en attente d'un tap de confirmation)
  // disparaîtrait silencieusement sur le nouvel élément reconstruit — le
  // prochain tap de l'utilisateur sur l'indice ne ferait alors plus rien,
  // puisque ni la classe visuelle ni la variable JS ne s'y attendent plus.
  // Solution en deux temps : capturer l'état AVANT de vider le DOM (clé
  // stable, pas un index qui pourrait avoir changé), puis le réappliquer
  // sur le NOUVEL élément correspondant après la reconstruction.
  window.captureArmedHistoryState = function() {
    // Cas 1 : un item est déjà ARMÉ (piste révélée, en attente de confirmation).
    if (armedItem) {
      const captured = {
        kind: 'armed',
        savedAt: armedItem.dataset.savedAt,
        titleKey: armedItem.dataset.titleKey,
        direction: armedDirection,
      };
      resetGesture();
      armedItem = null;
      armedDirection = null;
      return captured;
    }
    // Cas 2 : un glissement est EN COURS (doigt toujours posé, pas encore
    // armé) — c'est le cas qui manquait encore : un re-rendu à ce moment-là
    // laissait pressedItem/pressedContent pointer vers un élément détaché,
    // donc le reste du geste (touchmove/touchend) ne mettait plus rien à
    // jour de VISIBLE, exactement le bug "le swipe est détecté mais reste
    // vide" remonté par l'utilisateur.
    if (pressedItem) {
      const captured = {
        kind: 'dragging',
        savedAt: pressedItem.dataset.savedAt,
        titleKey: pressedItem.dataset.titleKey,
        dx, swipeMode,
      };
      return captured; // ne réinitialise PAS ici : le doigt est encore posé, le geste continue
    }
    return null;
  };

  window.reapplyArmedHistoryState = function(captured) {
    if (!captured) return;
    const container = document.getElementById('history-list');
    const newItem = container?.querySelector(
      `.hist-item[data-saved-at="${CSS.escape(captured.savedAt)}"][data-title-key="${CSS.escape(captured.titleKey)}"]`
    );
    if (!newItem) return; // le film a été supprimé entre-temps par ailleurs : rien à réappliquer
    const content = newItem.querySelector('.hist-item-content');

    if (captured.kind === 'armed') {
      const cls = captured.direction === 'left' ? 'hist-swipe-armed-left' : 'hist-swipe-armed-right';
      const swipeCls = captured.direction === 'left' ? 'hist-swipe-left' : 'hist-swipe-right';
      newItem.classList.add(cls, swipeCls);
      if (content) content.style.transform = `translateX(${captured.direction === 'left' ? -120 : 120}px)`;
      armedItem = newItem;
      armedDirection = captured.direction;
    } else if (captured.kind === 'dragging') {
      // Rebranche pressedItem/pressedContent sur le NOUVEL élément (le geste
      // continue dessus dès le prochain touchmove/touchend), et redonne
      // immédiatement le même rendu visuel qu'avant le re-rendu.
      pressedItem = newItem;
      pressedContent = content;
      dx = captured.dx;
      swipeMode = captured.swipeMode;
      if (content) content.style.transform = `translateX(${dx}px)`;
      newItem.classList.toggle('hist-swipe-left', dx < -10);
      newItem.classList.toggle('hist-swipe-right', dx > 10);
    }
  };
})();

// ═══════════════════════════════════════════
//  PROFIL — statistiques et tableau de bord
// ═══════════════════════════════════════════
// Issu du découpage de l'ancien 06-history.js — ce fichier couvre le
// calcul et le rendu des statistiques du Profil (radar, timeline,
// distribution des notes, badges, heatmap, décennies, classiques à
// explorer) ainsi que renderAll()/renderProfileIfDirty(), les points
// d'entrée appelés après chaque changement de données. Le dessin des
// cartes à partager (canvas) vit séparément dans
// 06d-profile-share-cards.js.

function createRadarSVG(averages, mediaType = 'movie') {
  if (averages.every(a => a === 0)) return null;

  // Libellés courts pour l'affichage du radar (doit couvrir toutes les clés de
  // CRITERIA). Déclaré ICI (local à la fonction) et non en haut du fichier :
  // un `const` top-level serait dans sa "zone morte temporelle" tant que
  // l'exécution du script n'a pas atteint cette ligne — or `renderAll()` est
  // appelée une première fois de façon précoce (voir 03-foundation.js), avant
  // que 06-history.js n'ait fini de s'exécuter, ce qui provoquait un plantage
  // total de l'app au chargement pour tout utilisateur ayant déjà un historique.
  const CRITERIA_SHORT_LABELS = mediaType === 'tv'
    ? { scenario: 'Scén.', realisation: 'Réal.', photo: 'Final', acteurs: 'Casting', ambiance: 'Ambiance', rythme: 'Cohér.', affect: 'Affect' }
    : { scenario: 'Scén.', realisation: 'Réal.', photo: 'Photo', acteurs: 'Casting', ambiance: 'Ambiance', rythme: 'Rythme', affect: 'Affect' };

  const s = 220, c = s/2, r = 72;
  // Nombre d'axes = nombre de critères actuels (CRITERIA) : ne plus jamais figer
  // ce nombre en dur, sinon l'ajout d'un critère (ex: "Rythme") désaligne le
  // graphique ou perd un axe silencieusement.
  // NB : s (220) est volontairement plus grand que 2×r (144) — la différence
  // (38px de chaque côté) est la marge réservée aux libellés des axes.
  // Avant, s=180 et r=0.42×s=76 plaçaient l'ancre du texte PILE sur le bord du
  // viewBox (aucune marge), ce qui faisait déborder "Réal." et "Photo" (le
  // texte s'étend depuis son ancre, pas autour) hors du cadre visible.
  const angleStep = 360 / CRITERIA.length;
  const angles = CRITERIA.map((_, i) => (i * angleStep - 90) * Math.PI / 180);
  const labels = CRITERIA.map(critKey => CRITERIA_SHORT_LABELS[critKey] || critKey);

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
  // Anime la forme depuis le centre (effet "scan") plutôt que de l'afficher
  // d'un coup — transform-origin fixé sur le centre exact du cercle (c,c).
  svg += `<polygon points="${dataPts}" fill="var(--orange)" fill-opacity="0.3" stroke="var(--orange)" stroke-width="2" class="radar-fill-anim" style="transform-origin:${c}px ${c}px;" />`;
  
  angles.forEach((a, i) => {
    svg += `<circle cx="${c + (averages[i]/10)*r*Math.cos(a)}" cy="${c + (averages[i]/10)*r*Math.sin(a)}" r="3" fill="var(--blue)" class="radar-dot-anim" style="animation-delay:${0.5 + i*0.05}s" />`;
  });

  svg += `</svg>`;
  return svg;
}

// Anime un chiffre de 0 (ou de sa valeur affichée actuelle) jusqu'à sa valeur
// finale, avec un ralentissement en fin de course (ease-out) pour un rendu
// plus "premium" qu'un simple changement instantané. Respecte la préférence
// système "réduire les animations" : dans ce cas, affiche direct la valeur finale.
function animateCountUp(el, endValue, { duration = 700, decimals = 0 } = {}) {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const format = (v) => decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString();

  if (reduceMotion) {
    el.textContent = format(endValue);
    return;
  }

  const startValue = 0;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = format(startValue + (endValue - startValue) * eased);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = format(endValue);
  }
  requestAnimationFrame(step);
}

// Le radar ne se dessine (animation) que lorsqu'il entre réellement dans le
// viewport — divulgation progressive : pas d'effet gâché hors écran, et un
// petit "moment" à découvrir en scrollant jusqu'à lui plutôt qu'un dessin
// déjà terminé avant même de le voir. Un seul observer, mis en place une fois
// (le conteneur lui-même persiste ; seul son contenu est remplacé à chaque
// rendu — la classe .in-view s'applique alors dynamiquement au nouveau SVG).
(function initRadarScrollReveal() {
  const container = document.getElementById('radar-chart-container');
  if (!container || !window.IntersectionObserver) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) container.classList.add('in-view');
    });
  }, { threshold: 0.3 });
  observer.observe(container);
})();

function renderStats() {
  const history = loadHistory();
  animateCountUp(document.getElementById('kpi-total'), history.length);
  
  if (history.length === 0) {
    document.getElementById('kpi-avg').textContent = '-'; 
    const heroYearSubEl = document.getElementById('profile-hero-year-sub');
    if (heroYearSubEl) heroYearSubEl.textContent = '';
    document.getElementById('radar-chart-container').innerHTML = ''; 
    document.getElementById('radar-chart-container').style.minHeight = '0';
    document.getElementById('radar-empty').style.display = 'block';
    document.getElementById('top-directors-list').innerHTML = renderEmptyState({ message: 'Enregistrez plus de films avec un réalisateur pour générer ce top.' });
    buildHistogram({});
    resetProfileExtras();
    return;
  }

  const avg = history.reduce((sum, h) => sum + parseFloat(h.score), 0) / history.length;
  animateCountUp(document.getElementById('kpi-avg'), avg, { decimals: 1 });

  const currentYear = new Date().getFullYear().toString();
  const yearCount = history.filter(h => h.date && h.date.startsWith(currentYear)).length;
  // Ludex 2.0 : plus de carte KPI séparée "En 2026" — ce compte vit
  // maintenant en sous-texte du bento "Films notés" (voir la maquette
  // envoyée). #kpi-year a disparu du HTML ; textContent direct plutôt que
  // animateCountUp() ici, puisqu'on affiche un texte formaté ("+24 en
  // 2026"), pas un nombre brut animé seul.
  const heroYearSubEl = document.getElementById('profile-hero-year-sub');
  if (heroYearSubEl) heroYearSubEl.textContent = `+${yearCount} en ${currentYear}`;

  // Réutilise la même fonction que le repère de moyenne perso sur les sliders
  // (voir 03b-pure-logic.js), pour ne pas dupliquer ce calcul à deux endroits.
  // Gère nativement le cas d'un ancien film sans valeur pour un critère ajouté
  // après coup (ex: "Rythme") : ne compte ni dans la somme ni dans le diviseur
  // de CE critère précis pour cette entrée, plutôt que de fausser la moyenne.
  const avgsByCriterion = computeCriteriaAverages(history, CRITERIA);
  const avgs = CRITERIA.map(c => avgsByCriterion[c] || 0);
  const radarSvg = createRadarSVG(avgs);
  if (radarSvg) { 
    document.getElementById('radar-chart-container').innerHTML = radarSvg; 
    document.getElementById('radar-chart-container').style.minHeight = '160px';
    document.getElementById('radar-empty').style.display = 'none'; 
  } else { 
    document.getElementById('radar-chart-container').innerHTML = ''; 
    document.getElementById('radar-chart-container').style.minHeight = '0';
    document.getElementById('radar-empty').style.display = 'block'; 
  }

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
    dirCont.innerHTML = topD.map(d => `<div class="top-item" onclick="document.getElementById('history-search').value='${escAttr(d.name)}';document.getElementById('history-search').dispatchEvent(new Event('input'))"><span class="top-item-name">${escAttr(d.name)}</span><div class="top-item-meta"><span>${d.count} films</span><span class="top-item-score">★ ${d.avg.toFixed(1)}</span></div></div>`).join('');
  } else { 
    dirCont.innerHTML = renderEmptyState({ message: 'Enregistrez plus de films avec un réalisateur pour générer ce top.' }); 
  }

  const dist = { '50':0, '45':0, '40':0, '35':0, '30':0, '25':0, '20':0, '15':0, '10':0, '05':0 };
  history.forEach(item => {
    const stars = Math.round((parseFloat(item.score) / 2) * 2) / 2;
    const key   = Math.round(stars * 10).toString().padStart(2,'0');
    if (dist[key] !== undefined) dist[key]++;
  });
  buildHistogram(dist);
  renderProfileExtras(history);
  renderProfileDiscoveryCards();
}

// ─── Onglet Profil : temps visionné, acteur favori, membre depuis, série, badges ──
function resetProfileExtras() {
  document.getElementById('profile-member-since').textContent = '—';
  document.getElementById('profile-watch-time').textContent = '—';
  const heroSubEl = document.getElementById('profile-hero-sub');
  if (heroSubEl) heroSubEl.textContent = 'Cinéphile · Membre depuis —';
  const heroWatchTimeEl = document.getElementById('profile-hero-watch-time');
  if (heroWatchTimeEl) heroWatchTimeEl.textContent = '—';
  const heroYearSubEl = document.getElementById('profile-hero-year-sub');
  if (heroYearSubEl) heroYearSubEl.textContent = '';
  document.getElementById('profile-fav-actor').textContent = '—';
  document.getElementById('profile-streak').textContent = 'Pas de série en cours';
  renderBadges(computeBadges([], {}));
  drawProfileShareCard(null);
  // Rien à télécharger tant que la carte est verrouillée — désactivé plutôt
  // que de laisser un bouton actif sans effet utile derrière lui.
  const shareBtn = document.getElementById('profile-share-btn');
  if (shareBtn) { shareBtn.disabled = true; shareBtn.title = 'Note quelques films pour débloquer ta carte'; }
  // Une rétrospective "0 film noté" n'aurait aucun sens — la carte d'entrée
  // ne s'affiche que s'il y a au moins un film à raconter.
  const wrappedCard = document.getElementById('wrapped-entry-card');
  if (wrappedCard) wrappedCard.style.display = 'none';
}

function renderProfileExtras(history) {
  // Défensif : un appel sans argument (bug d'un appelant) ne doit plus faire
  // planter tout le reste du rendu du profil — juste rester sur les valeurs
  // par défaut, comme un historique vide.
  history = history || [];
  // Une rétrospective "0 film noté" n'aurait aucun sens : la carte ne
  // s'affiche que s'il y a au moins un film — mais elle doit pouvoir
  // réapparaître si l'historique passe de vide à rempli dans la même session.
  const wrappedCard = document.getElementById('wrapped-entry-card');
  if (wrappedCard) wrappedCard.style.display = history.length > 0 ? '' : 'none';
  const shareBtn = document.getElementById('profile-share-btn');
  if (shareBtn) {
    shareBtn.disabled = history.length === 0;
    shareBtn.title = history.length === 0 ? 'Note quelques films pour débloquer ta carte' : '';
  }
  // Membre depuis : date la plus ancienne connue (savedAt, ou date à défaut).
  const dates = history
    .map(h => h.savedAt || h.date)
    .filter(Boolean)
    .map(d => new Date(d))
    .filter(d => !isNaN(d));
  let memberSinceStr = '—';
  if (dates.length > 0) {
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    memberSinceStr = earliest.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  document.getElementById('profile-member-since').textContent = memberSinceStr;
  const heroSubEl = document.getElementById('profile-hero-sub');
  if (heroSubEl) heroSubEl.textContent = `Cinéphile · Membre depuis ${memberSinceStr}`;

  // Temps total visionné : somme des durées (le champ runtime est stocké en
  // texte libre, ex: "142 min" — parseInt s'arrête au premier caractère non
  // numérique, donc ça fonctionne aussi bien avec juste "142").
  const totalMinutes = history.reduce((sum, h) => {
    const mins = parseInt(h.runtime, 10);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0);
  document.getElementById('profile-watch-time').textContent = formatWatchTime(totalMinutes);
  const heroWatchTimeEl = document.getElementById('profile-hero-watch-time');
  if (heroWatchTimeEl) heroWatchTimeEl.textContent = formatWatchTime(totalMinutes);

  // Acteur favori : même principe que le top réalisateurs (compte + note
  // moyenne), mais un seul nom affiché ici.
  const actorStats = {};
  history.forEach(h => {
    if (h.actors) {
      h.actors.split(',').forEach(a => {
        const t = a.trim(); if (!t) return;
        if (!actorStats[t]) actorStats[t] = { count: 0, sum: 0 };
        actorStats[t].count++; actorStats[t].sum += parseFloat(h.score) || 0;
      });
    }
  });
  const topActors = Object.entries(actorStats)
    .map(([name, d]) => ({ name, count: d.count, avg: d.sum / d.count }))
    .sort((a, b) => b.count - a.count || b.avg - a.avg);
  document.getElementById('profile-fav-actor').textContent =
    topActors.length > 0 ? `${topActors[0].name} (${topActors[0].count} film${topActors[0].count > 1 ? 's' : ''})` : '—';

  // Série en cours (streak) : semaines ISO consécutives avec au moins un film.
  const streak = computeWeekStreak(history);
  document.getElementById('profile-streak').textContent =
    streak > 0 ? `${streak} semaine${streak > 1 ? 's' : ''} de suite` : 'Pas de série en cours';

  // Ludex 2.0 : streak JOURNALIER séparé pour le succès Fidélité (voir
  // Ludex_Gamification_Succes.pdf — "jours consécutifs", pas semaines).
  const dayStreak = computeDayStreak(history);
  const tvRatings = typeof getAllTvSeasonRatings === 'function' ? getAllTvSeasonRatings() : [];
  const badges = computeBadges(history, { totalMinutes, dayStreak, tvRatings });
  renderBadges(badges);

  // Genre favori (pour la carte de profil) : même logique que le top
  // réalisateurs/acteur favori, sur le champ genre.
  const genreCounts = {};
  history.forEach(h => { if (h.genre) h.genre.split(',').forEach(g => { const t = g.trim(); if (t) genreCounts[t] = (genreCounts[t] || 0) + 1; }); });
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Moyennes par critère (mode détaillé) : pour le mini-radar de la carte de
  // profil. null si l'utilisateur n'a jamais utilisé le mode détaillé.
  const criteriaAverages = computeCriteriaAverages(history, CRITERIA);
  const hasCriteriaData = Object.values(criteriaAverages).some(v => v !== null);

  drawProfileShareCard({
    history, totalMinutes, memberSinceStr,
    topActor: topActors[0]?.name,
    topGenre,
    criteriaAverages: hasCriteriaData ? criteriaAverages : null,
    badges,
  });
}

function renderBadges(badges) {
  const grid = document.getElementById('badges-grid');
  if (!grid) return;
  const countEl = document.getElementById('badges-count');
  if (countEl) {
    const unlocked = badges.filter(b => b.tier > 0).length;
    countEl.textContent = `${unlocked}/${badges.length}`;
  }

  // Ludex 2.0 : détection de franchissement de palier — compare le palier
  // actuel de chaque badge à son dernier palier CONNU (stocké), déclenche
  // un toast de célébration si un nouveau palier vient d'être atteint. À la
  // toute première exécution (aucun état connu encore stocké), initialise
  // silencieusement sur les paliers ACTUELS plutôt que sur 0 — sinon un
  // utilisateur avec déjà 200 films notés recevrait d'un coup une pluie de
  // toasts "Palier débloqué" pour des trophées qu'il a en réalité depuis
  // longtemps.
  let knownTiers = {};
  let isFirstRun = true;
  try {
    const stored = localStorage.getItem('lbx_badges_known_tiers');
    if (stored) { knownTiers = JSON.parse(stored); isFirstRun = false; }
  } catch { /* ignore, repart de zéro */ }

  const newlyUnlocked = [];
  badges.forEach(b => {
    const prevTier = knownTiers[b.id] ?? 0;
    if (!isFirstRun && b.tier > prevTier) newlyUnlocked.push(b);
    knownTiers[b.id] = b.tier;
  });
  localStorage.setItem('lbx_badges_known_tiers', JSON.stringify(knownTiers));
  const TIER_NAMES = ['', 'Palier I', 'Palier II', 'Palier III'];
  newlyUnlocked.forEach(b => showToast(`🏆 ${TIER_NAMES[b.tier]} débloqué — ${b.name} !`));

  grid.innerHTML = badges.map(b => `
    <div class="badge-item ${b.tier > 0 ? 'unlocked' : 'locked'}" title="${b.tier > 0 ? `${TIER_NAMES[b.tier]} débloqué` : 'Pas encore débloqué'}">
      <div class="badge-icon badge-tier-${b.tier}">${b.icon}</div>
      <div class="badge-label">${escAttr(b.name)}</div>
      ${!b.maxed ? `
        <div class="badge-progress-track"><div class="badge-progress-fill" style="width:${Math.round(b.progress * 100)}%"></div></div>
        <div class="badge-progress-text">${b.value}/${b.nextThreshold}</div>
      ` : `<div class="badge-progress-text badge-maxed">Complété</div>`}
    </div>
  `).join('');

  // Ludex 2.0 : vitrine des 3 derniers trophées débloqués, toujours visible
  // (voir #trophy-showcase, index.html) — sans dépendre de newlyUnlocked
  // (qui ne contient que ceux débloqués À CETTE exécution précise) : les 3
  // avec le palier le plus élevé, tous badges confondus, peu importe QUAND
  // ils ont été débloqués.
  const showcaseEl = document.getElementById('trophy-showcase');
  if (showcaseEl) {
    const top3 = [...badges].filter(b => b.tier > 0).sort((a, b) => b.tier - a.tier || b.progress - a.progress).slice(0, 3);
    showcaseEl.innerHTML = top3.length > 0
      ? top3.map(b => `
          <div class="trophy-medal">
            <div class="trophy-icon badge-tier-${b.tier}">${b.icon}</div>
            <div class="trophy-name">${escAttr(b.name)}</div>
            <div class="trophy-tier">${TIER_NAMES[b.tier]}</div>
          </div>
        `).join('')
      : `<div class="trophy-empty">Note quelques films pour débloquer tes premiers trophées.</div>`;
  }
}

// Carte de profil partageable : dessinée sur un <canvas>, avec les couleurs
// et la police du thème actif (lues via getComputedStyle), pour que l'image
// exportée corresponde à l'identité visuelle choisie plutôt qu'un rendu
// générique. Pas de librairie externe — dessin manuel, comme pour
// l'extraction de couleur dominante (00c-poster-color.js).
// Dessine un petit radar (moyennes par critère) sur le canvas — même principe
// que createRadarSVG (06-history.js) mais en dessin canvas natif, pas du SVG.
function buildHistogram(dist) {
  const container = document.getElementById('histogram');
  container.innerHTML = '';
  const maxVal = Math.max(...Object.values(dist), 0);
  if (maxVal === 0) {
    container.innerHTML = renderEmptyState({ message: 'Note quelques films pour voir apparaître leur répartition ici.' });
    return;
  }
  const order = [50, 45, 40, 35, 30, 25, 20, 15, 10, '05'];
  const labels = {
    50: '★★★★★', 45: '★★★★½', 40: '★★★★', 35: '★★★½', 30: '★★★',
    25: '★★½',   20: '★★',    15: '★½',    10: '★',    '05': '½'
  };
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

let statsDirty = true; // vrai au démarrage : le premier vrai rendu doit avoir lieu

// Dispatche vers le bon rendu de stats selon la bascule Films/Séries —
// même principe que renderActiveHistoryView, pour que renderTvStats()
// bénéficie aussi de l'optimisation "ne recalculer que si Profil est
// visible" plutôt que de la contourner silencieusement.
function renderActiveStatsView() {
  if (statsMediaFilter === 'tv') { if (typeof renderTvStats === 'function') renderTvStats(); }
  else renderStats();
}

function renderAll() {
  // renderStats() reconstruit pas mal de choses (SVG radar/timeline, heatmap
  // ~365 cellules, badges, décennies, classement des duels) — un vrai coût,
  // payé jusqu'ici à CHAQUE sauvegarde/suppression/import, même quand l'onglet
  // Profil n'est pas à l'écran (souvent le cas : on reste sur Noter ou
  // Historique). On ne le calcule que si Profil est réellement visible ;
  // sinon on le marque "à jour ultérieurement" — rattrapé par
  // renderProfileIfDirty() au moment où l'utilisateur bascule dessus (voir
  // 01-navigation.js). renderHistory() reste inconditionnel : c'est
  // généralement la vue qu'on regarde au moment de l'appel.
  const profileView = document.getElementById('view-profile');
  if (profileView && profileView.classList.contains('active')) {
    renderActiveStatsView();
    statsDirty = false;
  } else {
    statsDirty = true;
  }
  renderActiveHistoryView();
}

// Appelée quand l'onglet Profil devient visible : rattrape un renderStats()
// qui avait été sauté pendant que l'onglet était masqué.
function renderProfileIfDirty() {
  if (statsDirty) { renderActiveStatsView(); statsDirty = false; }
}

// ═══════════════════════════════════════════
//  SORT FILTERS
// ═══════════════════════════════════════════
function renderYearAgoCard(history) {
  const card = document.getElementById('year-ago-card');
  const body = document.getElementById('year-ago-body');
  if (!card || !body) return;
  const found = findOneYearAgoFilm(history, new Date());
  if (!found) { card.style.display = 'none'; return; }
  card.style.display = '';
  const { item } = found;
  const posterHtml = item.poster
    ? `<img class="year-ago-poster" src="${item.poster}" alt="" loading="lazy" decoding="async">`
    : `<div class="year-ago-poster year-ago-poster-ph">${ICONS.clapper}</div>`;
  body.innerHTML = `
    ${posterHtml}
    <div>
      <div class="year-ago-title">${escAttr(item.title)}</div>
      <div class="year-ago-meta">Tu regardais ce film à la même période l'an dernier${item.year ? ` (${escAttr(String(item.year))})` : ''}.</div>
      ${item.score ? `<div class="year-ago-score">Ta note : ${escAttr(String(item.score))}/10</div>` : ''}
    </div>
  `;
}

function renderHeatmap(history) {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  const counts = computeDailyCounts(history);

  // 53 colonnes de semaines, en remontant depuis aujourd'hui jusqu'à ~1 an.
  // On démarre au lundi de la semaine d'il y a 52 semaines pour des colonnes alignées.
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const dayOfWeek = (start.getDay() + 6) % 7; // lundi=0
  start.setDate(start.getDate() - dayOfWeek);

  let html = '';
  const cur = new Date(start);
  while (cur <= today) {
    const key = cur.toISOString().slice(0, 10);
    const n = counts[key] || 0;
    const lvl = n === 0 ? 'l0' : n === 1 ? 'l1' : n === 2 ? 'l2' : 'l3';
    html += `<div class="heatmap-cell ${lvl}" title="${key}${n > 0 ? ` — ${n} film${n > 1 ? 's' : ''}` : ''}"></div>`;
    cur.setDate(cur.getDate() + 1);
  }
  grid.innerHTML = html;
  // Amène la vue sur la fin (les semaines récentes), pas le début d'il y a un an
  const scroll = grid.parentElement;
  if (scroll) scroll.scrollLeft = scroll.scrollWidth;
}

function renderDecades(history) {
  const card = document.getElementById('decades-card');
  const list = document.getElementById('decades-list');
  if (!card || !list) return;
  const stats = computeDecadeStats(history);
  if (stats.length === 0) { card.style.display = 'none'; return; }
  card.style.display = '';
  const max = stats[0].count;
  list.innerHTML = stats.slice(0, 6).map(d => `
    <div class="decade-row">
      <span class="decade-label">${d.decade}s</span>
      <div class="decade-bar-track"><div class="decade-bar" style="width:${Math.round(d.count / max * 100)}%"></div></div>
      <span class="decade-count">${d.count} · ${d.avg !== null ? d.avg.toFixed(1) : '—'}</span>
    </div>
  `).join('');
}

// Regroupe les trois cartes ajoutées ensuite (Il y a un an / Heatmap /
// Décennies). Nom distinct de renderProfileExtras : les deux fonctions
// portaient le même nom à un moment, et la seconde écrasait silencieusement
// la première par hissage — cassant toute la carte "Ton profil" (Membre
// depuis, Temps visionné...). Leçon : un nom = une fonction, vérifié par grep.
function renderProfileDiscoveryCards() {
  const history = loadHistory();
  renderYearAgoCard(history);
  renderHeatmap(history);
  renderDecades(history);
}

// ═══════════════════════════════════════════
//  PROFIL — cartes à partager (dessin sur <canvas>)
// ═══════════════════════════════════════════
// Issu du découpage de l'ancien 06-history.js — ce fichier couvre le
// dessin sur <canvas> des images à télécharger/partager : la carte de
// profil ("Mon profil cinéphile") et la rétrospective annuelle
// ("Wrapped"). Les données qu'elles affichent sont calculées dans
// 06c-profile-stats.js.

function drawMiniRadarOnCanvas(ctx, cx, cy, radius, criteriaAverages, color, gridColor) {
  const keys = CRITERIA;
  const angleStep = (Math.PI * 2) / keys.length;

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  keys.forEach((k, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  keys.forEach((k, i) => {
    const val = criteriaAverages[k] || 0;
    const r = (val / 10) * radius;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Bande de perforations façon pellicule de film — juste décoratif, en haut et
// en bas de la carte, pour ancrer visuellement le thème "cinéma".
function drawFilmStripBand(ctx, y, w, color) {
  const holeW = 10, holeH = 6, gap = 8;
  ctx.fillStyle = color;
  for (let x = gap; x < w - gap; x += holeW + gap) {
    ctx.fillRect(x, y, holeW, holeH);
  }
}

function drawProfileShareCard(data) {
  const canvas = document.getElementById('profile-share-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // certains environnements restrictifs renvoient null plutôt que de lever une erreur
  const w = canvas.width, h = canvas.height;

  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue('--surface').trim() || '#1f2935';
  const bg2 = styles.getPropertyValue('--bg').trim() || '#14181c';
  const textHi = styles.getPropertyValue('--text-hi').trim() || '#fff';
  const textMid = styles.getPropertyValue('--text-mid').trim() || '#9ab';
  const accent = styles.getPropertyValue('--orange').trim() || '#ff8000';
  const gold = styles.getPropertyValue('--gold').trim() || accent;
  const border = styles.getPropertyValue('--border').trim() || '#333';
  const fontHeading = (styles.getPropertyValue('--font-heading').trim() || 'sans-serif').split(',')[0].replace(/['"]/g, '');

  ctx.clearRect(0, 0, w, h);
  // Fond en léger dégradé (pas un simple aplat) pour donner un peu de profondeur.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  drawFilmStripBand(ctx, 10, w, accent);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `900 26px "${fontHeading}", sans-serif`;
  ctx.fillText('LUDEX', w / 2, 52);
  ctx.fillStyle = textMid;
  ctx.font = `12px "${fontHeading}", sans-serif`;
  ctx.fillText('MON PROFIL CINÉPHILE', w / 2, 72);

  if (!data || !data.history || data.history.length === 0) {
    ctx.fillStyle = textMid;
    ctx.font = '15px sans-serif';
    ctx.fillText('Note quelques films pour', w / 2, h / 2 - 8);
    ctx.fillText('débloquer ta carte de profil', w / 2, h / 2 + 16);
    drawFilmStripBand(ctx, h - 16, w, accent);
    return;
  }

  const { history, totalMinutes, memberSinceStr, topActor, topGenre, criteriaAverages, badges } = data;
  const avg = history.reduce((sum, item) => sum + (parseFloat(item.score) || 0), 0) / history.length;

  // Chiffre "héros" : le nombre de films, en très grand, façon Wrapped.
  ctx.fillStyle = textHi;
  ctx.font = `900 68px "${fontHeading}", sans-serif`;
  ctx.fillText(String(history.length), w / 2, 148);
  ctx.fillStyle = textMid;
  ctx.font = `bold 12px "${fontHeading}", sans-serif`;
  ctx.fillText('FILMS NOTÉS', w / 2, 168);

  // Note moyenne, mise en avant juste en dessous.
  ctx.fillStyle = gold;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`★ ${avg.toFixed(1)}/10 de moyenne`, w / 2, 196);

  // Mini-radar (mode détaillé utilisé) ou, à défaut, un genre/acteur mis en avant.
  if (criteriaAverages) {
    drawMiniRadarOnCanvas(ctx, w / 2, 275, 65, criteriaAverages, accent, border);
  } else {
    ctx.fillStyle = textMid;
    ctx.font = '13px sans-serif';
    ctx.fillText('Utilise le mode Détaillé pour', w / 2, 260);
    ctx.fillText('débloquer ton profil de goûts (radar)', w / 2, 280);
  }

  // Genre et acteur favoris, côte à côte.
  ctx.font = '11px sans-serif';
  ctx.fillStyle = textMid;
  ctx.fillText('GENRE FAVORI', w * 0.28, 345);
  ctx.fillText('ACTEUR FAVORI', w * 0.72, 345);
  ctx.fillStyle = textHi;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(topGenre || '—', w * 0.28, 365);
  ctx.fillText(topActor || '—', w * 0.72, 365);

  // Badges débloqués : jusqu'à 6 pastilles, pleines si débloquées.
  const unlocked = (badges || []).filter(b => b.unlocked).slice(0, 6);
  const badgeY = 400;
  const badgeR = 14;
  const totalBadgeWidth = unlocked.length * (badgeR * 2 + 10) - 10;
  let bx = w / 2 - totalBadgeWidth / 2 + badgeR;
  unlocked.forEach(() => {
    ctx.beginPath();
    ctx.arc(bx, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();
    bx += badgeR * 2 + 10;
  });
  if (unlocked.length > 0) {
    ctx.fillStyle = textMid;
    ctx.font = '10px sans-serif';
    ctx.fillText(`${unlocked.length} badge${unlocked.length > 1 ? 's' : ''} débloqué${unlocked.length > 1 ? 's' : ''}`, w / 2, badgeY + 32);
  }

  // Pied de carte : membre depuis + temps visionné.
  ctx.fillStyle = textMid;
  ctx.font = '11px sans-serif';
  ctx.fillText(`Membre depuis ${memberSinceStr || '—'} · ${formatWatchTime(totalMinutes)} de films`, w / 2, h - 26);

  drawFilmStripBand(ctx, h - 16, w, accent);
}

// Ludex 2.0 : partage natif (Web Share API) quand le navigateur le permet —
// repli sur le téléchargement classique sinon (desktop, ou navigateurs qui
// ne supportent pas le partage de FICHIERS spécifiquement, distinct du
// partage de simple texte/lien que beaucoup supportent déjà). .toBlob() +
// File plutôt que .toDataURL() seul : c'est ce qui permet de partager une
// vraie image, pas juste un lien vers elle.
document.getElementById('profile-share-btn').addEventListener('click', () => {
  const canvas = document.getElementById('profile-share-canvas');
  if (!canvas || !canvas.getContext || !canvas.getContext('2d')) {
    showToast("Ton navigateur ne permet pas de générer cette image.");
    return;
  }
  canvas.toBlob(async (blob) => {
    if (!blob) { showToast("Impossible de générer l'image."); return; }
    const file = new File([blob], 'ludex-profil.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Ma carte de profil Ludex' });
        return; // partage réussi, rien de plus à faire
      } catch (e) {
        if (e.name === 'AbortError') return; // l'utilisateur a juste annulé — pas une erreur à signaler
        // toute autre erreur (rare) : on retombe sur le téléchargement classique ci-dessous
      }
    }
    const link = document.createElement('a');
    link.download = 'ludex-profil.png';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Image téléchargée.');
  }, 'image/png');
});

// ═══════════════════════════════════════════
//  RÉTROSPECTIVE ANNUELLE ("WRAPPED")
// ═══════════════════════════════════════════
const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function formatMonthLabel(monthKey) {
  // monthKey au format "2026-03"
  const [y, m] = monthKey.split('-');
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${y}`;
}

// Année à retenir par défaut : la plus récente qui a des films notés (pas
// forcément l'année civile en cours, si l'utilisateur vient de commencer ou
// n'a rien noté depuis un moment).
function getWrappedDefaultYear(history) {
  const years = history
    .map(h => { const d = h.savedAt || h.date; return d ? parseInt(d.slice(0, 4), 10) : null; })
    .filter(Boolean);
  return years.length > 0 ? Math.max(...years) : new Date().getFullYear();
}

function buildWrappedSlides(stats) {
  const slides = [];

  slides.push(`
    <div class="wrapped-slide-eyebrow">Ton année ${stats.year}</div>
    <div class="wrapped-slide-big">${stats.totalFilms}</div>
    <div class="wrapped-slide-label">film${stats.totalFilms > 1 ? 's' : ''} noté${stats.totalFilms > 1 ? 's' : ''}</div>
    <div class="wrapped-slide-detail">Voyons ce que ${stats.totalFilms > 1 ? 'ces films disent' : 'ce film dit'} de ton année cinéma...</div>
  `);

  if (stats.topGenre || stats.topDirector) {
    slides.push(`
      <div class="wrapped-slide-eyebrow">Tes habitudes</div>
      ${stats.topGenre ? `<div class="wrapped-slide-label">🎭 Genre favori : ${escAttr(stats.topGenre.name)}</div><div class="wrapped-slide-detail">${stats.topGenre.count} film${stats.topGenre.count > 1 ? 's' : ''}</div>` : ''}
      ${stats.topDirector ? `<div class="wrapped-slide-label" style="margin-top:22px;">🎬 Réalisateur favori : ${escAttr(stats.topDirector.name)}</div><div class="wrapped-slide-detail">${stats.topDirector.count} film${stats.topDirector.count > 1 ? 's' : ''}</div>` : ''}
    `);
  }

  if (stats.topMonth || stats.bestRated) {
    slides.push(`
      <div class="wrapped-slide-eyebrow">Les temps forts</div>
      ${stats.topMonth ? `<div class="wrapped-slide-label">📅 Mois le plus actif</div><div class="wrapped-slide-detail">${formatMonthLabel(stats.topMonth.name)} — ${stats.topMonth.count} film${stats.topMonth.count > 1 ? 's' : ''}</div>` : ''}
      ${stats.bestRated ? `<div class="wrapped-slide-label" style="margin-top:22px;">⭐ Ton coup de cœur</div><div class="wrapped-slide-detail">${escAttr(stats.bestRated.title)} — ${stats.bestRated.score}/10</div>` : ''}
    `);
  }

  slides.push(`
    <div class="wrapped-slide-eyebrow">Le récap'</div>
    <div class="wrapped-slide-big" style="font-size:2.2rem;">${stats.avgScore.toFixed(1)}<span style="font-size:1.2rem;color:var(--text-mid);">/10</span></div>
    <div class="wrapped-slide-label">note moyenne de l'année</div>
    <div class="wrapped-slide-detail">${formatWatchTime(stats.totalMinutes)} passées devant l'écran</div>
  `);

  slides.push(`
    <div class="wrapped-slide-eyebrow">À partager</div>
    <div class="wrapped-share-canvas-wrap"><canvas id="wrapped-share-canvas" width="360" height="480"></canvas></div>
    <button type="button" class="wrapped-share-btn" id="wrapped-share-download-btn">Télécharger l'image</button>
  `);

  return slides;
}

function drawWrappedShareCard(stats) {
  const canvas = document.getElementById('wrapped-share-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;

  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue('--surface').trim() || '#1f2935';
  const bg2 = styles.getPropertyValue('--bg').trim() || '#14181c';
  const textHi = styles.getPropertyValue('--text-hi').trim() || '#fff';
  const textMid = styles.getPropertyValue('--text-mid').trim() || '#9ab';
  const accent = styles.getPropertyValue('--orange').trim() || '#ff8000';
  const fontHeading = (styles.getPropertyValue('--font-heading').trim() || 'sans-serif').split(',')[0].replace(/['"]/g, '');

  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `900 24px "${fontHeading}", sans-serif`;
  ctx.fillText(`LUDEX WRAPPED ${stats.year}`, w / 2, 55);

  ctx.fillStyle = textHi;
  ctx.font = `900 80px "${fontHeading}", sans-serif`;
  ctx.fillText(String(stats.totalFilms), w / 2, 175);
  ctx.fillStyle = textMid;
  ctx.font = `bold 13px "${fontHeading}", sans-serif`;
  ctx.fillText(`FILM${stats.totalFilms > 1 ? 'S' : ''} EN ${stats.year}`, w / 2, 198);

  const rows = [
    ['Note moyenne', `${stats.avgScore.toFixed(1)}/10`],
    ['Genre favori', stats.topGenre?.name || '—'],
    ['Réalisateur favori', stats.topDirector?.name || '—'],
    ['Coup de cœur', stats.bestRated?.title || '—'],
    ['Temps visionné', formatWatchTime(stats.totalMinutes)],
  ];
  let y = 250;
  rows.forEach(([label, val]) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = textMid;
    ctx.font = '11px sans-serif';
    ctx.fillText(label.toUpperCase(), 30, y);
    ctx.fillStyle = textHi;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(val, 30, y + 22);
    y += 46;
  });
}

(function initWrappedModal() {
  const modal = document.getElementById('wrapped-modal');
  const entryCard = document.getElementById('wrapped-entry-card');
  const closeBtn = document.getElementById('wrapped-close-btn');
  const slidesEl = document.getElementById('wrapped-slides');
  const dotsEl = document.getElementById('wrapped-dots');
  const prevBtn = document.getElementById('wrapped-prev-btn');
  const nextBtn = document.getElementById('wrapped-next-btn');
  if (!modal || !entryCard) return;

  let slides = [];
  let current = 0;

  function renderCurrentSlide() {
    slidesEl.innerHTML = slides.map((html, i) =>
      `<div class="wrapped-slide${i === current ? ' active' : ''}${i < current ? ' leaving-left' : ''}">${html}</div>`
    ).join('');
    dotsEl.innerHTML = slides.map((_, i) => `<span class="onboarding-dot${i === current ? ' active' : ''}"></span>`).join('');
    prevBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = current === slides.length - 1 ? 'Fermer' : 'Suivant';

    if (current === slides.length - 1) {
      const shareBtn = document.getElementById('wrapped-share-download-btn');
      drawWrappedShareCard(window._currentWrappedStats);
      shareBtn?.addEventListener('click', () => {
        const canvas = document.getElementById('wrapped-share-canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `ludex-wrapped-${window._currentWrappedStats.year}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Image téléchargée.');
      });
    }
  }

  entryCard.addEventListener('click', () => {
    const history = loadHistory();
    const year = getWrappedDefaultYear(history);
    const stats = computeWrappedStats(history, year);
    window._currentWrappedStats = stats;
    slides = buildWrappedSlides(stats);
    current = 0;
    renderCurrentSlide();
    lastFocusedBeforeModal = document.activeElement;
    modal.classList.add('open');
    closeBtn.focus();
  });

  nextBtn.addEventListener('click', () => {
    if (current === slides.length - 1) { closeModal(modal); return; }
    current++;
    renderCurrentSlide();
  });
  prevBtn.addEventListener('click', () => {
    if (current === 0) return;
    current--;
    renderCurrentSlide();
  });
  closeBtn.addEventListener('click', () => closeModal(modal));
})();

// ═══════════════════════════════════════════
//  EXPORT / IMPORT
// ═══════════════════════════════════════════
const LAST_EXPORT_KEY = 'lbx_last_export_at';

document.getElementById('export-btn').addEventListener('click', () => {
  const history = loadHistory();
  const tvShows = typeof loadTvShows === 'function' ? loadTvShows() : [];
  if (!history.length && !tvShows.length) { showToast('Rien à exporter.'); return; }
  const payload = { history, tvShows };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ludex-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  const banner = document.getElementById('backup-reminder');
  if (banner) banner.remove();
  const parts = [];
  if (history.length) parts.push(`${history.length} film${history.length > 1 ? 's' : ''}`);
  if (tvShows.length) parts.push(`${tvShows.length} série${tvShows.length > 1 ? 's' : ''}`);
  showToast(`${parts.join(' · ')} exporté${(history.length + tvShows.length) > 1 ? 's' : ''}`);
});

document.getElementById('import-trigger').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

function importLudexJson(text) {
  const data = JSON.parse(text);
  let history, tvShows;
  if (Array.isArray(data)) {
    // Ancienne sauvegarde (avant l'ajout du support séries) : un simple
    // tableau de films, sans enveloppe — toujours acceptée telle quelle.
    history = data;
    tvShows = [];
  } else if (data && typeof data === 'object' && (Array.isArray(data.history) || Array.isArray(data.tvShows))) {
    history = Array.isArray(data.history) ? data.history : [];
    tvShows = Array.isArray(data.tvShows) ? data.tvShows : [];
  } else {
    throw new Error('Format invalide');
  }

  const parts = [];
  if (history.length) parts.push(`${history.length} film${history.length > 1 ? 's' : ''}`);
  if (tvShows.length) parts.push(`${tvShows.length} série${tvShows.length > 1 ? 's' : ''}`);
  if (parts.length === 0) { showToast('Sauvegarde vide, rien à importer.'); return; }

  openModal(
    "Importer la sauvegarde",
    `Importer ${parts.join(' et ')} ? Cela fusionnera avec vos données actuelles (les doublons seront ignorés).`,
    () => {
      let addedFilms = 0, addedShows = 0, addedSeasons = 0;

      if (history.length) {
        const existing = loadHistory();
        const existingKeys = new Set(existing.map(h => (h.title + '|' + (h.year||'')).toLowerCase()));
        // Normalisation au passage : une vieille sauvegarde réimportée porte
        // l'ancienne forme du schéma — même fonction que la migration v2.
        const toAdd = history.filter(d => !existingKeys.has((String(d.title ?? '') + '|' + (d.year||'')).toLowerCase())).map(normalizeHistoryItemV2);
        addedFilms = toAdd.length;
        saveHistory([...toAdd, ...existing]);
      }

      if (tvShows.length && typeof loadTvShows === 'function') {
        const existingShows = loadTvShows();
        tvShows.forEach(importedShow => {
          let localShow = existingShows.find(s => String(s.tmdbTvId) === String(importedShow.tmdbTvId));
          if (!localShow) {
            localShow = { tmdbTvId: importedShow.tmdbTvId, title: importedShow.title, poster_path: importedShow.poster_path, genre: importedShow.genre, seasons: {} };
            existingShows.push(localShow);
            addedShows++;
          }
          // Par saison : n'ajoute que celles absentes localement — même
          // philosophie "doublons ignorés" que les films, plutôt que
          // d'inventer une règle de fusion (plus regardée / plus récente)
          // qui n'a pas d'équivalent côté films.
          Object.entries(importedShow.seasons || {}).forEach(([key, season]) => {
            if (!localShow.seasons[key]) {
              localShow.seasons[key] = season;
              addedSeasons++;
            }
          });
        });
        saveTvShows(existingShows);
      }

      renderAll();
      if (typeof renderTvHistory === 'function' && document.getElementById('hist-tab-tv')?.classList.contains('active')) renderTvHistory();
      if (typeof statsDirty !== 'undefined') statsDirty = true;

      const resultParts = [];
      if (addedFilms) resultParts.push(`${addedFilms} film${addedFilms > 1 ? 's' : ''}`);
      if (addedShows) resultParts.push(`${addedShows} série${addedShows > 1 ? 's' : ''}`);
      if (addedSeasons > addedShows) resultParts.push(`${addedSeasons} saison${addedSeasons > 1 ? 's' : ''} au total`);
      showToast(resultParts.length ? `${resultParts.join(' · ')} importé${(addedFilms + addedSeasons) > 1 ? 's' : ''}` : 'Rien de nouveau à importer (déjà présent)');
    }
  );
}

// Import Letterboxd : accepte diary.csv, ratings.csv ou watched.csv de
// l'export officiel Letterboxd (Réglages -> Import & Export). Le parsing et
// le mapping (note /5 -> /10, colonnes détectées par l'en-tête) sont des
// fonctions pures testées dans tests/letterboxd-import.test.js.
function importLetterboxdCsv(text) {
  const rows = parseCsv(text);
  const { items, kind } = mapLetterboxdCsv(rows);
  if (!kind) { showToast('CSV non reconnu — attendu : un export Letterboxd (diary, ratings ou watched).'); return; }
  if (items.length === 0) { showToast('Aucun film trouvé dans ce fichier.'); return; }

  const existing = loadHistory();
  const existingKeys = new Set(existing.map(h => (h.title + '|' + (h.year||'')).toLowerCase()));
  const toAdd = items.filter(d => !existingKeys.has((d.title + '|' + (d.year||'')).toLowerCase()));
  const dupes = items.length - toAdd.length;

  const kindLabel = { diary: 'journal', ratings: 'notes', watched: 'films vus' }[kind];
  openModal(
    'Import Letterboxd',
    `Fichier ${kindLabel} détecté : ${items.length} film${items.length > 1 ? 's' : ''}, dont ${toAdd.length} nouveau${toAdd.length > 1 ? 'x' : ''}${dupes > 0 ? ` (${dupes} déjà présent${dupes > 1 ? 's' : ''}, ignorés)` : ''}. Importer ?`,
    () => {
      const merged = [...toAdd, ...loadHistory()];
      saveHistory(merged);
      renderAll();
      showToast(`${toAdd.length} film${toAdd.length > 1 ? 's' : ''} importé${toAdd.length > 1 ? 's' : ''} depuis Letterboxd 🎬`);
    }
  );
}

document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target.result;
    try {
      // Détection automatique du format : un JSON valide commence par [ ou {,
      // sinon on tente le chemin CSV Letterboxd. Le nom du fichier n'est pas
      // fiable (téléchargements renommés), le contenu l'est.
      const trimmed = text.trimStart();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        importLudexJson(text);
      } else {
        importLetterboxdCsv(text);
      }
    } catch {
      showToast('Fichier non reconnu (attendu : sauvegarde Ludex .json ou export Letterboxd .csv).');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ── Rappel de sauvegarde ──
// localStorage peut être effacé par le navigateur (nettoyage de stockage,
// réinstallation...). Si la dernière sauvegarde date de plus de 30 jours (ou
// n'a jamais eu lieu) et qu'il y a au moins 10 films en jeu, une bannière
// discrète le rappelle — fermable, et re-proposée au plus tous les 7 jours.
const BACKUP_SNOOZE_KEY = 'lbx_backup_snoozed_at';
function maybeShowBackupReminder() {
  const history = loadHistory();
  const tvShows = typeof loadTvShows === 'function' ? loadTvShows() : [];
  if (history.length + tvShows.length < 10) return;

  const lastExport = localStorage.getItem(LAST_EXPORT_KEY);
  const days = lastExport ? (Date.now() - new Date(lastExport).getTime()) / 86400000 : Infinity;
  if (days < 30) return;

  const snoozed = localStorage.getItem(BACKUP_SNOOZE_KEY);
  if (snoozed && (Date.now() - new Date(snoozed).getTime()) / 86400000 < 7) return;

  const banner = document.createElement('div');
  banner.id = 'backup-reminder';
  banner.className = 'backup-reminder';
  banner.innerHTML = `
    <span class="backup-reminder-text">${lastExport ? 'Dernière sauvegarde il y a plus de 30 jours.' : `${history.length + tvShows.length} élément${(history.length + tvShows.length) > 1 ? 's' : ''} noté${(history.length + tvShows.length) > 1 ? 's' : ''}, aucune sauvegarde.`}</span>
    <button type="button" class="backup-reminder-btn" id="backup-reminder-export">Exporter</button>
    <button type="button" class="backup-reminder-close" id="backup-reminder-close" aria-label="Plus tard">✕</button>
  `;
  document.body.appendChild(banner);
  document.getElementById('backup-reminder-export').addEventListener('click', () => {
    document.getElementById('export-btn').click();
  });
  document.getElementById('backup-reminder-close').addEventListener('click', () => {
    localStorage.setItem(BACKUP_SNOOZE_KEY, new Date().toISOString());
    banner.remove();
  });
}
// Différé pour ne pas gêner le premier rendu (et laisser l'onboarding passer devant)
setTimeout(maybeShowBackupReminder, 2500);

// ═══════════════════════════════════════════
//  WATCHLIST & DYNAMIC RECOMMENDATIONS
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
//  WATCHLISTS MULTIPLES
// ═══════════════════════════════════════════
// Plusieurs listes nommées ("À voir", "Halloween", "Suggestions de Marie"...)
// plutôt qu'une seule. loadWatchlist()/saveWatchlist() ciblent toujours
// implicitement la liste ACTIVE — tout le code existant (rendu, swipe,
// synchro cloud, Découvrir) continue de fonctionner sans modification, sans
// savoir qu'il y a désormais plusieurs listes possibles.
const WATCHLISTS_META_KEY = 'lbx_watchlists_meta';
const ACTIVE_WATCHLIST_KEY = 'lbx_active_watchlist_id';
const LEGACY_WATCHLIST_KEY = 'lbx_watchlist'; // ancienne clé (liste unique), migrée au premier chargement

function loadWatchlistsMeta() {
  try { return JSON.parse(localStorage.getItem(WATCHLISTS_META_KEY)) || []; } catch { return []; }
}
function saveWatchlistsMeta(meta) {
  localStorage.setItem(WATCHLISTS_META_KEY, JSON.stringify(meta));
}
function watchlistStorageKey(id) { return `lbx_watchlist_${id}`; }
function watchlistTombstonesKey(id) { return `lbx_watchlist_tombstones_${id}`; }
const WATCHLIST_LIST_TOMBSTONES_KEY = 'lbx_watchlist_list_tombstones'; // listes ENTIÈRES supprimées (pas juste des items)
const LEGACY_WATCHLIST_TOMBSTONES_KEY = 'lbx_watchlist_tombstones'; // ancienne clé (liste unique), migrée avec le reste

// Migration ponctuelle : si l'ancienne clé unique existe et qu'aucune liste
// nommée n'a encore été créée, on la transforme en une première liste "À voir"
// — aucune perte de données pour les utilisateurs déjà en place.
(function migrateLegacyWatchlist() {
  if (loadWatchlistsMeta().length > 0) return; // déjà migré
  let legacyItems = [];
  try { legacyItems = JSON.parse(localStorage.getItem(LEGACY_WATCHLIST_KEY)) || []; } catch {}
  let legacyTombstones = [];
  try { legacyTombstones = JSON.parse(localStorage.getItem(LEGACY_WATCHLIST_TOMBSTONES_KEY)) || []; } catch {}
  const defaultId = 'default';
  saveWatchlistsMeta([{ id: defaultId, name: 'À voir' }]);
  localStorage.setItem(watchlistStorageKey(defaultId), JSON.stringify(legacyItems));
  localStorage.setItem(watchlistTombstonesKey(defaultId), JSON.stringify(legacyTombstones));
  localStorage.setItem(ACTIVE_WATCHLIST_KEY, defaultId);
})();

function getActiveWatchlistId() {
  let id = localStorage.getItem(ACTIVE_WATCHLIST_KEY);
  const meta = loadWatchlistsMeta();
  if (!id || !meta.find(l => l.id === id)) {
    id = meta[0]?.id || 'default';
    localStorage.setItem(ACTIVE_WATCHLIST_KEY, id);
  }
  return id;
}
function setActiveWatchlistId(id) {
  localStorage.setItem(ACTIVE_WATCHLIST_KEY, id);
}

function createWatchlistList(name) {
  const meta = loadWatchlistsMeta();
  const id = 'wl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  meta.push({ id, name: name.trim() || 'Nouvelle liste' });
  saveWatchlistsMeta(meta);
  localStorage.setItem(watchlistStorageKey(id), JSON.stringify([]));
  return id;
}
function renameWatchlistList(id, newName) {
  const meta = loadWatchlistsMeta();
  const entry = meta.find(l => l.id === id);
  if (entry) { entry.name = newName.trim() || entry.name; saveWatchlistsMeta(meta); }
}
function deleteWatchlistList(id) {
  let meta = loadWatchlistsMeta();
  if (meta.length <= 1) return false; // toujours garder au moins une liste
  meta = meta.filter(l => l.id !== id);
  saveWatchlistsMeta(meta);
  localStorage.removeItem(watchlistStorageKey(id));
  localStorage.removeItem(watchlistTombstonesKey(id));
  recordTombstone(WATCHLIST_LIST_TOMBSTONES_KEY, id); // pour que la suppression de la LISTE elle-même se propage via la synchro
  if (getActiveWatchlistId() === id) setActiveWatchlistId(meta[0].id);
  return true;
}

function loadWatchlist(listId) {
  try { return JSON.parse(localStorage.getItem(watchlistStorageKey(listId || getActiveWatchlistId()))) || []; } catch { return []; }
}
function saveWatchlist(list, listId) {
  localStorage.setItem(watchlistStorageKey(listId || getActiveWatchlistId()), JSON.stringify(list));
}

// ── Ludex 2.0 : tri et filtre (voir Ludex_Specifications_Watchlist) ──
// État séparé de celui de l'Historique (activeGenre/activeScoreFilter,
// 06a-history-list.js) — même vocabulaire visuel (.genre-chip) mais deux
// écrans indépendants, sinon choisir un genre ici filtrerait aussi
// l'Historique par erreur.
let wlSortOrder = 'recent';
let wlActiveGenre = null;
let wlDurationFilterOn = false;

function sortWatchlist(list) {
  if (wlSortOrder === 'rating') {
    // Les films sans note connue (ajoutés avant ce champ, ou échec réseau
    // au moment de l'ajout) descendent en fin de liste plutôt que de
    // fausser le tri en tête à cause d'un `undefined` traité comme 0.
    return [...list].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  }
  if (wlSortOrder === 'year') {
    return [...list].sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
  }
  return list; // 'recent' = déjà l'ordre de stockage (unshift à l'ajout)
}

function filterWatchlist(list) {
  return list.filter(item => {
    if (wlActiveGenre && !(item.genre || '').split(',').map(g => g.trim()).includes(wlActiveGenre)) return false;
    if (wlDurationFilterOn && !(typeof item.runtime === 'number' && item.runtime < 120)) return false;
    return true;
  });
}

function renderWlGenreChips(list) {
  const genres = getGenres(list);
  const row = document.getElementById('wl-genre-fold');
  const chips = document.getElementById('wl-genre-chips');
  const currentLabel = document.getElementById('wl-genre-fold-current');
  if (!row || !chips) return;
  if (genres.length === 0) { row.style.display = 'none'; return; }
  row.style.display = 'block';
  if (currentLabel) currentLabel.textContent = wlActiveGenre || 'Tous';
  chips.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'genre-chip all-chip' + (wlActiveGenre === null ? ' active' : '');
  allChip.textContent = 'Tous';
  allChip.addEventListener('click', () => { wlActiveGenre = null; renderWatchlist(); });
  chips.appendChild(allChip);

  genres.forEach(g => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip' + (wlActiveGenre === g ? ' active' : '');
    chip.textContent = g;
    chip.addEventListener('click', () => {
      wlActiveGenre = (wlActiveGenre === g) ? null : g;
      renderWatchlist();
    });
    chips.appendChild(chip);
  });
}

document.getElementById('wl-sort-row')?.addEventListener('click', (e) => {
  const durationBtn = e.target.closest('#wl-duration-filter');
  if (durationBtn) {
    wlDurationFilterOn = !wlDurationFilterOn;
    durationBtn.classList.toggle('active', wlDurationFilterOn);
    renderWatchlist();
    return;
  }
  const sortBtn = e.target.closest('.wl-sort-btn[data-sort]');
  if (!sortBtn) return;
  wlSortOrder = sortBtn.dataset.sort;
  document.querySelectorAll('#wl-sort-row .wl-sort-btn[data-sort]').forEach(b => b.classList.toggle('active', b === sortBtn));
  renderWatchlist();
});


// Swipe sur un film de la watchlist : glisser à gauche = retirer, à droite =
// "vu, noter" (réutilise removeWatchlist/watchlistToForm, les mêmes fonctions
// que les boutons ✕/⭐ — juste un chemin de déclenchement en plus, pas de
// nouvelle logique). stopPropagation() évite que ce geste horizontal ne
// déclenche AUSSI le swipe global de changement d'onglet.
function attachWatchlistSwipeHandlers(cardEl, idx) {
  // Ludex 2.0 : en grille d'affiches (thème par défaut), le swipe horizontal
  // sur une cellule étroite n'a plus vraiment de sens visuellement — les
  // actions (noter / retirer) restent disponibles via les boutons toujours
  // visibles en overlay (voir styles.css, .wl-actions en mode grille).
  if (isDefaultComposition()) return;

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

    // 240ms = --dur-base (styles.css :root) : doit rester synchronisé avec la
    // durée de la transition d'opacité/translation ci-dessus. L'ancien délai
    // (200ms) coupait l'animation de sortie 40ms avant sa fin réelle.
    const EXIT_DUR_MS = 240;
    if (dx <= -SWIPE_THRESHOLD) {
      cardEl.classList.add('wl-swipe-out-left');
      contentEl.style.transform = 'translateX(-110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(cardEl, 'strong');
      setTimeout(() => removeWatchlist(idx), EXIT_DUR_MS);
    } else if (dx >= SWIPE_THRESHOLD) {
      cardEl.classList.add('wl-swipe-out-right');
      contentEl.style.transform = 'translateX(110%)';
      if (navigator.vibrate) navigator.vibrate(20);
      hapticPulse(cardEl, 'strong');
      setTimeout(() => watchlistToForm(idx), EXIT_DUR_MS);
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

// Ludex 2.0 : suggestions concrètes dans l'état vide — plutôt qu'un bouton
// "Découvrir" générique qui renvoie l'utilisateur bredouille à un autre
// onglet, 3 films populaires directement ajoutables en un tap. Réutilise le
// même endpoint tendances que Découvrir (trending=true), pas de nouvelle
// route à créer. Mise en cache mémoire simple : ne re-fetch pas à chaque
// fois que la watchlist active repasse à vide dans la même session.
let _wlEmptySuggestionsCache = null;
async function renderWatchlistEmptySuggestions() {
  const wrap = document.getElementById('wl-empty-suggestions');
  if (!wrap) return;
  try {
    let items = _wlEmptySuggestionsCache;
    if (!items) {
      const res = await fetch('/api/search?trending=true');
      const data = await res.json();
      items = (data.results || []).filter(m => m.media_type === 'movie' && m.poster_path).slice(0, 3);
      _wlEmptySuggestionsCache = items;
    }
    if (items.length === 0) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `
      <div class="wl-empty-suggestions-title">Quelques suggestions pour commencer :</div>
      <div class="wl-empty-suggestions-row">
        ${items.map(m => `
          <div class="wl-empty-sugg-card">
            <img class="wl-empty-sugg-poster" src="${tmdbImage(m.poster_path, 'w200')}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">
            <div class="wl-empty-sugg-title">${escAttr(m.title)}</div>
            <button type="button" class="wl-empty-sugg-btn" data-movie-id="${m.id}" data-movie-title="${escAttr(m.title)}" data-movie-year="${(m.release_date || '').slice(0,4)}" data-poster="${escAttr(m.poster_path)}">+ Ajouter</button>
          </div>`).join('')}
      </div>`;
  } catch (e) {
    console.warn('Impossible de charger les suggestions', e);
    wrap.innerHTML = '';
  }
}
// Délégué depuis #watchlist-list (toujours présent), pas depuis
// #wl-empty-suggestions lui-même — cet élément n'existe qu'une fois la
// liste vide effectivement rendue, jamais au moment où ce script s'exécute.
document.getElementById('watchlist-list')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.wl-empty-sugg-btn');
  if (!btn) return;
  addToWatchlistFromTMDb(
    { id: Number(btn.dataset.movieId), title: btn.dataset.movieTitle, poster_path: btn.dataset.poster },
    btn.dataset.movieYear
  );
});

function renderWatchlist() {
  const list = loadWatchlist();
  const container = document.getElementById('watchlist-list');
  const badge = document.getElementById('watchlist-count-badge');
  badge.textContent = list.length + ' film' + (list.length > 1 ? 's' : '');

  renderWlGenreChips(list);
  document.getElementById('wl-sort-row').style.display = list.length === 0 ? 'none' : 'flex';

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.target}</div>Rien au programme pour l'instant — ajoute les films que tu veux voir.<button type="button" class="empty-state-cta" id="empty-state-watchlist-cta">Découvrir des films à ajouter</button></div><div class="wl-empty-suggestions" id="wl-empty-suggestions"></div>`;
    window._justSavedWatchlistTitle = null;
    renderWatchlistEmptySuggestions();
    return;
  }

  const visible = filterWatchlist(sortWatchlist(list));
  if (visible.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.search}</div>Aucun film ne correspond à ce filtre.</div>`;
    window._justSavedWatchlistTitle = null;
    return;
  }

  container.innerHTML = '';
  visible.forEach((item) => {
    const i = list.indexOf(item); // index RÉEL dans la liste non triée — c'est lui que removeWatchlist()/watchlistToForm() attendent (voir attributs onclick plus bas), pas la position affichée après tri/filtre.
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
        <div class="wl-card-open" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
          ${posterHtml}
          <div class="wl-body">
            <div class="wl-title">${escAttr(item.title)}</div>
            <div class="wl-meta">${[item.year, item.genre].filter(Boolean).join(' · ')}</div>
            <div class="wl-providers" id="wl-providers-${i}">
              <span class="wl-provider-loading">⏳ Chargement streaming...</span>
            </div>
          </div>
        </div>
        <div class="wl-actions">
          <button class="wl-btn rate" onclick="watchlistToForm(${i})" title="Je l'ai vu, noter" aria-label="Noter ${escAttr(item.title)}, vu">${ICONS.star}</button>
          <button class="wl-btn del" onclick="removeWatchlist(${i})" title="Retirer" aria-label="Retirer ${escAttr(item.title)} de la watchlist">${ICONS.close}</button>
        </div>
      </div>`;

    container.appendChild(div);
    applyPosterAccent(item.poster, div);
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

// Normalise un nom de plateforme pour comparaison souple (ex: "Apple TV+" et
// "apple tv" doivent se reconnaître comme la même chose malgré la casse et le
// "+"/"Plus"), plutôt que d'exiger une correspondance exacte fragile face aux
// variations de nommage entre ce qu'on propose dans les réglages et ce que
// TMDb renvoie réellement.
function normalizeProviderName(name) {
  return (name || '').toLowerCase().replace(/\+/g, ' plus').replace(/\s+/g, ' ').trim();
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

    // Si l'utilisateur a précisé les plateformes qu'il possède (réglages), on
    // ne garde que celles-là — sinon (rien coché), on affiche tout, comme
    // avant l'ajout de cette fonctionnalité.
    const owned = loadOwnedProviders().map(normalizeProviderName);
    const filterOwned = (list) => owned.length === 0 ? list : list.filter(p => {
      const n = normalizeProviderName(p.provider_name);
      return owned.some(o => n.includes(o) || o.includes(n));
    });

    const allFlat = providerRoot.flatrate || [];
    const allRent = providerRoot.rent || [];
    const flat = filterOwned(allFlat);
    const rentOnly = filterOwned(allRent).filter(r => !flat.find(f => f.provider_id === r.provider_id));

    let html = '';
    if (flat.length > 0) {
      html += `<span class="wl-provider-tag flatrate">Inclus</span>`;
      flat.slice(0, 5).forEach(p => {
        html += `<img class="wl-provider-logo" src="${tmdbImage(p.logo_path, 'original')}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }
    if (rentOnly.length > 0) {
      html += `<span class="wl-provider-tag rent">Location</span>`;
      rentOnly.slice(0, 4).forEach(p => {
        html += `<img class="wl-provider-logo" src="${tmdbImage(p.logo_path, 'original')}" title="${p.provider_name}" alt="${escAttr(p.provider_name)}" loading="lazy">`;
      });
    }

    if (!html) {
      // Distingue "vraiment nulle part en streaming" de "disponible, mais pas
      // sur TES plateformes" — les deux messages n'ont pas la même utilité.
      const availableElsewhere = owned.length > 0 && (allFlat.length > 0 || allRent.length > 0);
      el.innerHTML = availableElsewhere
        ? '<span class="wl-no-streaming">Disponible, mais pas sur tes plateformes 📵</span>'
        : '<span class="wl-no-streaming">Non disponible en streaming 🇧🇪</span>';
    } else {
      el.innerHTML = html;
    }
  } catch {
    if (el) el.innerHTML = '<span class="wl-no-streaming">Providers indisponibles</span>';
  }
}

async function addToWatchlistFromTMDb(movie, year) {
  // Ne fait plus l'ajout directement : demande d'abord dans quelle liste,
  // avec la possibilité d'en créer une nouvelle à la volée.
  openWatchlistPicker(movie, year);
}

async function addToSpecificWatchlist(movie, year, listId) {
  const list = loadWatchlist(listId);
  const key = (movie.title + '|' + year).toLowerCase();
  if (list.find(i => (i.title + '|' + (i.year||'')).toLowerCase() === key)) {
    showToast('Déjà dans cette liste.');
    return;
  }

  // Ludex 2.0 : note et durée capturées ici, réutilisant cet appel déjà fait
  // pour le genre — aucun appel réseau supplémentaire — pour alimenter le
  // tri "Note TMDb" et le filtre "− de 2h" sans jamais avoir à refaire cette
  // requête plus tard au moment d'afficher la liste.
  let genre = '', rating = null, runtime = null;
  try {
    const res = await fetch(`/api/search?id=${movie.id}`);
    const data = await res.json();
    genre = data.genres?.map(g => g.name).join(', ') || '';
    rating = typeof data.vote_average === 'number' ? data.vote_average : null;
    runtime = typeof data.runtime === 'number' ? data.runtime : null;
  } catch {}

  list.unshift({
    title: movie.title,
    year,
    poster: tmdbImage(movie.poster_path, 'w185'),
    genre,
    rating,
    runtime,
    tmdbId: movie.id,
    addedAt: new Date().toISOString()
  });
  saveWatchlist(list, listId);
  if (listId === getActiveWatchlistId()) {
    window._justSavedWatchlistTitle = movie.title.toLowerCase();
    renderWatchlist();
  }
  const listName = loadWatchlistsMeta().find(l => l.id === listId)?.name || 'la liste';
  showToast(`"${movie.title}" ajouté à "${listName}" 🎯`);
}

function openWatchlistPicker(movie, year) {
  const modal = document.getElementById('wl-picker-modal');
  const listEl = document.getElementById('wl-picker-list');
  const newRow = document.getElementById('wl-picker-new-row');
  const newForm = document.getElementById('wl-picker-new-form');
  const newBtn = document.getElementById('wl-picker-new-btn');
  const newInput = document.getElementById('wl-picker-new-input');
  const newConfirm = document.getElementById('wl-picker-new-confirm');
  const cancelBtn = document.getElementById('wl-picker-cancel-btn');
  if (!modal || !listEl) return;

  // Repart d'un état propre à chaque ouverture (le formulaire "nouvelle liste"
  // ne doit pas rester déplié d'une fois à l'autre).
  newForm.style.display = 'none';
  newBtn.style.display = 'flex';
  newInput.value = '';

  const meta = loadWatchlistsMeta();
  listEl.innerHTML = meta.map(l => {
    const count = loadWatchlist(l.id).length;
    return `<button type="button" class="wl-picker-item" data-list-id="${l.id}"><span>${escAttr(l.name)}</span><span class="wl-picker-item-count">${count} film${count > 1 ? 's' : ''}</span></button>`;
  }).join('');

  function pickList(listId) {
    addToSpecificWatchlist(movie, year, listId);
    closeModal(modal);
  }

  listEl.querySelectorAll('.wl-picker-item').forEach(btn => {
    btn.addEventListener('click', () => pickList(btn.dataset.listId));
  });

  newBtn.onclick = () => {
    newBtn.style.display = 'none';
    newForm.style.display = 'flex';
    newInput.focus();
  };
  newConfirm.onclick = () => {
    const name = newInput.value.trim();
    if (!name) { newInput.focus(); return; }
    const id = createWatchlistList(name);
    pickList(id);
  };
  newInput.onkeydown = (e) => { if (e.key === 'Enter') newConfirm.click(); };
  cancelBtn.onclick = () => closeModal(modal);

  lastFocusedBeforeModal = document.activeElement;
  modal.classList.add('open');
  (meta.length > 0 ? listEl.querySelector('.wl-picker-item') : newBtn)?.focus();
}

let deletedWlItemCache = null;
let deletedWlItemIndex = null;
let deletedWlListId = null;

window.removeWatchlist = function(idx) {
  const list = loadWatchlist();
  const item = list[idx];
  const title = item?.title;
  deletedWlItemCache = item || null;
  deletedWlItemIndex = idx;
  deletedWlListId = getActiveWatchlistId(); // au cas où l'utilisateur changerait de liste avant d'annuler
  list.splice(idx, 1);
  saveWatchlist(list);
  if (item) recordTombstone(watchlistTombstonesKey(getActiveWatchlistId()), watchlistItemKey(item));
  renderWatchlist();
  if (title) showToast(`"${title}" retiré`, true, 'undoWatchlistDelete');
};

window.undoWatchlistDelete = function() {
  if (!deletedWlItemCache || !deletedWlListId) return;
  // Réinsère dans la liste d'ORIGINE (pas forcément celle active maintenant,
  // si l'utilisateur a changé de liste pendant la fenêtre d'annulation).
  const key = watchlistStorageKey(deletedWlListId);
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key)) || []; } catch {}
  list.splice(Math.min(deletedWlItemIndex, list.length), 0, deletedWlItemCache);
  localStorage.setItem(key, JSON.stringify(list));
  removeTombstone(watchlistTombstonesKey(deletedWlListId), watchlistItemKey(deletedWlItemCache));
  if (getActiveWatchlistId() === deletedWlListId) renderWatchlist();
  showToast('Retrait annulé.');
  deletedWlItemCache = null;
};

window.watchlistToForm = function(idx) {
  const list = loadWatchlist();
  const item = list[idx];
  if (!item) return;
  searchEl.value = item.title;
  searchEl.dispatchEvent(new Event('input'));
  list.splice(idx, 1);
  saveWatchlist(list);
  recordTombstone(watchlistTombstonesKey(getActiveWatchlistId()), watchlistItemKey(item));
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
      const [res, personMatch] = await Promise.all([
        fetch(`/api/search?query=${encodeURIComponent(q)}`),
        fetchPersonMatch(q),
      ]);
      // readApiJson lève si l'API a réellement échoué, au lieu de laisser une
      // réponse d'erreur passer pour "0 résultat" (voir 03-foundation.js).
      const data = await readApiJson(res);
      if (!data.results?.length && !personMatch) { wlSuggestEl.style.display = 'none'; return; }
      wlSuggestEl.innerHTML = '';
      wlSuggestEl.style.display = 'block';

      if (personMatch) {
        const photoUrl = tmdbImage(personMatch.profile_path, 'w92');
        const personEl = document.createElement('div');
        personEl.className = 'wl-suggest-item';
        personEl.innerHTML = `
          ${photoUrl
            ? `<img class="wl-suggest-poster" style="border-radius:50%;object-fit:cover;" src="${photoUrl}" alt="Photo de ${escAttr(personMatch.name)}" loading="lazy">`
            : `<div class="wl-suggest-poster" style="display:flex;align-items:center;justify-content:center;">${ICONS.clapper}</div>`}
          <div>
            <div class="wl-suggest-title">🎬 ${escAttr(personMatch.name)}</div>
            <div class="wl-suggest-year">Voir sa filmographie</div>
          </div>`;
        personEl.addEventListener('click', () => {
          wlSuggestEl.style.display = 'none';
          openPersonDetailSheet(personMatch.id, personMatch.name);
        });
        wlSuggestEl.appendChild(personEl);
      }

      data.results.slice(0, 5).forEach(m => {
        const year = m.release_date?.slice(0, 4) || '';
        const el = document.createElement('div');
        el.className = 'wl-suggest-item';
        el.innerHTML = `
          ${m.poster_path
            ? `<img class="wl-suggest-poster" src="${tmdbImage(m.poster_path, 'w92')}" alt="Affiche de ${escAttr(m.title)}" loading="lazy">`
            : `<div class="wl-suggest-poster" style="display:flex;align-items:center;justify-content:center;">${ICONS.clapper}</div>`}
          <div>
            <div class="wl-suggest-title">${escAttr(m.title)}</div>
            <div class="wl-suggest-year">${year}</div>
          </div>`;
        el.addEventListener('click', () => {
          wlSuggestEl.style.display = 'none';
          wlInput.value = '';
          addToWatchlistFromTMDb(m, year);
        });
        wlSuggestEl.appendChild(el);
      });
    } catch (err) {
      wlSuggestEl.style.display = 'none';
      showToast(describeApiFailure(err));
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

// ─── Sélecteur de listes (onglets) ───────────────────────────────────────────
function renderWatchlistTabs() {
  const meta = loadWatchlistsMeta();
  const activeId = getActiveWatchlistId();
  const activeMeta = meta.find(l => l.id === activeId) || meta[0];
  const nameEl = document.getElementById('watchlist-active-name');
  if (nameEl) nameEl.textContent = activeMeta ? activeMeta.name : 'À voir';

  const row = document.getElementById('wl-lists-row');
  if (!row) return;
  row.innerHTML = meta.map(l =>
    `<button type="button" class="wl-list-pill${l.id === activeId ? ' active' : ''}" data-id="${l.id}">${escAttr(l.name)}</button>`
  ).join('') + `<button type="button" class="wl-list-pill wl-list-add" id="wl-list-add-btn">${ICONS.plus} Nouvelle liste</button>`;
}

function openWlListManageMenu(id) {
  const meta = loadWatchlistsMeta();
  const entry = meta.find(l => l.id === id);
  if (!entry) return;

  actionSheetTitleEl.textContent = entry.name;
  const actions = [
    { label: 'Renommer', icon: ICONS.edit, onClick: () => openWlListModal('rename', id) },
    {
      label: 'Supprimer cette liste', icon: ICONS.trash, danger: true,
      onClick: () => {
        if (loadWatchlistsMeta().length <= 1) { showToast('Impossible de supprimer la dernière liste.'); return; }
        openModal('Supprimer la liste', `Supprimer "${escAttr(entry.name)}" et tous ses films ? Cette action est définitive.`, () => {
          deleteWatchlistList(id);
          renderWatchlistTabs();
          renderWatchlist();
          showToast('Liste supprimée.');
        }, true);
      },
    },
  ];

  actionSheetListEl.innerHTML = '';
  actions.forEach(({ label, icon, onClick, danger }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'action-sheet-item' + (danger ? ' danger' : '');
    btn.innerHTML = `${icon} <span>${label}</span>`;
    btn.addEventListener('click', () => { closeActionSheet(); onClick(); });
    actionSheetListEl.appendChild(btn);
  });

  lastFocusedBeforeModal = document.activeElement;
  actionSheetEl.classList.add('open');
}

let wlModalMode = 'create';
let wlModalTargetId = null;

function openWlListModal(mode, targetId = null) {
  wlModalMode = mode;
  wlModalTargetId = targetId;
  document.getElementById('wl-list-modal-title').textContent = mode === 'create' ? 'Nouvelle liste' : 'Renommer la liste';
  document.getElementById('wl-list-modal-confirm').textContent = mode === 'create' ? 'Créer' : 'Renommer';
  const input = document.getElementById('wl-list-name-input');
  input.value = mode === 'rename' ? (loadWatchlistsMeta().find(l => l.id === targetId)?.name || '') : '';
  lastFocusedBeforeModal = document.activeElement;
  document.getElementById('wl-list-modal').classList.add('open');
  setTimeout(() => input.focus(), 50);
}

document.getElementById('wl-lists-row').addEventListener('click', (e) => {
  if (e.target.closest('#wl-list-add-btn')) { openWlListModal('create'); return; }
  const pill = e.target.closest('.wl-list-pill');
  if (!pill) return;
  const id = pill.dataset.id;
  if (id === getActiveWatchlistId()) {
    openWlListManageMenu(id); // déjà active : un tap dessus propose de la gérer
  } else {
    setActiveWatchlistId(id);
    renderWatchlistTabs();
    renderWatchlist();
  }
});

document.getElementById('wl-list-modal-confirm').addEventListener('click', () => {
  const name = document.getElementById('wl-list-name-input').value.trim();
  if (!name) { showToast('Donne un nom à la liste.'); return; }
  if (wlModalMode === 'create') {
    const id = createWatchlistList(name);
    setActiveWatchlistId(id);
    showToast(`Liste "${name}" créée.`);
  } else {
    renameWatchlistList(wlModalTargetId, name);
    showToast('Liste renommée.');
  }
  closeModal(document.getElementById('wl-list-modal'));
  renderWatchlistTabs();
  renderWatchlist();
});
document.getElementById('wl-list-modal-cancel').addEventListener('click', () => {
  closeModal(document.getElementById('wl-list-modal'));
});

renderWatchlistTabs();
renderWatchlist();

// ═══════════════════════════════════════════
//  WATCHLIST SÉRIES (Ludex 2.0)
// ═══════════════════════════════════════════
// Une seule liste (pas le système à listes multiples nommées des films —
// portée volontairement réduite pour ce premier passage). Stockage et
// logique séparés, mais même vocabulaire visuel (.wl-card, .wl-poster,
// tri/filtre) que la watchlist films, pour que les deux se ressemblent à
// l'usage sans être la même donnée.
const TV_WATCHLIST_KEY = 'lbx_tv_watchlist';
const TV_WATCHLIST_TOMBSTONES_KEY = 'lbx_tv_watchlist_tombstones';

function loadTvWatchlist() {
  try { return JSON.parse(localStorage.getItem(TV_WATCHLIST_KEY)) || []; } catch { return []; }
}
function saveTvWatchlist(list) {
  localStorage.setItem(TV_WATCHLIST_KEY, JSON.stringify(list));
}
function tvWatchlistItemKey(item) { return (item.title + '|' + (item.year || '')).toLowerCase(); }

let wlTvSortOrder = 'recent';
let wlTvActiveGenre = null;

function sortTvWatchlist(list) {
  if (wlTvSortOrder === 'rating') return [...list].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  if (wlTvSortOrder === 'year') return [...list].sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
  return list;
}
function filterTvWatchlist(list) {
  if (!wlTvActiveGenre) return list;
  return list.filter(item => (item.genre || '').split(',').map(g => g.trim()).includes(wlTvActiveGenre));
}
function renderWlTvGenreChips(list) {
  const genres = getGenres(list);
  const row = document.getElementById('wl-tv-genre-fold');
  const chips = document.getElementById('wl-tv-genre-chips');
  const currentLabel = document.getElementById('wl-tv-genre-fold-current');
  if (!row || !chips) return;
  if (genres.length === 0) { row.style.display = 'none'; return; }
  row.style.display = 'block';
  if (currentLabel) currentLabel.textContent = wlTvActiveGenre || 'Tous';
  chips.innerHTML = '';
  const allChip = document.createElement('button');
  allChip.className = 'genre-chip all-chip' + (wlTvActiveGenre === null ? ' active' : '');
  allChip.textContent = 'Tous';
  allChip.addEventListener('click', () => { wlTvActiveGenre = null; renderTvWatchlist(); });
  chips.appendChild(allChip);
  genres.forEach(g => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip' + (wlTvActiveGenre === g ? ' active' : '');
    chip.textContent = g;
    chip.addEventListener('click', () => { wlTvActiveGenre = (wlTvActiveGenre === g) ? null : g; renderTvWatchlist(); });
    chips.appendChild(chip);
  });
}

document.getElementById('wl-tv-sort-row')?.addEventListener('click', (e) => {
  const sortBtn = e.target.closest('.wl-sort-btn[data-sort]');
  if (!sortBtn) return;
  wlTvSortOrder = sortBtn.dataset.sort;
  document.querySelectorAll('#wl-tv-sort-row .wl-sort-btn[data-sort]').forEach(b => b.classList.toggle('active', b === sortBtn));
  renderTvWatchlist();
});

function renderTvWatchlist() {
  const list = loadTvWatchlist();
  const container = document.getElementById('wl-tv-list');
  if (!container) return;

  renderWlTvGenreChips(list);
  document.getElementById('wl-tv-sort-row').style.display = list.length === 0 ? 'none' : 'flex';

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.target}</div>Rien au programme pour l'instant — ajoute les séries que tu veux voir.</div>`;
    return;
  }

  const visible = filterTvWatchlist(sortTvWatchlist(list));
  if (visible.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.search}</div>Aucune série ne correspond à ce filtre.</div>`;
    return;
  }

  container.innerHTML = '';
  visible.forEach((item) => {
    const i = list.indexOf(item);
    const div = document.createElement('div');
    div.className = 'wl-card';
    if (window._justSavedTvWatchlistTitle && item.title.toLowerCase() === window._justSavedTvWatchlistTitle) {
      div.classList.add('wl-card-entering');
    }
    const posterHtml = item.poster
      ? `<div class="wl-poster"><img src="${item.poster}" alt="Affiche de ${escAttr(item.title)}" loading="lazy" onerror="this.parentElement.textContent='🎬'"></div>`
      : `<div class="wl-poster">${ICONS.clapper}</div>`;
    div.innerHTML = `
      <div class="wl-card-content">
        <div class="wl-card-open" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
          ${posterHtml}
        </div>
        <div class="wl-actions">
          <button class="wl-btn rate" data-tv-idx="${i}" data-action="start" title="Commencer à suivre, noter" aria-label="Commencer à suivre ${escAttr(item.title)}">${ICONS.star}</button>
          <button class="wl-btn del" data-tv-idx="${i}" data-action="remove" title="Retirer" aria-label="Retirer ${escAttr(item.title)} de la watchlist">${ICONS.close}</button>
        </div>
      </div>`;
    div.querySelector('.wl-card-open').addEventListener('click', () => openTvDetailSheet(item.tmdbId));
    container.appendChild(div);
    applyPosterAccent(item.poster, div);
  });
  window._justSavedTvWatchlistTitle = null;
}

document.getElementById('wl-tv-list')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.wl-btn[data-tv-idx]');
  if (!btn) return;
  const idx = Number(btn.dataset.tvIdx);
  const list = loadTvWatchlist();
  const item = list[idx];
  if (!item) return;

  if (btn.dataset.action === 'remove') {
    list.splice(idx, 1);
    saveTvWatchlist(list);
    recordTombstone(TV_WATCHLIST_TOMBSTONES_KEY, tvWatchlistItemKey(item));
    renderTvWatchlist();
    return;
  }

  // "Commencer à suivre" : même principe que watchlistToForm() côté films —
  // relance la recherche (ici sur le champ séries), retire l'item de la
  // watchlist, bascule vers Noter en mode Séries.
  list.splice(idx, 1);
  saveTvWatchlist(list);
  recordTombstone(TV_WATCHLIST_TOMBSTONES_KEY, tvWatchlistItemKey(item));
  renderTvWatchlist();

  if (typeof setMediaType === 'function') setMediaType('tv');
  const tvSearchEl = document.getElementById('tv-search');
  if (tvSearchEl) {
    tvSearchEl.value = item.title;
    tvSearchEl.dispatchEvent(new Event('input'));
  }
  if (window.innerWidth <= 860) switchMobileNav('rating');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Recherche lancée pour "${item.title}"`);
});

async function addToTvWatchlist(show, year) {
  const list = loadTvWatchlist();
  const key = (show.name + '|' + year).toLowerCase();
  if (list.find(i => (i.title + '|' + (i.year || '')).toLowerCase() === key)) {
    showToast('Déjà dans la watchlist séries.');
    return;
  }
  let genre = '', rating = null;
  try {
    const res = await fetch(`/api/search?tvId=${show.id}`);
    const data = await res.json();
    genre = data.genres?.map(g => g.name).join(', ') || '';
    rating = typeof data.vote_average === 'number' ? data.vote_average : null;
  } catch { /* pas bloquant : la série s'ajoute quand même, juste sans genre/note pour le tri */ }

  list.unshift({
    title: show.name,
    year,
    poster: tmdbImage(show.poster_path, 'w185'),
    genre,
    rating,
    tmdbId: show.id,
    addedAt: new Date().toISOString(),
  });
  saveTvWatchlist(list);
  window._justSavedTvWatchlistTitle = show.name.toLowerCase();
  renderTvWatchlist();
  showToast(`"${show.name}" ajoutée à la watchlist séries 🎯`);
}

// ── Recherche séries (mêmes suggestions à affiches, même pattern que le
// champ films juste au-dessus) ──
const wlTvInput = document.getElementById('wl-tv-input');
const wlTvSuggestEl = document.getElementById('wl-tv-suggestions');
let wlTvSearchTimer;

wlTvInput?.addEventListener('input', () => {
  clearTimeout(wlTvSearchTimer);
  const q = wlTvInput.value.trim();
  if (q.length < 2) { wlTvSuggestEl.style.display = 'none'; return; }
  wlTvSearchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?tvQuery=${encodeURIComponent(q)}`);
      const data = await readApiJson(res);
      if (!data.results?.length) { wlTvSuggestEl.style.display = 'none'; return; }
      wlTvSuggestEl.innerHTML = '';
      wlTvSuggestEl.style.display = 'block';
      data.results.slice(0, 5).forEach(s => {
        const year = s.first_air_date?.slice(0, 4) || '';
        const el = document.createElement('div');
        el.className = 'wl-suggest-item';
        el.innerHTML = `
          ${s.poster_path
            ? `<img class="wl-suggest-poster" src="${tmdbImage(s.poster_path, 'w92')}" alt="Affiche de ${escAttr(s.name)}" loading="lazy">`
            : `<div class="wl-suggest-poster" style="display:flex;align-items:center;justify-content:center;">${ICONS.clapper}</div>`}
          <div>
            <div class="wl-suggest-title">${escAttr(s.name)}</div>
            <div class="wl-suggest-year">${year}</div>
          </div>`;
        el.addEventListener('click', () => {
          wlTvSuggestEl.style.display = 'none';
          wlTvInput.value = '';
          addToTvWatchlist(s, year);
        });
        wlTvSuggestEl.appendChild(el);
      });
    } catch (err) {
      wlTvSuggestEl.style.display = 'none';
      showToast(describeApiFailure(err));
    }
  }, 280);
});
document.addEventListener('click', e => {
  if (wlTvInput && wlTvSuggestEl && !wlTvInput.contains(e.target) && !wlTvSuggestEl.contains(e.target)) {
    wlTvSuggestEl.style.display = 'none';
  }
});
document.getElementById('wl-tv-add-btn')?.addEventListener('click', () => {
  const val = wlTvInput.value.trim();
  if (!val) return;
  wlTvSuggestEl.style.display = 'none';
  const list = loadTvWatchlist();
  if (list.find(i => i.title.toLowerCase() === val.toLowerCase())) { showToast('Déjà dans la liste.'); wlTvInput.value = ''; return; }
  list.unshift({ title: val, year: '', poster: '', genre: '', tmdbId: null, addedAt: new Date().toISOString() });
  saveTvWatchlist(list);
  window._justSavedTvWatchlistTitle = val.toLowerCase();
  renderTvWatchlist();
  wlTvInput.value = '';
});

// ── Toggle Films/Séries ──
document.getElementById('wl-tab-movie')?.addEventListener('click', () => {
  document.getElementById('wl-tab-movie').classList.add('active');
  document.getElementById('wl-tab-tv').classList.remove('active');
  document.getElementById('wl-movie-section').style.display = '';
  document.getElementById('wl-tv-section').style.display = 'none';
});
document.getElementById('wl-tab-tv')?.addEventListener('click', () => {
  document.getElementById('wl-tab-tv').classList.add('active');
  document.getElementById('wl-tab-movie').classList.remove('active');
  document.getElementById('wl-tv-section').style.display = '';
  document.getElementById('wl-movie-section').style.display = 'none';
  renderTvWatchlist();
});

renderTvWatchlist();

// ═══════════════════════════════════════════
//  MODAL DE CONFIRMATION
// ═══════════════════════════════════════════

// Mémorise l'élément qui avait le focus avant l'ouverture d'une modale, pour lui
// rendre le focus à la fermeture (bonne pratique d'accessibilité au clavier).
let lastFocusedBeforeModal = null;

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter(el => !el.disabled && el.offsetParent !== null);
}

// Piège le focus (Tab / Shift+Tab) à l'intérieur d'une modale ouverte, pour ne
// pas laisser un utilisateur au clavier "sortir" vers le contenu masqué derrière.
function trapFocus(e) {
  const openModalEl = document.querySelector('.modal-overlay.open');
  if (!openModalEl || e.key !== 'Tab') return;
  const focusable = getFocusableElements(openModalEl);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function closeModal(modalEl) {
  modalEl.classList.remove('open');
  if (modalEl.id === 'modal') pendingAction = null;
  if (lastFocusedBeforeModal) {
    lastFocusedBeforeModal.focus();
    lastFocusedBeforeModal = null;
  }
}

function openModal(title, body, onConfirm, danger = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = body;
  const confirmBtn = document.getElementById('modal-confirm');
  confirmBtn.className = 'modal-btn ' + (danger ? 'danger' : 'primary');
  confirmBtn.textContent = danger ? 'Supprimer' : 'Confirmer';
  pendingAction = onConfirm;
  lastFocusedBeforeModal = document.activeElement;
  document.getElementById('modal').classList.add('open');
  // Focus sur "Annuler" par défaut : plus sûr pour une action destructive
  // (Entrée pressée par réflexe n'active pas la suppression).
  document.getElementById('modal-cancel').focus();
}

document.getElementById('modal-confirm').addEventListener('click', () => {
  if (pendingAction) { pendingAction(); pendingAction = null; }
  closeModal(document.getElementById('modal'));
});
document.getElementById('modal-cancel').addEventListener('click', () => {
  closeModal(document.getElementById('modal'));
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal);
  });
});

// Échap ferme la modale actuellement ouverte, où que soit le focus.
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const openModalEl = document.querySelector('.modal-overlay.open');
    if (openModalEl) closeModal(openModalEl);
  } else if (e.key === 'Tab') {
    trapFocus(e);
  }
});

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
updateWeightBadges();
calculateScore();
updateAllSliders();
renderCriteriaAverageMarkers();

// ─── Écran de démarrage (splash) ─────────────────────────────────────────────
// Masqué une fois l'app initialisée, avec une durée minimale d'affichage pour
// que ce soit perçu comme un vrai temps de chargement plutôt qu'un flash
// imperceptible (notamment quand tout est déjà en cache et charge quasi
// instantanément).
(function hideSplash() {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  const MIN_DISPLAY_MS = 1200;
  const elapsed = performance.now();
  const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500); // laisse le temps au fondu de finir avant de retirer le nœud
  }, remaining);
})();

// ═══════════════════════════════════════════
//  ACCUEIL POUR UN NOUVEL UTILISATEUR
// ═══════════════════════════════════════════
// Affiché uniquement à un VRAI nouvel utilisateur (historique et watchlists
// vides) — quelqu'un qui a déjà des données (import, synchro restaurée...)
// n'a pas besoin qu'on lui explique l'app depuis le début.
(function initOnboarding() {
  const ONBOARDING_SEEN_KEY = 'lbx_onboarding_seen';
  if (localStorage.getItem(ONBOARDING_SEEN_KEY)) return;

  const hasHistory = loadHistory().length > 0;
  const hasWatchlistItems = loadWatchlistsMeta().some(meta => {
    try { return (JSON.parse(localStorage.getItem(`lbx_watchlist_${meta.id}`)) || []).length > 0; } catch { return false; }
  });
  if (hasHistory || hasWatchlistItems) {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1'); // a déjà des données, pas besoin de cet accueil
    return;
  }

  const modal = document.getElementById('onboarding-modal');
  if (!modal) return;
  const slides = Array.from(modal.querySelectorAll('.onboarding-slide'));
  const dots = Array.from(modal.querySelectorAll('.onboarding-dot'));
  const nextBtn = document.getElementById('onboarding-next-btn');
  const skipBtn = document.getElementById('onboarding-skip-btn');
  let current = 0;

  function showSlide(idx) {
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
      s.classList.toggle('leaving-left', i < idx);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    nextBtn.textContent = idx === slides.length - 1 ? 'Commencer' : 'Suivant';
  }

  function dismiss() {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    closeModal(modal);
  }

  nextBtn.addEventListener('click', () => {
    if (current === slides.length - 1) { dismiss(); return; }
    current++;
    showSlide(current);
  });
  skipBtn.addEventListener('click', dismiss);

  // Après la disparition de l'écran de démarrage (1200ms + marge), pas avant.
  setTimeout(() => {
    lastFocusedBeforeModal = document.activeElement;
    modal.classList.add('open');
    nextBtn.focus();
  }, 1400);
})();

// ═══════════════════════════════════════════
//  SYNCHRONISATION CLOUD (Supabase, via /api/sync)
// ═══════════════════════════════════════════
//
// Principe : un "code de synchronisation" choisi par l'utilisateur (pas de vrai
// compte) identifie ses données côté serveur. Le même code utilisé sur un autre
// appareil permet de récupérer historique + TOUTES les watchlists + réglages.
//
// FUSION (et non écrasement) : à chaque synchronisation (push ou pull), les
// données locales et celles du cloud sont FUSIONNÉES plutôt que remplacées :
// - Historique : par titre. Si un film a été noté sur les deux appareils, on
//   garde la version la plus récente (`updatedAt`). Si un film n'existe que
//   d'un côté, il est conservé (union).
// - Watchlists : chaque LISTE (id + nom) est fusionnée par id (union), puis le
//   CONTENU de chaque liste est fusionné par tmdbId (ou titre), comme avant.
// - Suppressions : chaque suppression (film d'historique, film d'une
//   watchlist, OU une watchlist entière) laisse une "tombstone" (trace
//   horodatée) synchronisée elle aussi, pour qu'une suppression sur un
//   appareil ne soit pas annulée par une synchro depuis un autre appareil qui
//   avait encore l'ancienne version.
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
const TV_SHOW_TOMBSTONES_KEY = 'lbx_tv_show_tombstones';
const TV_SEASON_TOMBSTONES_KEY = 'lbx_tv_season_tombstones';
// TOMBSTONE_MAX_AGE_MS est défini dans 03b-pure-logic.js (utilisé par mergeTombstoneLists)
// watchlistTombstonesKey(id) et WATCHLIST_LIST_TOMBSTONES_KEY sont définis dans 08-watchlist.js

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

// mergeTombstoneLists, historyItemKey, watchlistItemKey, mergeHistory et
// mergeWatchlist vivent maintenant dans 03b-pure-logic.js (logique pure,
// testable automatiquement sans DOM — voir tests/merge-logic.test.js).

// ─── Cœur de la synchro : fusionne l'état local avec un payload cloud ───────
// Sauvegarde le résultat en local (render inclus) et le retourne, prêt à être
// ré-uploadé si besoin (c'est ce que fait pushToCloud).
function mergeWithRemote(remotePayload) {
  const localHistory = loadHistory();
  const localHistTomb = loadTombstones(HISTORY_TOMBSTONES_KEY);
  const remoteHistory = Array.isArray(remotePayload?.history) ? remotePayload.history : [];
  const remoteHistTomb = Array.isArray(remotePayload?.historyTombstones) ? remotePayload.historyTombstones : [];
  const mergedHistTomb = mergeTombstoneLists(localHistTomb, remoteHistTomb);
  const mergedHistory = mergeHistory(localHistory, remoteHistory, mergedHistTomb);
  saveHistory(mergedHistory);
  saveTombstones(HISTORY_TOMBSTONES_KEY, mergedHistTomb);

  // ─── Séries suivies ────────────────────────────────────────────────────
  const localTvShows = typeof loadTvShows === 'function' ? loadTvShows() : [];
  const remoteTvShows = Array.isArray(remotePayload?.tvShows) ? remotePayload.tvShows : [];
  const localShowTomb = loadTombstones(TV_SHOW_TOMBSTONES_KEY);
  const remoteShowTomb = Array.isArray(remotePayload?.tvShowTombstones) ? remotePayload.tvShowTombstones : [];
  const mergedShowTomb = mergeTombstoneLists(localShowTomb, remoteShowTomb);
  const localSeasonTomb = loadTombstones(TV_SEASON_TOMBSTONES_KEY);
  const remoteSeasonTomb = Array.isArray(remotePayload?.tvSeasonTombstones) ? remotePayload.tvSeasonTombstones : [];
  const mergedSeasonTomb = mergeTombstoneLists(localSeasonTomb, remoteSeasonTomb);
  const mergedTvShows = mergeTvShows(localTvShows, remoteTvShows, mergedShowTomb, mergedSeasonTomb);
  if (typeof saveTvShows === 'function') saveTvShows(mergedTvShows);
  saveTombstones(TV_SHOW_TOMBSTONES_KEY, mergedShowTomb);
  saveTombstones(TV_SEASON_TOMBSTONES_KEY, mergedSeasonTomb);

  // ─── Watchlists : fusion des LISTES elles-mêmes, puis du contenu de chacune ──
  const localMeta = loadWatchlistsMeta();
  const remoteMeta = Array.isArray(remotePayload?.watchlistsMeta) ? remotePayload.watchlistsMeta : [];
  const localListTomb = loadTombstones(WATCHLIST_LIST_TOMBSTONES_KEY);
  const remoteListTomb = Array.isArray(remotePayload?.watchlistListTombstones) ? remotePayload.watchlistListTombstones : [];
  const mergedListTomb = mergeTombstoneLists(localListTomb, remoteListTomb);
  saveTombstones(WATCHLIST_LIST_TOMBSTONES_KEY, mergedListTomb);
  const deletedListIds = new Set(mergedListTomb.map(t => t.key));

  // Union par id (le nom local l'emporte en cas de conflit sur le même id),
  // en excluant les listes supprimées sur l'un ou l'autre appareil.
  const metaById = {};
  remoteMeta.forEach(l => { if (l && l.id) metaById[l.id] = { id: l.id, name: l.name }; });
  localMeta.forEach(l => { if (l && l.id) metaById[l.id] = { id: l.id, name: l.name }; });
  let mergedMeta = Object.values(metaById).filter(l => !deletedListIds.has(l.id));
  if (mergedMeta.length === 0) mergedMeta = [{ id: 'default', name: 'À voir' }]; // garde-fou : jamais 0 liste

  const activeId = getActiveWatchlistId(); // lu avant de sauvegarder la meta, au cas où la liste active aurait été supprimée ailleurs
  saveWatchlistsMeta(mergedMeta);
  if (!mergedMeta.find(l => l.id === activeId)) setActiveWatchlistId(mergedMeta[0].id);

  const remoteWatchlists = remotePayload?.watchlists && typeof remotePayload.watchlists === 'object' ? remotePayload.watchlists : {};
  const remoteWlTombs = remotePayload?.watchlistTombstones && typeof remotePayload.watchlistTombstones === 'object' ? remotePayload.watchlistTombstones : {};

  const mergedWatchlists = {};
  const mergedWlTombs = {};
  mergedMeta.forEach(({ id }) => {
    let localItems = [];
    try { localItems = JSON.parse(localStorage.getItem(watchlistStorageKey(id))) || []; } catch {}
    const remoteItems = Array.isArray(remoteWatchlists[id]) ? remoteWatchlists[id] : [];
    const localItemTomb = loadTombstones(watchlistTombstonesKey(id));
    const remoteItemTomb = Array.isArray(remoteWlTombs[id]) ? remoteWlTombs[id] : [];
    const mergedItemTomb = mergeTombstoneLists(localItemTomb, remoteItemTomb);
    const mergedItems = mergeWatchlist(localItems, remoteItems, mergedItemTomb);

    localStorage.setItem(watchlistStorageKey(id), JSON.stringify(mergedItems));
    saveTombstones(watchlistTombstonesKey(id), mergedItemTomb);
    mergedWatchlists[id] = mergedItems;
    mergedWlTombs[id] = mergedItemTomb;
  });

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
  if (typeof renderWatchlistTabs === 'function') renderWatchlistTabs();
  renderWatchlist();
  if (typeof renderTvHistory === 'function' && document.getElementById('hist-tab-tv')?.classList.contains('active')) renderTvHistory();
  if (typeof statsDirty !== 'undefined') statsDirty = true;

  return {
    history: mergedHistory,
    historyTombstones: mergedHistTomb,
    tvShows: mergedTvShows,
    tvShowTombstones: mergedShowTomb,
    tvSeasonTombstones: mergedSeasonTomb,
    watchlistsMeta: mergedMeta,
    watchlists: mergedWatchlists,
    watchlistTombstones: mergedWlTombs,
    watchlistListTombstones: mergedListTomb,
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
  const meta = loadWatchlistsMeta();
  const watchlists = {};
  const watchlistTombstones = {};
  meta.forEach(({ id }) => {
    try { watchlists[id] = JSON.parse(localStorage.getItem(watchlistStorageKey(id))) || []; } catch { watchlists[id] = []; }
    watchlistTombstones[id] = loadTombstones(watchlistTombstonesKey(id));
  });
  return {
    history: loadHistory(),
    historyTombstones: loadTombstones(HISTORY_TOMBSTONES_KEY),
    tvShows: typeof loadTvShows === 'function' ? loadTvShows() : [],
    tvShowTombstones: loadTombstones(TV_SHOW_TOMBSTONES_KEY),
    tvSeasonTombstones: loadTombstones(TV_SEASON_TOMBSTONES_KEY),
    watchlistsMeta: meta,
    watchlists,
    watchlistTombstones,
    watchlistListTombstones: loadTombstones(WATCHLIST_LIST_TOMBSTONES_KEY),
  };
}

async function fetchCloudPayload(code) {
  const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'bad status');
  return data.found ? data.payload : null;
}


// Distingue la VRAIE cause d'un échec de synchro, pour ne plus systématiquement
// blâmer "ta connexion" quand le problème est ailleurs :
// - navigator.onLine === false -> coupure réseau réelle, chez l'utilisateur
// - erreur avec un message venant du serveur (ex: limite de requêtes, service
//   mal configuré) -> on l'affiche telle quelle, c'est la cause exacte
// - échec générique (fetch a levé une TypeError, service injoignable) -> ni
//   confirmé réseau ni message serveur, formulation neutre
function describeSyncFailure(err) {
  if (!navigator.onLine) return 'Tu es hors ligne — la synchronisation reprendra à la reconnexion.';
  const msg = err && err.message ? err.message : '';
  const isGenericFetchFailure = !msg || msg === 'bad status' || /^bad status \d+$/.test(msg) || /Failed to fetch|NetworkError/i.test(msg);
  if (!isGenericFetchFailure) return msg; // message précis renvoyé par l'API
  return 'Impossible de joindre le service de synchronisation. Réessaie dans un instant.';
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
    if (!res.ok) {
      // Lit le VRAI message renvoyé par l'API (ex: limite de requêtes, mauvaise
      // configuration serveur) plutôt que de le jeter — c'était la cause du
      // message trompeur "vérifie ta connexion" alors que le problème était
      // côté service, pas côté réseau de l'utilisateur.
      let apiError = '';
      try { apiError = (await res.json()).error || ''; } catch { /* réponse non-JSON, tant pis */ }
      throw new Error(apiError || `bad status ${res.status}`);
    }

    const now = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_HASH_KEY, hashPayload(currentLocalSnapshot()));
    localStorage.setItem(SYNC_LAST_TIME_KEY, now);
    if (!silent) setSyncStatus(`Synchronisé ✓ (${formatDateTime(now)})`);
    return true;
  } catch (err) {
    if (!silent) setSyncStatus(describeSyncFailure(err), true);
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
  } catch (err) {
    setSyncStatus(describeSyncFailure(err), true);
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

// ═══════════════════════════════════════════
//  DÉCOUVRIR — feuille blanche (voir Ludex_Specifications_Decouverte.pdf)
// ═══════════════════════════════════════════
// Plus de swipe, de jeu de devinette, de quiz, d'angles morts ni de
// "Parcourir" : trois blocs seulement — toggle Films/Séries sticky, Choix
// du jour (hero plein cadre, affiche + titre seulement), et 4 carrousels
// horizontaux d'affiches pures (Nouveautés, Classiques intemporels, Cinéma
// international, D'après ton historique). Duels a été déplacé vers Profil
// (voir 13-duels.js, inchangé — seul son emplacement dans le DOM change).

let discoverMediaType = 'movie'; // 'movie' | 'tv' — état du toggle, partagé par les 4 blocs
// discoverLoaded vit désormais dans 01-navigation.js (voir le commentaire
// là-bas — nécessaire dès le premier appel de switchRightTab au démarrage,
// avant que ce fichier-ci ne soit lui-même exécuté).

function normalizeItem(m) {
  // Uniformise film/série : title/name, release_date/first_air_date — pour
  // que le reste du code n'ait jamais à savoir lequel des deux il manipule.
  return {
    id: m.id,
    title: m.title || m.name || '',
    year: (m.release_date || m.first_air_date || '').slice(0, 4),
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
  };
}

// ── Toggle Films/Séries ──
const discoverSegBtns = document.querySelectorAll('.discover-seg-btn');
function setDiscoverMediaType(type) {
  if (type === discoverMediaType) return;
  discoverMediaType = type;
  discoverSegBtns.forEach(b => b.classList.toggle('active', b.dataset.mediaType === type));
  // "Cinéma international" n'a de sens qu'en mode Films — en Séries, le
  // même carrousel (même source de données, juste discover/tv) devient
  // "Séries internationales".
  const intlTitleEl = document.getElementById('carousel-title-international');
  if (intlTitleEl) intlTitleEl.textContent = type === 'tv' ? 'Séries internationales' : 'Cinéma international';
  loadChoixDuJour();
  loadCarousel('nouveautes');
  loadCarousel('classiques');
  loadCarousel('international');
  loadCarousel('historique');
}
discoverSegBtns.forEach(btn => {
  btn.addEventListener('click', () => setDiscoverMediaType(btn.dataset.mediaType));
});

// ═══════════════════════════════════════════
//  CHOIX DU JOUR (hero)
// ═══════════════════════════════════════════
// Réutilise le tirage stable du jour (même graine que l'ancien "Film du
// jour" — un seul choix par jour, cohérent sur tous les appareils) mais
// sans le jeu de devinette : affiche + titre seulement, toute la carte
// cliquable vers la fiche.
const CHOIX_DU_JOUR_KEY = 'lbx_choix_du_jour';

async function loadChoixDuJour() {
  const heroEl = document.getElementById('choix-du-jour-card');
  if (!heroEl) return;
  const todayKey = new Date().toISOString().slice(0, 10);
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CHOIX_DU_JOUR_KEY) || 'null'); } catch { /* ignore */ }

  if (cached && cached.date === todayKey && cached.mediaType === discoverMediaType && cached.movie) {
    renderChoixDuJour(cached.movie);
    return;
  }

  heroEl.innerHTML = `<div class="skeleton-bg" style="width:100%;height:100%;border-radius:16px;"></div>`;
  try {
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const res = await fetch(`/api/search?dailyPick=${daysSinceEpoch}&mediaType=${discoverMediaType}`);
    const data = await res.json();
    const pick = data.result;
    if (!pick) return;
    const item = normalizeItem(pick);
    // Second appel pour le réalisateur (le tirage du jour ne renvoie que les
    // champs de base, sans crédits — voir dailyPick dans api/search.js). Ne
    // bloque pas l'affichage de l'affiche+titre si cet appel échoue ou tarde :
    // rendu immédiat sans réalisateur, puis complété dès qu'il arrive.
    renderChoixDuJour(item);
    localStorage.setItem(CHOIX_DU_JOUR_KEY, JSON.stringify({ date: todayKey, mediaType: discoverMediaType, movie: item }));

    const detailEndpoint = discoverMediaType === 'tv' ? `tvId=${item.id}` : `id=${item.id}`;
    const detailRes = await fetch(`/api/search?${detailEndpoint}`);
    const details = await detailRes.json();
    const director = discoverMediaType === 'tv'
      ? details.created_by?.[0]?.name
      : details.credits?.crew?.find(c => c.job === 'Director')?.name;
    if (director) {
      item.director = director;
      renderChoixDuJour(item);
      localStorage.setItem(CHOIX_DU_JOUR_KEY, JSON.stringify({ date: todayKey, mediaType: discoverMediaType, movie: item }));
    }
  } catch (e) {
    console.warn('Impossible de charger le choix du jour', e);
  }
}

function renderChoixDuJour(item) {
  const heroEl = document.getElementById('choix-du-jour-card');
  if (!heroEl) return;
  const posterUrl = item.poster_path ? tmdbImage(item.poster_path, 'w780') : '';
  heroEl.innerHTML = `
    <div class="choix-du-jour-bg" style="background-image:url('${posterUrl}')"></div>
    <div class="choix-du-jour-overlay"></div>
    <div class="choix-du-jour-content">
      <div class="choix-du-jour-title">${escAttr(item.title)}</div>
      ${item.director ? `<div class="choix-du-jour-director">Réalisé par ${escAttr(item.director)}</div>` : ''}
    </div>
  `;
  heroEl.dataset.itemId = String(item.id);
  heroEl.dataset.mediaType = discoverMediaType;
}

document.getElementById('choix-du-jour-card')?.addEventListener('click', function() {
  const id = this.dataset.itemId;
  if (!id) return;
  if (this.dataset.mediaType === 'tv') openTvDetailSheet(id);
  else openMovieDetailSheet(id);
});
document.getElementById('choix-du-jour-card')?.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  this.click();
});

// ═══════════════════════════════════════════
//  LES 4 CARROUSELS
// ═══════════════════════════════════════════
// Une seule fonction générique : chaque carrousel ne diffère que par sa
// source de données (voir CAROUSEL_SOURCES). Rendu SANS le doublement de
// liste utilisé par l'ancien carrousel Tendances (qui donnait l'impression
// d'un film en double en cours de défilement) — juste un défilement
// horizontal normal, pas de boucle infinie.

async function fetchNouveautes() {
  // "Nouveautés" = tendances de la semaine (trending/all/week filtré par le
  // media_type actif), dédupliquées par id — TMDb peut renvoyer un même
  // titre sur deux pages différentes de sa fenêtre de calcul.
  const res = await fetch('/api/search?trending=true');
  const data = await res.json();
  const seen = new Set();
  return (data.results || [])
    .filter(m => m.poster_path && m.media_type === discoverMediaType)
    .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
    .slice(0, 15)
    .map(normalizeItem);
}

async function fetchClassiques() {
  // "Classiques intemporels" = meilleurs films/séries d'une décennie au
  // hasard parmi les 5 dernières — varie un peu d'un chargement à l'autre
  // plutôt que de toujours montrer la même décennie fixe.
  const decades = [1970, 1980, 1990, 2000, 2010];
  const startYear = decades[Math.floor(Math.random() * decades.length)];
  const res = await fetch(`/api/search?decadeTop=${startYear}&mediaType=${discoverMediaType}`);
  const data = await res.json();
  return (data.results || []).slice(0, 15).map(normalizeItem);
}

async function fetchInternational() {
  // "Cinéma international" = plusieurs pays mélangés dans le MÊME
  // chargement (pas un seul pays par session) — un vrai brassage de
  // cultures/continents plutôt qu'une monoculture qui varie juste d'une
  // fois sur l'autre. Liste volontairement étalée sur plusieurs
  // continents (Asie, Europe, Amérique latine, Afrique, Moyen-Orient).
  const allCountries = ['KR', 'JP', 'FR', 'IT', 'IN', 'ES', 'DE', 'MX', 'BR', 'SE', 'NG', 'IR', 'TH', 'PL', 'EG'];
  // 5 pays tirés au hasard parmi la liste, un ordre différent à chaque
  // chargement (Fisher-Yates sur une copie, pas de biais vers le début du
  // tableau contrairement à un simple .sort(Math.random())).
  const shuffledCountries = [...allCountries];
  for (let i = shuffledCountries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledCountries[i], shuffledCountries[j]] = [shuffledCountries[j], shuffledCountries[i]];
  }
  const picked = shuffledCountries.slice(0, 5);

  const results = await Promise.allSettled(
    picked.map(cc => fetch(`/api/search?countryCode=${cc}&mediaType=${discoverMediaType}`).then(r => r.json()))
  );
  // 3 films par pays plutôt que de vider un pays avant de passer au
  // suivant : garantit un vrai mélange dans les 15 premiers plutôt qu'un
  // classement qui recolle les pays par blocs.
  const perCountry = results.map(r => (r.status === 'fulfilled' ? (r.value.results || []).slice(0, 3) : []));
  const merged = [];
  for (let i = 0; i < 3; i++) {
    perCountry.forEach(list => { if (list[i]) merged.push(list[i]); });
  }
  return merged.slice(0, 15).map(normalizeItem);
}

async function fetchHistorique() {
  // "D'après ton historique" = recommandations TMDb agrégées à partir de
  // quelques films/séries de l'historique, choisis pour leur diversité de
  // genre plutôt qu'au hasard pur (voir pickDiverseBasisItems) — même
  // logique que l'ancienne pile de suggestions "swipe", réutilisée ici.
  // Films et séries vivent dans deux stockages différents (loadHistory() vs
  // loadTvShows(), avec tmdbId vs tmdbTvId) — normalisés ici en un seul
  // tableau { tmdbId, genre } pour que pickDiverseBasisItems n'ait pas à
  // connaître la différence.
  const basisPool = discoverMediaType === 'tv'
    ? loadTvShows().map(s => ({ tmdbId: s.tmdbTvId, genre: s.genre || '' }))
    : loadHistory().filter(h => h.tmdbId).map(h => ({ tmdbId: h.tmdbId, genre: h.genre || '' }));
  if (basisPool.length === 0) return [];
  const basis = pickDiverseBasisItems(basisPool, 3);
  markBasisUsed(basis.map(f => f.tmdbId));
  const seenIds = new Set(basisPool.map(f => String(f.tmdbId)));

  const results = await Promise.allSettled(
    basis.map(item => fetch(`/api/search?id=${item.tmdbId}&recommendations=true&mediaType=${discoverMediaType}`).then(r => r.json()))
  );
  const allRecs = [];
  results.forEach(r => {
    if (r.status !== 'fulfilled') return;
    const arr = r.value.results || (Array.isArray(r.value) ? r.value : []);
    allRecs.push(...arr);
  });

  const addedIds = new Set();
  const unique = [];
  allRecs.forEach(m => {
    if (!m || !m.id || !m.poster_path) return;
    const idStr = String(m.id);
    if (addedIds.has(idStr) || seenIds.has(idStr)) return;
    addedIds.add(idStr);
    unique.push(m);
  });
  // Fisher-Yates — pas .sort(Math.random()) (biaisé), pour ne pas grouper
  // les résultats par film de base (donc souvent par genre).
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, 15).map(normalizeItem);
}

const CAROUSEL_SOURCES = {
  nouveautes: fetchNouveautes,
  classiques: fetchClassiques,
  international: fetchInternational,
  historique: fetchHistorique,
};

async function loadCarousel(key) {
  const rowEl = document.getElementById(`carousel-${key}`);
  const blockEl = document.getElementById(`carousel-block-${key}`);
  if (!rowEl || !blockEl) return;
  rowEl.innerHTML = Array.from({ length: 5 }, () => `<div class="poster-min skeleton-bg"></div>`).join('');
  blockEl.style.display = 'block';
  try {
    const items = await CAROUSEL_SOURCES[key]();
    if (items.length === 0) { blockEl.style.display = 'none'; return; }
    rowEl.innerHTML = items.map(item => `
      <div class="poster-min" data-item-id="${item.id}" data-media-type="${discoverMediaType}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(item.title)}">
        ${item.poster_path
          ? `<img src="${tmdbImage(item.poster_path, 'w200')}" alt="Affiche de ${escAttr(item.title)}" loading="lazy">`
          : ''}
      </div>`).join('');
  } catch (e) {
    console.warn(`Impossible de charger le carrousel ${key}`, e);
    blockEl.style.display = 'none';
  }
}

// Clic délégué : un seul écouteur pour les 4 carrousels plutôt qu'un par
// vignette (des dizaines d'affiches au total entre les 4 blocs).
document.getElementById('view-discover')?.addEventListener('click', (e) => {
  const poster = e.target.closest('.poster-min[data-item-id]');
  if (!poster) return;
  if (poster.dataset.mediaType === 'tv') openTvDetailSheet(poster.dataset.itemId);
  else openMovieDetailSheet(poster.dataset.itemId);
});
document.getElementById('view-discover')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const poster = e.target.closest('.poster-min[data-item-id]');
  if (!poster) return;
  e.preventDefault();
  poster.click();
});

// ── Base diversifiée pour "D'après ton historique" (repris de l'ancienne
// pile de suggestions, généralisé film/série) ──
const DISCOVER_BASIS_USED_KEY = 'lbx_discover_basis_used';
function loadBasisUsed() {
  try { return JSON.parse(localStorage.getItem(DISCOVER_BASIS_USED_KEY)) || []; } catch { return []; }
}
function markBasisUsed(tmdbIds) {
  const used = loadBasisUsed();
  used.push(...tmdbIds.map(String));
  localStorage.setItem(DISCOVER_BASIS_USED_KEY, JSON.stringify(used.slice(-30)));
}
function pickDiverseBasisItems(pool, count) {
  const used = new Set(loadBasisUsed());
  const fresh = pool.filter(f => !used.has(String(f.tmdbId)));
  const candidates = fresh.length >= count ? fresh : pool;

  const byGenre = {};
  candidates.forEach(f => {
    const primaryGenre = (f.genre || '').split(',')[0].trim() || 'Autre';
    (byGenre[primaryGenre] = byGenre[primaryGenre] || []).push(f);
  });

  const genres = Object.keys(byGenre).sort(() => 0.5 - Math.random());
  const picked = [];
  for (const g of genres) {
    if (picked.length >= count) break;
    const arr = byGenre[g];
    picked.push(arr[Math.floor(Math.random() * arr.length)]);
  }
  const remaining = candidates.filter(f => !picked.includes(f));
  while (picked.length < count && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    picked.push(remaining.splice(idx, 1)[0]);
  }
  return picked;
}

// Point d'entrée unique, appelé depuis 01-navigation.js au premier
// affichage de l'onglet Découvrir.
function loadDiscoverTab() {
  loadChoixDuJour();
  Object.keys(CAROUSEL_SOURCES).forEach(loadCarousel);
}

// ═══════════════════════════════════════════
//  FICHE FILM DÉTAILLÉE
// ═══════════════════════════════════════════
// Ouverte au tap sur un film (historique, watchlist, découvrir). Récupère la
// fiche complète TMDb (synopsis, budget, box-office, équipe...) à la demande,
// via le même endpoint /api/search?id=X déjà utilisé ailleurs (mis en cache
// côté CDN, voir api/search.js). Si le film n'a pas de tmdbId (ajouté en
// saisie manuelle), affiche un message clair plutôt que d'échouer.

const mdsEl = document.getElementById('movie-detail-sheet');
const mdsContentEl = document.getElementById('mds-content');
const mdsCloseBtn = document.getElementById('mds-close-btn');

// Bande-annonce : chargée seulement au clic (vignette + bouton lecture avant
// ça), pas embarquée automatiquement dès l'ouverture de la fiche. Attaché ici,
// au niveau racine (pas dans renderCastCarousel), pour qu'il fonctionne même
// pour un film sans casting. Le gestionnaire clavier générique
// (01-navigation.js) couvre déjà Entrée/Espace pour ce role="button".
mdsContentEl.addEventListener('click', (e) => {
  const trailerWrap = e.target.closest('.mds-trailer-wrap');
  if (!trailerWrap || trailerWrap.querySelector('iframe')) return;
  const key = trailerWrap.dataset.videoKey;
  trailerWrap.innerHTML = `<iframe class="mds-trailer" src="https://www.youtube.com/embed/${key}?autoplay=1" title="Bande-annonce" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
});

function formatMoney(amount) {
  if (!amount || amount <= 0) return 'Non communiqué';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function buildMdsSkeleton() {
  return `
    <div class="mds-skeleton">
      <div class="mds-skeleton-poster skeleton-bg"></div>
      <div class="mds-skeleton-lines">
        <div class="skeleton-text long skeleton-bg" style="height:18px;"></div>
        <div class="skeleton-text short skeleton-bg"></div>
      </div>
    </div>
    <div class="skeleton-text long skeleton-bg" style="margin-top:18px;"></div>
    <div class="skeleton-text long skeleton-bg"></div>
    <div class="skeleton-text short skeleton-bg"></div>
  `;
}

// Chaque section reçoit un léger délai croissant (voir CSS .mds-section) pour
// apparaître en cascade plutôt que d'un bloc — plus agréable à l'œil qu'un
// simple remplacement de contenu.
// Cherche une affiche choisie à la main pour ce film, dans l'historique OU
// n'importe quelle watchlist (un film "à voir" pas encore noté peut aussi
// avoir reçu un choix d'affiche — voir applyChosenPoster, qui sauvegarde aux
// deux endroits). localMatch (historique) ne suffit pas seul : un film
// uniquement en watchlist n'y apparaît jamais.
function findSavedPosterUrl(tmdbId, localMatch) {
  if (localMatch && localMatch.poster) return localMatch.poster;
  for (const meta of loadWatchlistsMeta()) {
    const found = loadWatchlist(meta.id).find(w => String(w.tmdbId) === String(tmdbId) && w.poster);
    if (found) return found.poster;
  }
  return null;
}

function buildMdsContent(data, localMatch, localMatchIdx) {
  // Une affiche choisie à la main (voir applyChosenPoster) est enregistrée
  // sur l'item local (historique/watchlist) — elle doit toujours l'emporter
  // sur l'affiche par défaut de TMDb, sinon rouvrir la fiche plus tard
  // "oublie" le choix : le rendu revenait systématiquement à data.poster_path
  // (toujours frais depuis l'API), sans jamais consulter ce qui avait été
  // sauvegardé. C'était le vrai bug derrière "ça ne se sauvegarde pas".
  const savedPoster = findSavedPosterUrl(data.id, localMatch);
  const posterUrl = savedPoster || (tmdbImage(data.poster_path, 'w342'));
  const year = data.release_date ? data.release_date.slice(0, 4) : '';
  const runtime = data.runtime ? `${data.runtime} min` : '';
  const genres = (data.genres || []).map(g => g.name).join(', ');
  const directorObj = data.credits?.crew?.find(c => c.job === 'Director') || null;
  const castList = (data.credits?.cast || []).slice(0, 5);
  const releaseDateStr = data.release_date
    ? new Date(data.release_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Inconnue';

  // Petit lien cliquable sur un nom de réalisateur/acteur : ouvre sa fiche
  // personne (bio + filmographie + % déjà vu). data-person-id/data-person-name
  // portés directement sur l'élément, lus par le clic délégué plus bas.
  function personLink(p) {
    return `<span class="mds-person-link" data-person-id="${p.id}" data-person-name="${escAttr(p.name)}">${escAttr(p.name)}</span>`;
  }
  const directorHtml = directorObj ? personLink(directorObj) : '';
  const castHtml = castList.map(personLink).join(', ');

  let personalHtml = '';
  if (localMatch) {
    const critBreakdown = buildCriteriaBreakdown(localMatch);
    personalHtml = `
      <div class="mds-section mds-personal" style="animation-delay:.05s">
        <div class="mds-section-title">Ta note</div>
        <div class="mds-personal-score">${escAttr(localMatch.score)}/10 <span class="mds-personal-stars">${escAttr(localMatch.stars || '')}</span>${localMatch.liked ? ` <span class="liked-badge">${ICONS.heart}</span>` : ''}</div>
        ${localMatch.review ? `<div class="mds-personal-review">« ${escAttr(localMatch.review)} »</div>` : ''}
      </div>
      ${critBreakdown}
    `;
  }

  return `
    <div class="mds-header" style="animation-delay:0s; --mds-backdrop: ${data.backdrop_path ? `url('${tmdbImage(data.backdrop_path, 'w780')}')` : 'none'}">
      <div class="mds-header-left">
        <div class="mds-poster-wrap">
          ${posterUrl
            ? `<img class="mds-poster" src="${posterUrl}" alt="Affiche de ${escAttr(data.title)}" loading="lazy">`
            : `<div class="mds-poster mds-poster-ph">${ICONS.clapper}</div>`}
          ${data.vote_average ? `<div class="mds-score-stamp"><span class="mds-score-stamp-val">${data.vote_average.toFixed(1)}</span><span class="mds-score-stamp-label">TMDb</span></div>` : ''}
        </div>
        ${isInCollection(data.id) ? `<button type="button" class="mds-poster-change-btn" data-poster-picker="${escAttr(String(data.id))}">Changer l'affiche</button>` : ''}
      </div>
      <div class="mds-header-info">
        <div class="mds-title" id="mds-title">${escAttr(data.title)}</div>
        <div class="mds-meta">${[year, runtime, genres].filter(Boolean).map(s => `<span>${s}</span>`).join('')}</div>
        <div class="mds-external-ratings" id="mds-external-ratings"></div>
        ${directorObj ? `<div class="mds-header-director"><span class="mds-director-label">Réalisé par</span> <b>${escAttr(directorObj.name)}</b></div>` : ''}
      </div>
    </div>

    <div class="mds-actions" style="animation-delay:.02s">
      ${localMatch
        ? `<button type="button" class="mds-action-btn" id="mds-edit-btn" data-idx="${localMatchIdx}" title="Modifier ma note">${ICONS.edit} Modifier ma note</button>`
        : `<button type="button" class="mds-action-btn primary" id="mds-rate-btn" title="Noter ce film">${ICONS.star} Noter</button>
           <button type="button" class="mds-action-btn" id="mds-watchlist-btn" title="Ajouter à la watchlist">${ICONS.target} Watchlist</button>`
      }
    </div>

    ${personalHtml}

    ${(() => {
      const trailer = pickBestTrailer(data.videos?.results || []);
      if (!trailer) return '';
      return `
      <div class="mds-section" style="animation-delay:.08s">
        <div class="mds-section-title">Bande-annonce</div>
        <div class="mds-trailer-wrap" data-video-key="${trailer.key}" role="button" tabindex="0" aria-label="Lire la bande-annonce de ${escAttr(data.title)}">
          <img class="mds-trailer-thumb" src="https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg" alt="" loading="lazy">
          <div class="mds-trailer-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
      </div>`;
    })()}

    ${data.overview ? `
      <div class="mds-section" style="animation-delay:.1s">
        <div class="mds-section-title">Synopsis</div>
        <div class="mds-overview" id="mds-overview">${escAttr(data.overview)}</div>
        <button type="button" class="mds-overview-toggle" id="mds-overview-toggle">Lire la suite ▾</button>
      </div>` : ''}

    <div class="mds-section" style="animation-delay:.15s">
      <div class="mds-section-title">Équipe</div>
      ${directorHtml ? `<div class="mds-row"><span class="mds-label">Réalisateur</span><span>${directorHtml}</span></div>` : ''}
      ${castHtml ? `<div class="mds-row"><span class="mds-label">Avec</span><span>${castHtml}</span></div>` : ''}
      ${!directorHtml && !castHtml ? `<div class="mds-row"><span class="mds-label">—</span><span>Non communiqué</span></div>` : ''}
    </div>

    <div class="mds-section" style="animation-delay:.2s">
      <div class="mds-section-title">Détails</div>
      <div class="mds-row"><span class="mds-label">Sortie</span><span>${releaseDateStr}</span></div>
      <div class="mds-row"><span class="mds-label">Budget</span><span>${formatMoney(data.budget)}</span></div>
      <div class="mds-row"><span class="mds-label">Box-office</span><span>${formatMoney(data.revenue)}</span></div>
    </div>

    ${(data.credits?.cast || []).length > 0 ? `
      <div class="mds-section" style="animation-delay:.25s">
        <div class="mds-section-title">Casting</div>
        <div class="mds-cast-carousel" id="mds-cast-carousel"></div>
      </div>` : ''}

    ${data.belongs_to_collection ? `
      <div class="mds-section" style="animation-delay:.3s">
        <div class="mds-section-title">
          Fait partie d'une saga
          <span class="mds-saga-link" id="mds-saga-link" data-collection-id="${data.belongs_to_collection.id}" data-collection-name="${escAttr(data.belongs_to_collection.name)}" role="button" tabindex="0">${escAttr(data.belongs_to_collection.name)} →</span>
        </div>
        <div class="mds-saga-strip" id="mds-saga-strip">Chargement…</div>
      </div>` : ''}

    <div class="mds-section" style="animation-delay:.35s">
      ${typeof buildAnalysisSectionHtml === 'function' ? buildAnalysisSectionHtml(data.id, data.title) : ''}
    </div>
  `;
}

// Ventilation par critère (barres, pas un radar — déjà utilisé sur le
// dashboard, on veut ici quelque chose de plus direct à lire pour un seul
// film) : uniquement si le film a été noté en mode détaillé.
const MDS_CRITERIA_LABELS = {
  scenario: 'Scénario', realisation: 'Réalisation', photo: 'Photo',
  acteurs: 'Acteurs', ambiance: 'Ambiance', rythme: 'Rythme', affect: 'Affect',
};
function buildCriteriaBreakdown(localMatch) {
  if (localMatch.mode !== 'detail' || !localMatch.values) return '';

  const rows = CRITERIA.map((key, i) => {
    const val = parseFloat(localMatch.values[key]);
    if (isNaN(val)) return '';
    const pct = (val / 10) * 100;
    return `
      <div class="mds-crit-row" style="animation-delay:${0.05 * i}s">
        <span class="mds-crit-label">${MDS_CRITERIA_LABELS[key] || key}</span>
        <div class="mds-crit-track"><div class="mds-crit-fill" style="--mds-crit-pct:${pct}%"></div></div>
        <span class="mds-crit-value">${val.toFixed(1)}</span>
      </div>`;
  }).join('');

  return `
    <div class="mds-section mds-crit-breakdown" style="animation-delay:.08s">
      <div class="mds-section-title">Détail par critère</div>
      ${rows}
    </div>
  `;
}

// Carrousel du casting complet, en bas de la fiche film — même mécanique que
// le carrousel "Tendances" de Découvrir (défilement auto piloté en JS, pas
// une animation CSS qui bloquerait le glissement manuel natif), à vitesse
// volontairement plus lente ici (plus de monde à voir défiler, moins de
// pression pour choisir/lire rapidement).
function renderCastCarousel(castArray) {
  const outer = document.getElementById('mds-cast-carousel');
  if (!outer) return;
  const cast = castArray.filter(c => c.id).slice(0, 20);
  if (cast.length === 0) return;

  const itemsHtml = cast.map(actor => {
    const photoUrl = tmdbImage(actor.profile_path, 'w185');
    return `
      <div class="mds-cast-item" data-person-id="${actor.id}" data-person-name="${escAttr(actor.name)}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(actor.name)}">
        ${photoUrl
          ? `<img class="mds-cast-photo" src="${photoUrl}" alt="Photo de ${escAttr(actor.name)}" loading="lazy">`
          : `<div class="mds-cast-photo mds-cast-photo-ph">${ICONS.clapper}</div>`}
        <div class="mds-cast-name">${escAttr(actor.name)}</div>
        ${actor.character ? `<div class="mds-cast-character">${escAttr(actor.character)}</div>` : ''}
      </div>`;
  }).join('');

  // Duplique la liste une fois : le défilement peut boucler sans à-coup dès
  // qu'il a parcouru l'équivalent d'une copie complète.
  outer.innerHTML = `<div class="mds-cast-track">${itemsHtml}${itemsHtml}</div>`;
  const track = outer.querySelector('.mds-cast-track');

  outer.addEventListener('click', (e) => {
    const item = e.target.closest('.mds-cast-item');
    if (item) openPersonDetailSheet(item.dataset.personId, item.dataset.personName);
  });

  const AUTO_SCROLL_SPEED = 0.3; // plus lent que le carrousel tendances (0.5) : plus de monde à voir défiler
  const RESUME_DELAY_MS = 3000;
  let autoScrollPaused = false;
  let resumeTimer = null;

  function pauseThenScheduleResume() {
    autoScrollPaused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { autoScrollPaused = false; }, RESUME_DELAY_MS);
  }

  function tick() {
    if (!autoScrollPaused && mdsEl.classList.contains('open')) {
      outer.scrollLeft += AUTO_SCROLL_SPEED;
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0 && outer.scrollLeft >= halfWidth) outer.scrollLeft -= halfWidth;
    }
    // Arrête la boucle si la fiche a été fermée (évite de faire tourner un
    // requestAnimationFrame indéfiniment pour un carrousel qu'on ne voit plus).
    if (mdsEl.classList.contains('open')) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  outer.addEventListener('touchstart', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('touchmove', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('wheel', pauseThenScheduleResume, { passive: true });
  outer.addEventListener('scroll', pauseThenScheduleResume, { passive: true });
}

// Bande des autres films de la saga (belongs_to_collection), en bas de la
// fiche film — appel réseau séparé du chargement principal (les détails
// d'un film n'incluent pas la liste complète de sa collection, juste son
// id/nom/affiche), donc rendue après coup plutôt que de retarder tout
// l'affichage de la fiche pour ça.
async function populateSagaStrip(collectionId, currentMovieId) {
  const stripEl = document.getElementById('mds-saga-strip');
  if (!stripEl) return;
  try {
    const res = await fetch(`/api/search?collectionId=${collectionId}`);
    const data = await readApiJson(res);
    const parts = (data.parts || []).filter(f => f.poster_path)
      .sort((a, b) => (a.release_date || '9999').localeCompare(b.release_date || '9999'));
    if (parts.length === 0) { stripEl.innerHTML = ''; return; }
    stripEl.innerHTML = parts.map(f => `
      <div class="mds-saga-item${String(f.id) === String(currentMovieId) ? ' current' : ''}" data-movie-id="${f.id}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(f.title)}">
        <img class="mds-saga-poster" src="${tmdbImage(f.poster_path, 'w185')}" alt="" loading="lazy">
        <div class="mds-saga-title">${escAttr(f.title)}</div>
      </div>
    `).join('');
  } catch {
    stripEl.innerHTML = ''; // pas grave : le lien "Voir la saga complète" reste utilisable
  }
}

// Notes IMDb/Rotten Tomatoes/Metacritic (OMDb) — uniquement sur une fiche
// film ouverte explicitement (jamais sur les grilles/carrousels), voir
// api/search.js. Repli silencieux si la clé OMDB_KEY n'est pas configurée
// ou si l'appel échoue : la fiche reste utilisable sans ces notes.
async function populateExternalRatings(imdbId) {
  const el = document.getElementById('mds-external-ratings');
  if (!el) return;
  try {
    const res = await fetch(`/api/search?imdbId=${imdbId}`);
    const data = await readApiJson(res);
    const ratings = data.ratings || [];
    if (ratings.length === 0) return;
    const labels = { 'Internet Movie Database': 'IMDb', 'Rotten Tomatoes': 'RT', 'Metacritic': 'Metacritic' };
    el.innerHTML = ratings
      .filter(r => labels[r.Source])
      .map(r => `<span class="mds-external-rating"><b>${labels[r.Source]}</b> ${escAttr(r.Value)}</span>`)
      .join('');
  } catch {
    // silencieux : la note TMDb deja affichee suffit
  }
}

// Cache le bouton "Lire la suite" si le synopsis tient déjà entièrement dans
// les lignes visibles par défaut — pas la peine de proposer un accordéon pour
// un texte qui ne déborde pas. Comparaison scrollHeight/clientHeight après un
// requestAnimationFrame, le temps que le layout (avec le clamp CSS) se stabilise.
function setupOverviewToggle() {
  const overview = document.getElementById('mds-overview');
  const toggle = document.getElementById('mds-overview-toggle');
  if (!overview || !toggle) return;
  requestAnimationFrame(() => {
    if (overview.scrollHeight <= overview.clientHeight + 2) {
      toggle.style.display = 'none';
    }
  });
}

// En-tête collant qui rétrécit : au-delà d'un seuil de défilement DANS la
// fiche (.mds-box, le conteneur qui défile réellement), l'affiche+titre
// passent en mode compact — l'inverse en repassant sous ce seuil. Un seul
// écouteur de scroll par ouverture de fiche (retiré à la fermeture) pour ne
// pas empiler des écouteurs orphelins à chaque nouvelle fiche ouverte.
const STICKY_HEADER_THRESHOLD = 80;
const stickyHeaderHandlers = new WeakMap(); // un gestionnaire par fiche (evite toute collision d'etat entre film et serie)
function setupStickyHeader(sheetEl = mdsEl) {
  const box = sheetEl.querySelector('.mds-box');
  const header = sheetEl.querySelector('.mds-header');
  if (!box || !header) return;
  const existing = stickyHeaderHandlers.get(sheetEl);
  if (existing) box.removeEventListener('scroll', existing);
  const handler = () => {
    header.classList.toggle('compact', box.scrollTop > STICKY_HEADER_THRESHOLD);
  };
  stickyHeaderHandlers.set(sheetEl, handler);
  box.addEventListener('scroll', handler, { passive: true });
}

// Choisit la meilleure bande-annonce parmi les vidéos TMDb : uniquement
// YouTube (seule plateforme embarquable simplement sans clé ni accord
// spécifique), en priorisant une vraie "Trailer" officielle, puis en
// préférant la version française si elle existe — sans quoi n'importe quelle
// bande-annonce YouTube fait l'affaire plutôt que rien.
function pickBestTrailer(videos) {
  const yt = videos.filter(v => v.site === 'YouTube');
  if (yt.length === 0) return null;
  const trailers = yt.filter(v => v.type === 'Trailer');
  const pool = trailers.length > 0 ? trailers : yt;
  return pool.find(v => v.official && v.iso_639_1 === 'fr')
      || pool.find(v => v.iso_639_1 === 'fr')
      || pool.find(v => v.official)
      || pool[0];
}

let mdsCurrentData = null; // données complètes du film actuellement affiché, pour les boutons d'action

async function openMovieDetailSheet(tmdbId) {
  if (!tmdbId) {
    showToast("Ce film n'a pas de fiche TMDb liée (ajouté en saisie manuelle).");
    return;
  }

  lastFocusedBeforeModal = document.activeElement;
  mdsContentEl.innerHTML = buildMdsSkeleton();
  mdsEl.classList.add('open');
  mdsCloseBtn.focus(); // déplace le focus DANS la fiche à l'ouverture (pas juste piégé une fois qu'on y est déjà)
  const mdsBoxEl = mdsEl.querySelector('.mds-box');
  if (mdsBoxEl) mdsBoxEl.scrollTop = 0; // évite de démarrer en mode compact si une fiche precedente avait été scrollée

  try {
    const res = await fetch(`/api/search?id=${tmdbId}`);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (!data || !data.title) throw new Error('no data');

    const history = loadHistory();
    const localMatch = history.find(h => String(h.tmdbId) === String(tmdbId));
    const localMatchIdx = history.findIndex(h => String(h.tmdbId) === String(tmdbId));

    mdsContentEl.innerHTML = buildMdsContent(data, localMatch, localMatchIdx);
    mdsCurrentData = data;
    renderCastCarousel(data.credits?.cast || []);
    setupOverviewToggle();
    setupStickyHeader();
    const mdsPosterUrl = tmdbImage(data.poster_path, 'w342');
    applyPosterAccent(mdsPosterUrl, mdsEl.querySelector('.mds-box'));
    if (data.belongs_to_collection) populateSagaStrip(data.belongs_to_collection.id, data.id);
    if (data.external_ids?.imdb_id) populateExternalRatings(data.external_ids.imdb_id);
    if (typeof wireAnalysisSection === 'function') wireAnalysisSection(data.id, data.title);
  } catch (e) {
    mdsCurrentData = null;
    // État d'erreur avec reprise : l'id du film voyage dans le bouton, le
    // gestionnaire délégué RACINE (plus bas) relance le chargement complet.
    mdsContentEl.innerHTML = `
      <div class="error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        <div class="error-state-msg">Impossible de charger les détails du film. Vérifie ta connexion.</div>
        <button type="button" class="error-retry-btn" data-retry-tmdb-id="${escAttr(String(tmdbId))}">Réessayer</button>
      </div>`;
  }
}

function closeMovieDetailSheet() {
  closeModal(mdsEl);
}

mdsCloseBtn.addEventListener('click', closeMovieDetailSheet);
mdsEl.addEventListener('click', (e) => {
  if (e.target === mdsEl) { closeMovieDetailSheet(); return; }

  const personLink = e.target.closest('.mds-person-link');
  if (personLink) {
    openPersonDetailSheet(personLink.dataset.personId, personLink.dataset.personName);
    return;
  }

  const overviewToggle = e.target.closest('#mds-overview-toggle');
  if (overviewToggle) {
    const overview = document.getElementById('mds-overview');
    const expanded = overview.classList.toggle('expanded');
    overviewToggle.textContent = expanded ? 'Réduire ▴' : 'Lire la suite ▾';
    return;
  }

  const sagaItem = e.target.closest('.mds-saga-item');
  if (sagaItem && !sagaItem.classList.contains('current')) {
    openMovieDetailSheet(sagaItem.dataset.movieId); // remplace la fiche actuelle par celle du film de la saga choisi
    return;
  }
  const sagaLink = e.target.closest('.mds-saga-link');
  if (sagaLink) {
    closeMovieDetailSheet();
    openSagaSheet(sagaLink.dataset.collectionId, sagaLink.dataset.collectionName);
    return;
  }

  if (e.target.closest('#mds-rate-btn')) {
    if (!mdsCurrentData) return;
    const year = mdsCurrentData.release_date ? mdsCurrentData.release_date.slice(0, 4) : '????';
    closeMovieDetailSheet();
    selectMovie(mdsCurrentData, year);
    if (window.innerWidth <= 860) switchMobileNav('rating');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (e.target.closest('#mds-watchlist-btn')) {
    if (!mdsCurrentData) return;
    const year = mdsCurrentData.release_date ? mdsCurrentData.release_date.slice(0, 4) : '';
    addToWatchlistFromTMDb(mdsCurrentData, year);
    closeMovieDetailSheet();
    return;
  }

  const editBtn = e.target.closest('#mds-edit-btn');
  if (editBtn) {
    const idx = parseInt(editBtn.dataset.idx, 10);
    closeMovieDetailSheet();
    loadItem(idx);
    if (window.innerWidth <= 860) switchMobileNav('rating');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// ═══════════════════════════════════════════
//  FICHE PERSONNE (réalisateur/acteur)
// ═══════════════════════════════════════════
// Bio + filmographie complète + pourcentage déjà vu (films de sa filmographie
// présents dans l'historique de l'utilisateur). Ouverte en tapant un nom de
// réalisateur/acteur dans la fiche film.
const pdsEl = document.getElementById('person-detail-sheet');
const pdsContentEl = document.getElementById('pds-content');
const pdsCloseBtn = document.getElementById('pds-close-btn');

function buildPdsSkeleton(personName) {
  return `
    <div class="mds-skeleton">
      <div class="mds-skeleton-poster skeleton-bg"></div>
      <div class="mds-skeleton-lines">
        <div class="skeleton-text long skeleton-bg" style="height:18px;">${escAttr(personName || '')}</div>
        <div class="skeleton-text short skeleton-bg"></div>
      </div>
    </div>
    <div class="skeleton-text long skeleton-bg" style="margin-top:18px;"></div>
    <div class="skeleton-text long skeleton-bg"></div>
  `;
}

// Combine cast + équipe technique en une filmographie dédoublonnée (une
// personne peut apparaître à la fois comme actrice ET réalisatrice sur le
// même film, ex: dans les deux listes renvoyées par TMDb). Marque aussi
// chaque film comme "vu" ou non (par tmdbId dans l'historique) — utilisé à la
// fois pour le pourcentage et pour griser les affiches déjà vues.
function buildPersonFilmography(data) {
  const history = loadHistory();
  const seenIds = new Set(history.map(h => String(h.tmdbId)).filter(Boolean));

  // Limite la filmographie au rôle PRINCIPAL de la personne plutôt que de tout
  // mélanger (un réalisateur crédité comme producteur ou scénariste sur un
  // film n'a, à nos yeux ici, pas "réalisé" ce film-là — c'est ce qui gonflait
  // la filmographie de films produits/écrits en plus de ceux réalisés).
  const dept = data.known_for_department;
  let source;
  if (dept === 'Directing') {
    source = (data.movie_credits?.crew || []).filter(m => m.job === 'Director');
  } else if (dept === 'Writing') {
    source = (data.movie_credits?.crew || []).filter(m => m.department === 'Writing');
  } else if (dept === 'Acting') {
    source = data.movie_credits?.cast || [];
  } else {
    // Département moins courant (Production, Camera...) : pas de règle
    // spécifique établie, on garde le mélange complet plutôt que de risquer
    // de cacher des films pertinents pour ces cas plus rares.
    source = [...(data.movie_credits?.cast || []), ...(data.movie_credits?.crew || [])];
  }

  const seen = new Set();
  const films = [];
  source.forEach(m => {
    if (!m.id || seen.has(m.id)) return;
    seen.add(m.id);
    films.push({ id: m.id, title: m.title, release_date: m.release_date, poster_path: m.poster_path, isSeen: seenIds.has(String(m.id)) });
  });
  films.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
  return films;
}

// Pourcentage de la filmographie déjà présent dans l'historique de
// l'utilisateur — le petit "plus" ludique de cette fiche.
function computeSeenPercentage(films) {
  const seenCount = films.filter(f => f.isSeen).length;
  const pct = films.length > 0 ? Math.round((seenCount / films.length) * 100) : 0;
  return { seenCount, total: films.length, pct };
}

function buildPdsContent(data) {
  const films = buildPersonFilmography(data);
  const { seenCount, total, pct } = computeSeenPercentage(films);
  const photoUrl = tmdbImage(data.profile_path, 'w185');
  const bio = data.biography
    ? (data.biography.length > 400 ? data.biography.slice(0, 400) + '…' : data.biography)
    : '';

  return `
    <div class="mds-header" style="animation-delay:0s; --mds-backdrop: ${photoUrl ? `url('${tmdbImage(data.profile_path, 'w780')}')` : 'none'}">
      ${photoUrl
        ? `<img class="mds-poster" src="${photoUrl}" alt="Photo de ${escAttr(data.name)}" loading="lazy">`
        : `<div class="mds-poster mds-poster-ph">${ICONS.clapper}</div>`}
      <div class="mds-header-info">
        <div class="mds-title" id="pds-title">${escAttr(data.name)}</div>
        <div class="mds-meta">${escAttr(data.known_for_department || '')}</div>
      </div>
    </div>

    <div class="mds-section pds-completion" style="animation-delay:.05s">
      <div class="mds-section-title">Films vus dans sa filmographie</div>
      <div class="pds-completion-bar"><div class="pds-completion-fill" style="width:${pct}%"></div></div>
      <div class="pds-completion-label">${seenCount} / ${total} film${total > 1 ? 's' : ''} vus (${pct}%)</div>
    </div>

    ${bio ? `
      <div class="mds-section" style="animation-delay:.1s">
        <div class="mds-section-title">Biographie</div>
        <div class="mds-overview">${escAttr(bio)}</div>
      </div>` : ''}

    <div class="mds-section" style="animation-delay:.15s">
      <div class="mds-section-title">Filmographie (${total})</div>
      <div class="pds-filmography">
        ${films.map(f => {
          const posterUrl = tmdbImage(f.poster_path, 'w185');
          const year = f.release_date ? f.release_date.slice(0, 4) : '';
          return `
            <div class="pds-film-item${f.isSeen ? ' seen' : ''}" data-movie-id="${f.id}" title="${f.isSeen ? 'Déjà vu' : ''}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(f.title)}${f.isSeen ? ', déjà vu' : ''}">
              ${posterUrl
                ? `<img class="pds-film-poster" src="${posterUrl}" alt="Affiche de ${escAttr(f.title)}" loading="lazy">`
                : `<div class="pds-film-poster pds-film-poster-ph">${ICONS.clapper}</div>`}
              <div class="pds-film-title">${escAttr(f.title)}</div>
              <div class="pds-film-year">${year}</div>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

async function openPersonDetailSheet(personId, personName) {
  if (!personId) return;
  lastFocusedBeforeModal = document.activeElement;
  pdsContentEl.innerHTML = buildPdsSkeleton(personName);
  pdsEl.classList.add('open');
  pdsCloseBtn.focus(); // déplace le focus DANS la fiche à l'ouverture

  try {
    const res = await fetch(`/api/search?personId=${personId}`);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (!data || !data.name) throw new Error('no data');
    pdsContentEl.innerHTML = buildPdsContent(data);
  } catch (e) {
    pdsContentEl.innerHTML = `<div class="mds-error">Impossible de charger cette fiche pour l'instant. Vérifie ta connexion et réessaie.</div>`;
  }
}

function closePersonDetailSheet() {
  closeModal(pdsEl);
}

pdsCloseBtn.addEventListener('click', closePersonDetailSheet);
pdsEl.addEventListener('click', (e) => {
  if (e.target === pdsEl) { closePersonDetailSheet(); return; }
  const filmItem = e.target.closest('.pds-film-item');
  if (filmItem) {
    closePersonDetailSheet();
    openMovieDetailSheet(filmItem.dataset.movieId);
  }
});

// ═══════════════════════════════════════════
//  GLISSER VERS LE BAS POUR FERMER
// ═══════════════════════════════════════════
// En plus de la croix (gardée pour clavier/souris/lecteurs d'écran) : sur
// mobile, glisser la fiche vers le bas la ferme, geste naturel et attendu
// pour ce genre de panneau. Ne s'active que si la fiche est déjà tout en haut
// de son propre défilement (sinon un glissement vers le bas doit d'abord
// juste faire remonter le contenu) et pas depuis une zone qui gère déjà son
// propre geste horizontal (carrousel de casting).
function initSwipeToClose(overlayEl, closeFn) {
  const box = overlayEl.querySelector('.mds-box');
  if (!box) return;
  const THRESHOLD = 110;
  let startY = 0;
  let dragging = false;
  let currentDelta = 0;

  box.addEventListener('touchstart', (e) => {
    if (box.scrollTop > 5) return;
    if (e.target.closest('.mds-cast-carousel, .mds-trailer-wrap')) return;
    startY = e.touches[0].clientY;
    dragging = true;
    box.style.transition = 'none';
  }, { passive: true });

  box.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY <= 0 || box.scrollTop > 5) { dragging = false; box.style.transition = ''; box.style.transform = ''; return; }
    currentDelta = deltaY;
    box.style.transform = `translateY(${deltaY}px) scale(1)`;
    overlayEl.style.backgroundColor = `rgba(0,0,0,${Math.max(0, 0.8 - deltaY / 250)})`;
  }, { passive: true });

  box.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    // Système de mouvement unifié (voir styles.css :root) plutôt qu'une durée
    // isolée : 240ms correspond à --dur-base, JS et CSS ne peuvent pas
    // partager directement une valeur ici (transition posée en JS), donc la
    // constante est dupliquée consciemment — le setTimeout ci-dessous DOIT
    // rester synchronisé avec elle.
    const CLOSE_DUR_MS = 240;
    box.style.transition = `transform ${CLOSE_DUR_MS}ms var(--ease-out)`;
    if (currentDelta > THRESHOLD) {
      box.style.transform = `translateY(100%) scale(1)`;
      // Attend la fin RÉELLE de l'animation avant de fermer : le délai précédent
      // (180ms) coupait la feuille avant que le glissement vers le bas ait
      // visuellement terminé sa course (transition de 220ms) — léger "saut"
      // perceptible en toute fin de fermeture.
      setTimeout(() => {
        closeFn();
        box.style.transform = '';
        box.style.transition = '';
        overlayEl.style.backgroundColor = '';
      }, CLOSE_DUR_MS);
    } else {
      box.style.transform = '';
      overlayEl.style.backgroundColor = '';
    }
    currentDelta = 0;
  });
}

initSwipeToClose(mdsEl, closeMovieDetailSheet);
initSwipeToClose(pdsEl, closePersonDetailSheet);

// Reprise après erreur de chargement : délégué au niveau racine du fichier
// (jamais dans une fonction de rendu conditionnelle — leçon apprise).
mdsContentEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('.error-retry-btn[data-retry-tmdb-id]');
  if (!btn) return;
  openMovieDetailSheet(btn.dataset.retryTmdbId);
});

// ═══ CHOIX DE L'AFFICHE ═══
// TMDb propose souvent des dizaines de variantes d'affiche par film (langues,
// éditions, versions sans texte). Ce sélecteur laisse choisir SA version : le
// choix est persisté dans l'historique ET toutes les watchlists où le film
// apparaît — il voyage donc naturellement avec les sauvegardes JSON, sans
// table de correspondance séparée à maintenir.

function isInCollection(tmdbId) {
  const inHistory = loadHistory().some(h => String(h.tmdbId) === String(tmdbId));
  if (inHistory) return true;
  return loadWatchlistsMeta().some(meta =>
    loadWatchlist(meta.id).some(w => String(w.tmdbId) === String(tmdbId))
  );
}

function applyChosenPoster(tmdbId, posterUrl) {
  let touched = 0;
  // updatedAt est CRUCIAL ici : la fusion de la synchro cloud garde la version
  // la plus récente par updatedAt — sans le mettre à jour, le choix d'affiche
  // était silencieusement écrasé par la copie distante au sync suivant
  // ("l'affiche ne se sauvegarde pas", alors que le stockage local était bon).
  const now = new Date().toISOString();
  const history = loadHistory();
  let histChanged = false;
  for (const h of history) {
    if (String(h.tmdbId) === String(tmdbId)) { h.poster = posterUrl; h.updatedAt = now; histChanged = true; touched++; }
  }
  if (histChanged) saveHistory(history);

  for (const meta of loadWatchlistsMeta()) {
    const list = loadWatchlist(meta.id);
    let listChanged = false;
    for (const w of list) {
      if (String(w.tmdbId) === String(tmdbId)) { w.poster = posterUrl; w.updatedAt = now; listChanged = true; touched++; }
    }
    if (listChanged) saveWatchlist(list, meta.id);
  }
  return touched;
}

// Calcule et pose une hauteur EXACTE en pixels sur chaque case du sélecteur
// d'affiches, dérivée de la largeur réelle mesurée (ratio 2:3 : hauteur =
// largeur × 1,5). Après deux échecs consécutifs de techniques CSS pures dans
// ce contexte grid+bouton+img (aspect-ratio direct, puis padding-top en %,
// tous deux cassés en pratique sur iOS malgré les tests — voir les
// commentaires CSS historiques), on calcule des pixels concrets : aucune
// résolution de pourcentage ambiguë possible, donc aucun risque de ce bug de
// case tronquée qui ne montrait qu'une fine tranche de chaque affiche.
function applyPosterCellHeights(grid) {
  function apply() {
    const cells = grid.querySelectorAll('.poster-picker-cell');
    if (cells.length === 0) return;
    const width = cells[0].getBoundingClientRect().width;
    if (width <= 0) return; // grille pas encore rendue/visible, on retentera au resize
    const height = Math.round(width * 1.5);
    cells.forEach(c => { c.style.height = `${height}px`; });
  }
  // Un frame d'attente : au moment de l'appel, le innerHTML vient tout juste
  // d'être posé et la grille peut ne pas avoir encore de largeur calculée.
  requestAnimationFrame(apply);
  // Recalcule sur rotation d'écran tant que la modale reste ouverte — retire
  // l'écouteur à la fermeture pour ne pas accumuler de fuite mémoire.
  const modal = document.getElementById('poster-picker-modal');
  const onResize = () => apply();
  window.addEventListener('resize', onResize);
  const cleanup = () => {
    window.removeEventListener('resize', onResize);
    modal?.removeEventListener('transitionend', maybeCleanup);
  };
  function maybeCleanup() { if (!modal.classList.contains('open')) cleanup(); }
  modal?.addEventListener('transitionend', maybeCleanup);
}

async function openPosterPicker(tmdbId, mediaType = 'movie') {
  const modal = document.getElementById('poster-picker-modal');
  const grid = document.getElementById('poster-picker-grid');
  if (!modal || !grid) return;
  modal.classList.add('open');
  grid.innerHTML = `<div class="poster-picker-loading">${'<div class="poster-picker-cell skeleton-bg"></div>'.repeat(6)}</div>`;

  try {
    const param = mediaType === 'tv' ? 'tvImages' : 'images';
    const res = await fetch(`/api/search?${param}=${encodeURIComponent(tmdbId)}`);
    // readApiJson lève si l'API a réellement échoué, au lieu de laisser une
    // réponse d'erreur passer pour "aucune affiche disponible" (voir
    // 03-foundation.js) — sans ça, une vraie panne d'API semblait être un
    // simple manque de variantes pour ce film precis.
    const data = await readApiJson(res);
    const posters = (data && data.posters) || [];
    if (posters.length === 0) {
      grid.innerHTML = `<div class="poster-picker-empty">Aucune affiche alternative disponible pour ${mediaType === 'tv' ? 'cette série' : 'ce film'}.</div>`;
      return;
    }
    grid.innerHTML = posters.map(p => `
      <button type="button" class="poster-picker-cell" data-poster-path="${escAttr(p.file_path)}" aria-label="Choisir cette affiche">
        <img src="${tmdbImage(p.file_path, 'w185')}" alt="" loading="lazy" decoding="async">
      </button>
    `).join('');
    grid.dataset.tmdbId = String(tmdbId);
    grid.dataset.mediaType = mediaType;
    applyPosterCellHeights(grid);
  } catch (err) {
    grid.innerHTML = `
      <div class="error-state">
        <div class="error-state-msg">${escAttr(describeApiFailure(err))}</div>
        <button type="button" class="error-retry-btn" data-retry-posters="${escAttr(String(tmdbId))}" data-retry-media-type="${mediaType}">Réessayer</button>
      </div>`;
  }
}

// Gestionnaires délégués au niveau RACINE (leçon apprise : jamais dans une
// fonction de rendu conditionnelle).
document.getElementById('movie-detail-sheet')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.mds-poster-change-btn');
  if (btn) openPosterPicker(btn.dataset.posterPicker);
});

document.getElementById('poster-picker-modal')?.addEventListener('click', (e) => {
  const modal = document.getElementById('poster-picker-modal');
  if (e.target === modal) { modal.classList.remove('open'); return; }
  if (e.target.closest('#poster-picker-close')) { modal.classList.remove('open'); return; }

  const retry = e.target.closest('.error-retry-btn[data-retry-posters]');
  if (retry) { openPosterPicker(retry.dataset.retryPosters, retry.dataset.retryMediaType || 'movie'); return; }

  const cell = e.target.closest('.poster-picker-cell[data-poster-path]');
  if (!cell) return;
  const grid = document.getElementById('poster-picker-grid');
  const tmdbId = grid.dataset.tmdbId;
  const mediaType = grid.dataset.mediaType || 'movie';
  modal.classList.remove('open');

  if (mediaType === 'tv') {
    // Les séries stockent déjà poster_path en fragment brut TMDb (pas une
    // URL complète comme les films) — on garde ce même format plutôt que
    // d'introduire une seconde représentation.
    if (typeof applyChosenTvPoster === 'function') applyChosenTvPoster(tmdbId, cell.dataset.posterPath);
    if (navigator.vibrate) navigator.vibrate(15);
    const sheetPoster = document.querySelector('#tv-detail-sheet .mds-poster');
    if (sheetPoster && sheetPoster.tagName === 'IMG') {
      sheetPoster.src = tmdbImage(cell.dataset.posterPath, 'w342');
    }
    if (typeof renderTvHistory === 'function' && document.getElementById('hist-tab-tv')?.classList.contains('active')) renderTvHistory();
    showToast('Affiche mise à jour');
    return;
  }

  // w342 (pas w185) : c'est la résolution que la fiche film affiche en
  // grand — sauvegarder la taille "vignette" du sélecteur aurait rendu
  // l'affiche floue une fois agrandie sur la fiche. Les vignettes ailleurs
  // (historique, watchlist) se contentent très bien de la redimensionner
  // vers le bas.
  const url = tmdbImage(cell.dataset.posterPath, 'w342');
  const touched = applyChosenPoster(tmdbId, url);
  if (navigator.vibrate) navigator.vibrate(15);

  // Rafraîchit l'affiche visible dans la fiche immédiatement (w342 pour la
  // grande vue, même chemin de fichier)
  const sheetPoster = document.querySelector('#movie-detail-sheet .mds-poster');
  if (sheetPoster && sheetPoster.tagName === 'IMG') {
    sheetPoster.src = tmdbImage(cell.dataset.posterPath, 'w342');
  }
  renderAll();
  showToast(touched > 0 ? 'Affiche mise à jour dans ta collection' : 'Affiche mise à jour');
});

// ═══════════════════════════════════════════
//  DUELS ELO
// ═══════════════════════════════════════════
// "Lequel préfères-tu ?" : l'app propose deux films déjà vus, on choisit, et
// un classement personnel se construit duel après duel — système ELO, le même
// que les échecs. Pourquoi ELO plutôt qu'un tri manuel : chaque duel n'exige
// qu'une micro-décision facile ("celui-là"), et le classement global émerge
// tout seul, y compris entre films jamais comparés directement.
//
// Les cotes vivent dans leur propre clé localStorage (lbx_duels), séparée de
// l'historique : l'export/import de l'historique n'est pas pollué par des
// données de jeu, et supprimer un film de l'historique ne casse rien ici
// (sa cote devient simplement orpheline et ignorée).

const DUELS_KEY = 'lbx_duels';
const DUEL_START_ELO = 1200;
const DUEL_K = 32; // facteur K standard : assez réactif sans être erratique

function duelFilmKey(item) {
  return (item.title + '|' + (item.year || '')).toLowerCase();
}

function loadDuelsData() {
  try {
    const d = JSON.parse(localStorage.getItem(DUELS_KEY)) || {};
    // pairs : memoire des affrontements deja joues (cle canonique triee),
    // pour ne JAMAIS reproposer deux fois le meme duel. Le || {} assure la
    // compatibilite avec les donnees d'avant cette fonctionnalite.
    return { ratings: d.ratings || {}, totalDuels: d.totalDuels || 0, pairs: d.pairs || {} };
  }
  catch { return { ratings: {}, totalDuels: 0, pairs: {} }; }
}

function duelPairKey(keyA, keyB) {
  return [keyA, keyB].sort().join('||');
}
function saveDuelsData(data) {
  localStorage.setItem(DUELS_KEY, JSON.stringify(data));
}

function getDuelRating(data, key) {
  return data.ratings[key] || { elo: DUEL_START_ELO, duels: 0 };
}

// Cœur mathématique dans 03b-pure-logic.js (computeEloUpdate), testé dans
// tests/duels.test.js — ici uniquement le stockage, la sélection de paires
// et le rendu.

// Choisit la paire du prochain duel : privilégie les films les MOINS déjà
// duellés, puis parmi eux, deux films aux cotes PROCHES — mais JAMAIS deux
// films qui se sont déjà affrontés (mémoire data.pairs). Si toutes les paires
// possibles ont été jouées, retourne { exhausted: true } pour un message dédié.
function pickDuelPair() {
  const history = loadHistory();
  if (history.length < 2) return null;
  const data = loadDuelsData();

  // Déduplique par clé (re-visionnages = même film)
  const seen = new Set();
  const films = [];
  for (const item of history) {
    const key = duelFilmKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    films.push({ key, item, ...getDuelRating(data, key) });
  }
  if (films.length < 2) return null;

  // PASSE 1 — départage : s'il existe quelque part une paire jamais affrontée
  // de films ayant la MÊME note dans l'historique (deux 8/10 à ordonner
  // enfin), elle passe en priorité absolue. Parmi ces paires, celles ayant le
  // moins duellé d'abord, avec un peu de hasard entre égalités.
  const tiebreakPairs = [];
  for (let i = 0; i < films.length; i++) {
    const si = parseFloat(films[i].item.score);
    if (isNaN(si)) continue;
    for (let j = i + 1; j < films.length; j++) {
      if (parseFloat(films[j].item.score) !== si) continue;
      if (data.pairs[duelPairKey(films[i].key, films[j].key)]) continue;
      tiebreakPairs.push([films[i], films[j]]);
    }
  }
  if (tiebreakPairs.length > 0) {
    tiebreakPairs.sort((a, b) => (a[0].duels + a[1].duels) - (b[0].duels + b[1].duels) || Math.random() - 0.5);
    const [first, second] = tiebreakPairs[0];
    return Math.random() < 0.5 ? [first, second] : [second, first];
  }

  // PASSE 2 — cas général : les moins expérimentés d'abord, adversaire proche en cote.
  const byExperience = films.slice().sort((a, b) => a.duels - b.duels || Math.random() - 0.5);

  for (const first of byExperience) {
    const unfought = films.filter(f =>
      f.key !== first.key && !data.pairs[duelPairKey(first.key, f.key)]
    );
    if (unfought.length === 0) continue;
    unfought.sort((a, b) => Math.abs(a.elo - first.elo) - Math.abs(b.elo - first.elo));
    const nearest = unfought.slice(0, Math.min(5, unfought.length));
    const second = nearest[Math.floor(Math.random() * nearest.length)];
    return Math.random() < 0.5 ? [first, second] : [second, first];
  }

  return { exhausted: true }; // toutes les paires possibles ont été jouées
}

function resolveDuel(winnerKey, loserKey) {
  const data = loadDuelsData();
  const w = getDuelRating(data, winnerKey);
  const l = getDuelRating(data, loserKey);
  const { winnerElo, loserElo, delta } = computeEloUpdate(w.elo, l.elo, DUEL_K);
  data.ratings[winnerKey] = { elo: winnerElo, duels: w.duels + 1 };
  data.ratings[loserKey] = { elo: loserElo, duels: l.duels + 1 };
  data.pairs[duelPairKey(winnerKey, loserKey)] = true; // ce duel ne sera plus jamais reproposé
  data.totalDuels = (data.totalDuels || 0) + 1;
  saveDuelsData(data);
  return delta;
}

// Classement : uniquement les films ayant réellement duellé (>= 3 duels pour
// éviter qu'un film à 1 victoire chanceuse squatte le podium), croisé avec
// l'historique pour ignorer les cotes orphelines de films supprimés.
function computeDuelRanking(minDuels = 3) {
  const history = loadHistory();
  const data = loadDuelsData();
  const seen = new Set();
  const ranked = [];
  for (const item of history) {
    const key = duelFilmKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    const r = data.ratings[key];
    if (r && r.duels >= minDuels) ranked.push({ key, item, elo: r.elo, duels: r.duels });
  }
  ranked.sort((a, b) => b.elo - a.elo);
  return ranked;
}

// ── Rendu ──
let currentDuelPair = null;

function duelPosterHtml(item) {
  return item.poster
    ? `<img class="duel-poster" src="${item.poster}" alt="" loading="lazy" decoding="async">`
    : `<div class="duel-poster duel-poster-ph">${ICONS.clapper}</div>`;
}

function renderDuel() {
  const arena = document.getElementById('duel-arena');
  const emptyEl = document.getElementById('duel-empty');
  if (!arena || !emptyEl) return;

  currentDuelPair = pickDuelPair();
  if (!currentDuelPair || currentDuelPair.exhausted) {
    arena.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.textContent = currentDuelPair && currentDuelPair.exhausted
      ? 'Tous les duels possibles ont été joués — ton classement est complet ! Note de nouveaux films pour relancer l\'arène.'
      : 'Note au moins 2 films pour lancer les duels.';
    if (currentDuelPair && currentDuelPair.exhausted) currentDuelPair = null;
    return;
  }
  arena.style.display = '';
  emptyEl.style.display = 'none';

  const [a, b] = currentDuelPair;
  arena.innerHTML = `
    <div class="duel-side" data-key="${escAttr(a.key)}" role="button" tabindex="0" aria-label="Choisir ${escAttr(a.item.title)}">
      ${duelPosterHtml(a.item)}
      <div class="duel-title">${escAttr(a.item.title)}</div>
      <div class="duel-year">${a.item.year || ''}</div>
    </div>
    <div class="duel-vs">VS</div>
    <div class="duel-side" data-key="${escAttr(b.key)}" role="button" tabindex="0" aria-label="Choisir ${escAttr(b.item.title)}">
      ${duelPosterHtml(b.item)}
      <div class="duel-title">${escAttr(b.item.title)}</div>
      <div class="duel-year">${b.item.year || ''}</div>
    </div>
  `;
}

function renderDuelRanking() {
  const listEl = document.getElementById('duel-ranking-list');
  const counterEl = document.getElementById('duel-counter');
  if (!listEl) return;
  const data = loadDuelsData();
  if (counterEl) counterEl.textContent = data.totalDuels > 0 ? `${data.totalDuels} duel${data.totalDuels > 1 ? 's' : ''}` : '';

  const ranking = computeDuelRanking().slice(0, 10);
  if (ranking.length === 0) {
    listEl.innerHTML = `<div class="duel-ranking-empty">Ton podium apparaîtra après quelques duels (3 duels minimum par film).</div>`;
    return;
  }
  // Podium (top 3) toujours visible, sans les points ELO — c'est l'ORDRE qui
  // compte pour l'utilisateur, le chiffre interne n'apporte que du bruit. Le
  // reste du top 10 se déplie à la demande (accordéon natif <details>).
  // Médailles en SVG (même dessin, trois teintes or/argent/bronze via CSS)
  // plutôt que les emojis 🥇🥈🥉 : rendu identique sur tous les appareils,
  // couleurs cohérentes avec le thème actif.
  const medals = [
    `<span class="duel-medal duel-medal-gold">${ICONS.medal}</span>`,
    `<span class="duel-medal duel-medal-silver">${ICONS.medal}</span>`,
    `<span class="duel-medal duel-medal-bronze">${ICONS.medal}</span>`,
  ];
  const rowHtml = (r, i) => `
    <div class="duel-rank-row">
      <span class="duel-rank-pos">${medals[i] || (i + 1)}</span>
      <span class="duel-rank-title">${escAttr(r.item.title)}</span>
    </div>`;
  const podium = ranking.slice(0, 3).map(rowHtml).join('');
  const rest = ranking.slice(3);
  const restHtml = rest.length > 0 ? `
    <details class="duel-rank-more">
      <summary>Voir le reste du top 10 (${rest.length})</summary>
      ${rest.map((r, i) => rowHtml(r, i + 3)).join('')}
    </details>` : '';
  listEl.innerHTML = podium + restHtml;
}

function renderDuelsSection() {
  renderDuel();
  renderDuelRanking();
}

// Gestion des choix : délégué au niveau racine (leçon apprise : jamais dans
// une fonction de rendu conditionnelle, sinon il disparaît selon le chemin).
document.getElementById('duel-arena')?.addEventListener('click', (e) => {
  const side = e.target.closest('.duel-side');
  if (!side || !currentDuelPair) return;
  const winnerKey = side.dataset.key;
  const loser = currentDuelPair.find(f => f.key !== winnerKey);
  const winner = currentDuelPair.find(f => f.key === winnerKey);
  if (!winner || !loser) return;

  resolveDuel(winner.key, loser.key);
  if (navigator.vibrate) navigator.vibrate(15);

  // Petit feedback visuel avant d'enchaîner sur la paire suivante
  side.classList.add('duel-winner');
  currentDuelPair = null; // fige les clics le temps de l'animation
  setTimeout(() => {
    renderDuelsSection();
  }, 450);
});

document.getElementById('duel-arena')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const side = e.target.closest('.duel-side');
  if (side) { e.preventDefault(); side.click(); }
});

document.getElementById('duel-skip-btn')?.addEventListener('click', () => {
  renderDuel(); // nouvelle paire, aucune cote touchée
});

// ── Réinitialisation des duels (depuis Réglages) ──
// Efface UNIQUEMENT le classement ELO, le compteur de duels, les paires déjà
// jouées et l'état "duel du jour joué" — ne touche jamais à l'historique des
// films ni à leurs notes. Confirmation obligatoire : c'est irréversible et
// perd une vraie progression (parfois des dizaines de duels joués).
document.getElementById('reset-duels-btn')?.addEventListener('click', () => {
  openModal(
    'Réinitialiser les duels ?',
    'Le classement, les cotes et l\'historique des affrontements déjà joués seront définitivement effacés. Tes films et tes notes ne sont pas concernés. Cette action est irréversible.',
    () => {
      localStorage.removeItem(DUELS_KEY);
      if (typeof renderDuelsSection === 'function') renderDuelsSection();
      showToast('Duels réinitialisés.');
    },
    true // danger : bouton rouge "Supprimer"
  );
});

// ═══════════════════════════════════════════
//  LISTES PRÉDÉFINIES — logique et affichage
// ═══════════════════════════════════════════
// Deux natures de contenu bien distinctes, à ne pas présenter pareil :
// - "Tous les temps" : compilée à la main (voir 00f-curated-lists-data.js),
//   sur le classement Sight & Sound 2022 — une vraie référence critique.
// - Par décennie : tri algorithmique TMDb (note + 500 votes minimum, voir
//   api/search.js) — annoncé comme tel dans l'app, "les mieux notés sur
//   TMDb", pas un vrai palmarès critique. Toutes les décennies disponibles,
//   des années 1920 (le cinéma sonore/l'ère TMDb couvre correctement) à
//   aujourd'hui — les décennies les plus anciennes auront naturellement
//   moins de films avec 500+ votes, ce qui est normal, pas un défaut.
const CURATED_RESOLVED_KEY = 'lbx_curated_alltime_resolved';
const CURATED_DECADE_KEY_PREFIX = 'lbx_curated_decade_v2_'; // v2 : invalide le cache d'avant le correctif de l'annee manquante (voir withExtractedYear)
const CURATED_DECADE_CACHE_DAYS = 30;
const CURATED_DECADES = [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

function curatedDecadeLabel(startYear) {
  return `Les meilleurs des années ${startYear}`;
}

// ── Résolution "Tous les temps" (titre+année -> id/affiche TMDb) ──
// Se fait une seule fois, en tâche de fond, par lots pour respecter la
// limite de débit du proxy (60 requêtes/minute) — pas un souci pour
// l'usage normal de recherche, mais 100 titres d'un coup la dépasserait.
function loadResolvedAllTime() {
  try { return JSON.parse(localStorage.getItem(CURATED_RESOLVED_KEY) || '{}'); } catch { return {}; }
}
function saveResolvedAllTime(map) {
  localStorage.setItem(CURATED_RESOLVED_KEY, JSON.stringify(map));
}

async function resolveOneCuratedFilm(entry) {
  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(entry.title)}`);
    const data = await readApiJson(res);
    const results = data.results || [];
    // Cherche une correspondance sur l'année (±1 pour absorber les écarts de
    // date de sortie selon les pays) parmi les résultats de recherche par
    // titre, plutôt que de prendre le premier résultat les yeux fermés.
    const match = results.find(r => {
      const y = r.release_date ? parseInt(r.release_date.slice(0, 4), 10) : null;
      return y && Math.abs(y - entry.year) <= 1;
    }) || results[0];
    if (!match) return null;
    return { id: match.id, title: match.title, year: entry.year, poster_path: match.poster_path };
  } catch {
    return null;
  }
}

let curatedResolutionInProgress = false;
async function ensureAllTimeResolved(onProgress) {
  const resolved = loadResolvedAllTime();
  const missing = CURATED_ALL_TIME.filter(f => !resolved[f.title]);
  if (missing.length === 0) return resolved;
  if (curatedResolutionInProgress) return resolved; // évite deux résolutions en parallèle si l'onglet est rouvert vite
  curatedResolutionInProgress = true;

  const BATCH_SIZE = 8;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(resolveOneCuratedFilm));
    batch.forEach((entry, idx) => {
      if (results[idx]) resolved[entry.title] = results[idx];
    });
    saveResolvedAllTime(resolved);
    if (onProgress) onProgress(Object.keys(resolved).length, CURATED_ALL_TIME.length);
    if (i + BATCH_SIZE < missing.length) await new Promise(r => setTimeout(r, 1500));
  }
  curatedResolutionInProgress = false;
  return resolved;
}

function getAllTimeFilmsFromCache() {
  const resolved = loadResolvedAllTime();
  return CURATED_ALL_TIME.map(f => resolved[f.title]).filter(Boolean);
}

// ── Listes par décennie ──
function loadDecadeCache(startYear) {
  try {
    const raw = JSON.parse(localStorage.getItem(CURATED_DECADE_KEY_PREFIX + startYear) || 'null');
    if (!raw) return null;
    const ageDays = (Date.now() - raw.fetchedAt) / 86400000;
    if (ageDays > CURATED_DECADE_CACHE_DAYS) return null;
    return raw.films;
  } catch { return null; }
}
// Normalise .year depuis .release_date : les résultats bruts de l'API
// discover TMDb (décennies, studios) n'ont qu'une date complète, pas une
// année pré-extraite — sans ça, l'année s'affichait vide dans la grille
// (vrai bug trouvé en vérifiant le texte réellement affiché, pas juste le
// nombre de films).
function withExtractedYear(films) {
  return films.map(f => ({ ...f, year: f.year || (f.release_date ? f.release_date.slice(0, 4) : '') }));
}

async function fetchDecadeList(startYear) {
  const cached = loadDecadeCache(startYear);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/search?decadeTop=${startYear}`);
    const data = await readApiJson(res);
    const films = withExtractedYear(data.results || []);
    localStorage.setItem(CURATED_DECADE_KEY_PREFIX + startYear, JSON.stringify({ films, fetchedAt: Date.now() }));
    return films;
  } catch {
    return [];
  }
}

// ── Catalogues de studio ──
const CURATED_STUDIO_KEY_PREFIX = 'lbx_curated_studio_';
function loadStudioCache(studioId) {
  try {
    const raw = JSON.parse(localStorage.getItem(CURATED_STUDIO_KEY_PREFIX + studioId) || 'null');
    if (!raw) return null;
    const ageDays = (Date.now() - raw.fetchedAt) / 86400000;
    if (ageDays > CURATED_DECADE_CACHE_DAYS) return null; // même durée que les décennies : ça ne bouge presque jamais
    return raw.films;
  } catch { return null; }
}
async function fetchStudioList(studioId) {
  const cached = loadStudioCache(studioId);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/search?studioId=${studioId}`);
    const data = await readApiJson(res);
    const films = withExtractedYear(data.results || []);
    localStorage.setItem(CURATED_STUDIO_KEY_PREFIX + studioId, JSON.stringify({ films, fetchedAt: Date.now() }));
    return films;
  } catch {
    return [];
  }
}

// ── Cinéma par pays (carte du monde) ──
const CURATED_COUNTRY_KEY_PREFIX = 'lbx_curated_country_';
function loadCountryCache(code) {
  try {
    const raw = JSON.parse(localStorage.getItem(CURATED_COUNTRY_KEY_PREFIX + code) || 'null');
    if (!raw) return null;
    const ageDays = (Date.now() - raw.fetchedAt) / 86400000;
    if (ageDays > CURATED_DECADE_CACHE_DAYS) return null;
    return raw.films;
  } catch { return null; }
}
async function fetchCountryList(code) {
  const cached = loadCountryCache(code);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/search?countryCode=${code}`);
    const data = await readApiJson(res);
    const films = withExtractedYear(data.results || []);
    localStorage.setItem(CURATED_COUNTRY_KEY_PREFIX + code, JSON.stringify({ films, fetchedAt: Date.now() }));
    return films;
  } catch {
    return [];
  }
}

// ── Pourcentage déjà vu (même principe que pour un réalisateur/acteur) ──
function computeCuratedSeenPercentage(films) {
  const history = loadHistory();
  const seenIds = new Set(history.map(h => String(h.tmdbId)).filter(Boolean));
  const withSeen = films.map(f => ({ ...f, isSeen: seenIds.has(String(f.id)) }));
  const seenCount = withSeen.filter(f => f.isSeen).length;
  const pct = withSeen.length > 0 ? Math.round((seenCount / withSeen.length) * 100) : 0;
  return { films: withSeen, seenCount, total: withSeen.length, pct };
}

// ── Carte Profil : liste des listes disponibles ──
function renderCuratedListsCard() {
  const container = document.getElementById('curated-lists-container');
  if (!container) return;

  // "Tous les temps" reste toujours visible (la liste principale, compilée
  // à la main) — les 11 décennies partent dans un accordéon natif
  // <details>/<summary> replié par défaut (gratuit en accessibilité
  // clavier, pas besoin de JS pour le toggle) : les montrer toutes dépliées
  // d'un coup rendait la carte bien trop longue à faire défiler.
  const rowHtml = (e) => `
    <button type="button" class="curated-list-row" data-list-id="${e.id}">
      <div class="curated-list-row-text">
        <div class="curated-list-row-label">${escAttr(e.label)}</div>
        <div class="curated-list-row-sub">${escAttr(e.sub)}</div>
      </div>
      <div class="curated-list-row-pct" id="curated-pct-${e.id}">…</div>
    </button>`;

  const decadeEntries = CURATED_DECADES.map(y => ({ id: `decade-${y}`, label: curatedDecadeLabel(y), sub: 'Mieux notés sur TMDb (500 votes min.)' }));
  const studioEntries = CURATED_STUDIOS.map(s => ({ id: `studio-${s.id}`, label: s.name, sub: s.sub }));
  // Même design en lignes que les décennies/studios — la carte stylisée
  // (pastilles positionnées façon carte du monde) a été abandonnée : retour
  // utilisateur négatif sur son rendu visuel.
  const countryEntries = CURATED_COUNTRIES.map(c => ({ id: `country-${c.code}`, label: `${c.flag} ${c.name}`, sub: 'Mieux notés sur TMDb (200 votes min.)' }));

  container.innerHTML = `
    ${rowHtml({ id: 'alltime', label: 'Tous les temps', sub: 'Classement Sight & Sound 2022' })}
    <details class="curated-decades-accordion">
      <summary>Par décennie (${CURATED_DECADES.length})</summary>
      <div class="curated-decades-list">${decadeEntries.map(rowHtml).join('')}</div>
    </details>
    <details class="curated-decades-accordion">
      <summary>Par studio (${CURATED_STUDIOS.length})</summary>
      <div class="curated-decades-list">${studioEntries.map(rowHtml).join('')}</div>
    </details>
    <details class="curated-decades-accordion">
      <summary>Par pays (${CURATED_COUNTRIES.length})</summary>
      <div class="curated-decades-list">${countryEntries.map(rowHtml).join('')}</div>
    </details>
  `;

  container.querySelectorAll('.curated-list-row').forEach(btn => {
    btn.addEventListener('click', () => openCuratedListSheet(btn.dataset.listId));
  });

  // Décennies : rapide, direct depuis le cache serveur/local — pas besoin
  // d'attendre pour afficher un pourcentage. Calculé même repliées (léger,
  // et évite un "…" qui traîne si l'utilisateur déplie plus tard).
  CURATED_DECADES.forEach(async (y) => {
    const films = await fetchDecadeList(y);
    const { pct, total } = computeCuratedSeenPercentage(films);
    const el = document.getElementById(`curated-pct-decade-${y}`);
    if (el) el.textContent = total > 0 ? `${pct}%` : '—';
  });

  // Studios : même principe.
  CURATED_STUDIOS.forEach(async (s) => {
    const films = await fetchStudioList(s.id);
    const { pct, total } = computeCuratedSeenPercentage(films);
    const el = document.getElementById(`curated-pct-studio-${s.id}`);
    if (el) el.textContent = total > 0 ? `${pct}%` : '—';
  });

  // Pays : même principe.
  CURATED_COUNTRIES.forEach(async (c) => {
    const films = await fetchCountryList(c.code);
    const { pct, total } = computeCuratedSeenPercentage(films);
    const el = document.getElementById(`curated-pct-country-${c.code}`);
    if (el) el.textContent = total > 0 ? `${pct}%` : '—';
  });

  // "Tous les temps" : peut demander une résolution en tâche de fond la
  // toute première fois (jamais ensuite, résultat mis en cache
  // définitivement) — affiche le pourcentage progressivement plutôt que de
  // bloquer le reste de la carte en l'attendant.
  const alreadyResolved = getAllTimeFilmsFromCache();
  if (alreadyResolved.length === CURATED_ALL_TIME.length) {
    const { pct } = computeCuratedSeenPercentage(alreadyResolved);
    const el = document.getElementById('curated-pct-alltime');
    if (el) el.textContent = `${pct}%`;
  } else {
    ensureAllTimeResolved((done, totalCount) => {
      const el = document.getElementById('curated-pct-alltime');
      if (!el) return;
      if (done < totalCount) { el.textContent = `${done}/${totalCount}`; return; }
      const { pct } = computeCuratedSeenPercentage(getAllTimeFilmsFromCache());
      el.textContent = `${pct}%`;
    });
  }
}

// ── Feuille détail : grille des films, vus/manquants, ajout en masse ──
const clsEl = document.getElementById('curated-list-sheet');
const clsContentEl = document.getElementById('cls-content');
const clsCloseBtn = document.getElementById('cls-close-btn');

async function openCuratedListSheet(listId) {
  lastFocusedBeforeModal = document.activeElement;
  clsContentEl.innerHTML = `<div class="mds-header"><div class="mds-title">Chargement…</div></div>`;
  clsEl.classList.add('open');
  clsCloseBtn.focus();

  let label, films;
  if (listId === 'alltime') {
    label = 'Tous les temps';
    films = getAllTimeFilmsFromCache();
  } else if (listId.startsWith('studio-')) {
    const studioId = parseInt(listId.replace('studio-', ''), 10);
    const studio = CURATED_STUDIOS.find(s => s.id === studioId);
    label = studio ? studio.name : 'Studio';
    films = await fetchStudioList(studioId);
  } else if (listId.startsWith('country-')) {
    const code = listId.replace('country-', '');
    const country = CURATED_COUNTRIES.find(c => c.code === code);
    label = country ? `Cinéma ${country.flag} ${country.name}` : 'Cinéma';
    films = await fetchCountryList(code);
  } else {
    const startYear = parseInt(listId.replace('decade-', ''), 10);
    label = curatedDecadeLabel(startYear);
    films = await fetchDecadeList(startYear);
  }
  renderFilmGridSheet(label, films);
}

// Fiche saga (belongs_to_collection TMDb) — même mise en page que les
// listes prédéfinies (grille, % vu, ajout des manquants), juste une source
// de films différente. Réutilise la même feuille plutôt que d'en construire
// une nouvelle, à l'image de la fiche réalisateur.
async function openSagaSheet(collectionId, collectionName) {
  lastFocusedBeforeModal = document.activeElement;
  clsContentEl.innerHTML = `<div class="mds-header"><div class="mds-title">Chargement…</div></div>`;
  clsEl.classList.add('open');
  clsCloseBtn.focus();

  try {
    const res = await fetch(`/api/search?collectionId=${collectionId}`);
    const data = await readApiJson(res);
    const films = (data.parts || [])
      .filter(f => f.poster_path)
      .sort((a, b) => (a.release_date || '9999').localeCompare(b.release_date || '9999'))
      .map(f => ({ id: f.id, title: f.title, poster_path: f.poster_path, year: f.release_date ? f.release_date.slice(0, 4) : '' }));
    renderFilmGridSheet(data.name || collectionName, films);
  } catch {
    clsContentEl.innerHTML = `<div class="mds-error">Impossible de charger la saga. Vérifie ta connexion.</div>`;
  }
}

// Rendu partagé : grille de films avec pourcentage vu et ajout des
// manquants à la watchlist — utilisé par les listes prédéfinies ET les
// sagas, seule la provenance des films diffère.
function renderFilmGridSheet(label, films) {
  const { films: withSeen, seenCount, total, pct } = computeCuratedSeenPercentage(films);
  const missingCount = total - seenCount;

  clsContentEl.innerHTML = `
    <div class="mds-header" style="animation-delay:0s">
      <div class="mds-header-info">
        <div class="mds-title" id="cls-title">${escAttr(label)}</div>
        <div class="mds-meta">${total} film${total > 1 ? 's' : ''}</div>
      </div>
    </div>
    <div class="mds-section pds-completion" style="animation-delay:.05s">
      <div class="mds-section-title">Films vus dans cette liste</div>
      <div class="pds-completion-bar"><div class="pds-completion-fill" style="width:${pct}%"></div></div>
      <div class="pds-completion-label">${seenCount} / ${total} déjà vus (${pct}%)</div>
      ${missingCount > 0 ? `<button type="button" class="icon-btn" id="cls-add-missing-btn" style="margin-top:8px;">Ajouter les ${missingCount} manquant${missingCount > 1 ? 's' : ''} à ma watchlist</button>` : ''}
    </div>
    <div class="mds-section pds-filmography" style="animation-delay:.1s">
      ${withSeen.map(f => `
        <div class="pds-film-item${f.isSeen ? ' seen' : ''}" data-movie-id="${f.id}" title="${f.isSeen ? 'Déjà vu' : ''}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(f.title)}${f.isSeen ? ', déjà vu' : ''}">
          ${f.poster_path
            ? `<img class="pds-film-poster" src="${tmdbImage(f.poster_path, 'w185')}" alt="" loading="lazy">`
            : `<div class="pds-film-poster pds-film-poster-ph">${ICONS.clapper}</div>`}
          <div class="pds-film-title">${escAttr(f.title)}</div>
          <div class="pds-film-year">${f.year || ''}</div>
        </div>
      `).join('')}
    </div>
  `;

  const addBtn = document.getElementById('cls-add-missing-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      addBtn.disabled = true;
      addBtn.textContent = 'Ajout en cours…';
      const activeListId = getActiveWatchlistId();
      const missing = withSeen.filter(f => !f.isSeen);
      for (const f of missing) {
        await addToSpecificWatchlist({ id: f.id, title: f.title, poster_path: f.poster_path }, f.year, activeListId);
      }
      showToast(`${missing.length} film${missing.length > 1 ? 's' : ''} ajouté${missing.length > 1 ? 's' : ''} à ta watchlist.`);
      addBtn.textContent = 'Ajouté !';
    });
  }
}

function closeCuratedListSheet() {
  closeModal(clsEl);
}
clsCloseBtn.addEventListener('click', closeCuratedListSheet);
clsEl.addEventListener('click', (e) => {
  if (e.target === clsEl) { closeCuratedListSheet(); return; }
  const filmItem = e.target.closest('.pds-film-item');
  if (filmItem) {
    closeCuratedListSheet();
    openMovieDetailSheet(filmItem.dataset.movieId);
  }
});

// Raccourci depuis Découvrir : bascule vers Profil et fait défiler jusqu'à
// la carte, plutôt que de dupliquer la fonctionnalité à deux endroits.
document.getElementById('curated-lists-shortcut-btn')?.addEventListener('click', () => {
  switchMobileNav('profile');
  setTimeout(() => {
    document.getElementById('curated-lists-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
});

// ═══════════════════════════════════════════
//  EXPLORATION PAR THÈME (Découvrir)
// ═══════════════════════════════════════════
// Contrairement aux décennies/studios/pays (Profil, un vrai "canon" à
// suivre avec % vu), un mot-clé n'a pas de nombre canonique de films — vit
// ici comme un outil de navigation/suggestion. Cache plus court que les
// autres listes (5 jours, pas 30) : trié par popularité, qui évolue plus
// vite qu'un classement par note.
const CURATED_THEME_KEY_PREFIX = 'lbx_curated_theme_';
const CURATED_THEME_CACHE_DAYS = 5;
function loadThemeCache(id) {
  try {
    const raw = JSON.parse(localStorage.getItem(CURATED_THEME_KEY_PREFIX + id) || 'null');
    if (!raw) return null;
    const ageDays = (Date.now() - raw.fetchedAt) / 86400000;
    if (ageDays > CURATED_THEME_CACHE_DAYS) return null;
    return raw.films;
  } catch { return null; }
}
async function fetchThemeList(id) {
  const cached = loadThemeCache(id);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/search?keywordId=${id}`);
    const data = await readApiJson(res);
    const films = withExtractedYear(data.results || []);
    localStorage.setItem(CURATED_THEME_KEY_PREFIX + id, JSON.stringify({ films, fetchedAt: Date.now() }));
    return films;
  } catch {
    return [];
  }
}

function renderThemeChips() {
  const row = document.getElementById('theme-chips-row');
  if (!row) return;
  row.innerHTML = CURATED_THEMES.map(t => `
    <button type="button" class="theme-chip" data-theme-id="${t.id}" data-theme-name="${escAttr(t.name)}">
      ${ICONS[t.icon] || ''} ${escAttr(t.name)}
    </button>
  `).join('');
  row.querySelectorAll('.theme-chip').forEach(chip => {
    chip.addEventListener('click', () => openThemeSheet(chip.dataset.themeId, chip.dataset.themeName));
  });
}

// Feuille thème : réutilise la même modale que les listes prédéfinies/sagas
// (#curated-list-sheet), mais un rendu plus simple — pas de barre de
// complétion ni de bouton d'ajout en masse, juste une grille à parcourir
// (esprit "suggestion", pas "collection à cocher"). L'ajout à la watchlist
// se fait film par film en ouvrant sa fiche, comme partout ailleurs.
async function openThemeSheet(themeId, themeName) {
  lastFocusedBeforeModal = document.activeElement;
  clsContentEl.innerHTML = `<div class="mds-header"><div class="mds-title">Chargement…</div></div>`;
  clsEl.classList.add('open');
  clsCloseBtn.focus();

  const films = await fetchThemeList(themeId);
  clsContentEl.innerHTML = `
    <div class="mds-header" style="animation-delay:0s">
      <div class="mds-header-info">
        <div class="mds-title" id="cls-title">${escAttr(themeName)}</div>
        <div class="mds-meta">${films.length} film${films.length > 1 ? 's' : ''}</div>
      </div>
    </div>
    <div class="mds-section pds-filmography" style="animation-delay:.05s">
      ${films.map(f => `
        <div class="pds-film-item" data-movie-id="${f.id}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(f.title)}">
          ${f.poster_path
            ? `<img class="pds-film-poster" src="${tmdbImage(f.poster_path, 'w185')}" alt="" loading="lazy">`
            : `<div class="pds-film-poster pds-film-poster-ph">${ICONS.clapper}</div>`}
          <div class="pds-film-title">${escAttr(f.title)}</div>
          <div class="pds-film-year">${f.year || ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

renderThemeChips();

// ═══════════════════════════════════════════
//  MODULE ANALYSE DE FILM
// ═══════════════════════════════════════════
// Un onglet "Analyse" sur la fiche de chaque film, à côté de la note (voir
// guide-module-analyse-film.pdf). Stockage local comme tout le reste de
// Ludex (historique, watchlists, duels) — pas de vraie base de données
// serveur, décidé ensemble : Analyse et ProgressionUtilisateur sont des
// données personnelles comme les autres, pas une raison de sortir du
// mécanisme existant. La synchronisation cloud n'inclut pas encore ces
// clés (à ajouter dans un second temps, voir 10-cloud-sync.js).
//
// Phase 1+2 du document uniquement pour cette livraison : la boucle
// complète (écrire → recevoir un retour → garder une trace) fonctionne de
// bout en bout. Le système de connaissances (glossaire, notions à
// débloquer — Phase 5 du document) est volontairement repoussé plus tard,
// une fois ce socle vécu un moment.

const FILM_ANALYSES_KEY = 'lbx_analyses';

function loadAnalyses() {
  try { return JSON.parse(localStorage.getItem(FILM_ANALYSES_KEY)) || []; } catch { return []; }
}
function saveAnalyses(analyses) {
  localStorage.setItem(FILM_ANALYSES_KEY, JSON.stringify(analyses));
}
function getAnalysesForFilm(filmId) {
  return loadAnalyses()
    .filter(a => String(a.filmId) === String(filmId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function buildAnalysisSectionHtml(movieId, movieTitle) {
  const past = getAnalysesForFilm(movieId);
  return `
    <div class="mds-section-title">Analyse</div>
    <div class="analysis-form">
      <label class="analysis-label" for="analysis-technique">Analyse technique</label>
      <textarea class="analysis-textarea" id="analysis-technique" rows="3" placeholder="Cadrage, lumière, montage, son, mise en scène..."></textarea>
      <label class="analysis-label" for="analysis-theme">Analyse thématique</label>
      <textarea class="analysis-textarea" id="analysis-theme" rows="3" placeholder="Sujet apparent vs sujet réel, comment la forme sert le fond..."></textarea>
      <button type="button" class="icon-btn analysis-submit-btn" id="analysis-submit-btn">
        <span class="analysis-submit-spinner" id="analysis-submit-spinner" style="display:none;" aria-hidden="true">${ICONS.refresh}</span>
        <span id="analysis-submit-label">Envoyer pour analyse</span>
      </button>
      <div class="analysis-error" id="analysis-error" style="display:none;" role="alert">
        <span class="analysis-error-icon" aria-hidden="true">⚠</span>
        <span id="analysis-error-text"></span>
      </div>
    </div>
    <div class="analysis-history" id="analysis-history">${past.map(renderAnalysisEntry).join('')}</div>
  `;
}

function renderAnalysisEntry(a) {
  const dateLabel = new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const r = a.retour;
  return `
    <div class="analysis-entry">
      <div class="analysis-entry-date">${escAttr(dateLabel)}</div>
      <p class="analysis-synthese">${escAttr(r.synthese || '')}</p>
      ${renderAnalysisGroup('Points forts', r.pointsForts)}
      ${renderAnalysisGroup('Angles morts', r.anglesMorts)}
      ${renderAnalysisGroup('Questions pour approfondir', r.questions)}
    </div>
  `;
}

function renderAnalysisGroup(label, items) {
  if (!items || items.length === 0) return '';
  return `
    <div class="analysis-retour-group">
      <div class="analysis-retour-label">${escAttr(label)}</div>
      <ul>${items.map(i => `<li>${escAttr(i)}</li>`).join('')}</ul>
    </div>
  `;
}

function wireAnalysisSection(movieId, movieTitle) {
  const submitBtn = document.getElementById('analysis-submit-btn');
  if (!submitBtn) return; // section pas presente (fiche fermee entre temps, etc.)
  const submitSpinner = document.getElementById('analysis-submit-spinner');
  const submitLabel = document.getElementById('analysis-submit-label');

  submitBtn.addEventListener('click', async () => {
    const techniqueEl = document.getElementById('analysis-technique');
    const themeEl = document.getElementById('analysis-theme');
    const errorEl = document.getElementById('analysis-error');
    const errorTextEl = document.getElementById('analysis-error-text');
    const technique = techniqueEl.value.trim();
    const theme = themeEl.value.trim();
    errorEl.style.display = 'none';

    if (!technique && !theme) {
      errorTextEl.textContent = 'Écris au moins un des deux champs avant d\'envoyer.';
      errorEl.style.display = 'flex';
      return;
    }

    submitBtn.disabled = true;
    submitSpinner.style.display = 'inline-flex';
    submitLabel.textContent = 'Analyse en cours…';

    try {
      const res = await fetch('/api/analyse-film', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: movieTitle, technique, theme }),
      });
      const data = await readApiJson(res); // lève avec le message precis du serveur si !res.ok

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        filmId: movieId,
        filmTitle: movieTitle,
        date: new Date().toISOString(),
        texteTechnique: technique,
        texteThematique: theme,
        retour: data.retour,
      };
      const all = loadAnalyses();
      all.push(entry);
      saveAnalyses(all);

      // Nouvel élément DOM créé à part (pas une concaténation innerHTML) :
      // l'animation d'entrée ne rejoue que sur lui, pas sur les entrées déjà
      // présentes qui n'ont pas à retrembler à chaque nouvel envoi.
      const historyEl = document.getElementById('analysis-history');
      const wrapper = document.createElement('div');
      wrapper.innerHTML = renderAnalysisEntry(entry);
      historyEl.prepend(wrapper.firstElementChild);

      techniqueEl.value = '';
      themeEl.value = '';
      showToast('Analyse enregistrée.');
    } catch (err) {
      // describeApiFailure (déjà utilisée ailleurs dans l'app) : affiche le
      // message précis du serveur quand il y en a un (clé manquante, quota
      // épuisé...), plutôt qu'un "vérifie ta connexion" générique qui serait
      // faux dans la plupart de ces cas.
      errorTextEl.textContent = describeApiFailure(err);
      errorEl.style.display = 'flex';
    } finally {
      submitBtn.disabled = false;
      submitSpinner.style.display = 'none';
      submitLabel.textContent = 'Envoyer pour analyse';
    }
  });
}

// ═══════════════════════════════════════════
//  SÉRIES — Phase 1 : recherche + sélection de saison
// ═══════════════════════════════════════════
// Bascule Film/Série dans l'onglet Noter, recherche d'une série (TMDb
// /search/tv), puis choix d'une saison (TMDb /tv/{id} pour la liste des
// saisons). S'arrête volontairement là : le suivi épisode par épisode et
// la notation de saison sont les Phases 2 et 3, pas encore construites —
// on avance point par point plutôt que tout d'un coup, comme convenu.
//
// Stockage à venir en Phase 2+ (lbx_tv_shows, une entrée par SÉRIE avec
// ses saisons imbriquées) — rien n'est encore sauvegardé à ce stade,
// cette phase se limite à la sélection.

// currentMediaType est déclarée dans 03-foundation.js (pas ici) — voir le
// commentaire à cet endroit pour la raison exacte (calculateScore() y
// accède dès l'initialisation, avant que ce fichier-ci ne soit atteint).
let selectedShow = null; // { id, name, poster_path } une fois une serie choisie

function setMediaType(type) {
  currentMediaType = type;
  document.getElementById('tab-media-movie').classList.toggle('active', type === 'movie');
  document.getElementById('tab-media-tv').classList.toggle('active', type === 'tv');
  const movieFields = document.getElementById('movie-only-fields');
  const tvFields = document.getElementById('tv-only-fields');
  if (type === 'movie') fadeSwitchDisplay(tvFields, movieFields); else fadeSwitchDisplay(movieFields, tvFields);
  document.getElementById('film-card-title').textContent = type === 'movie' ? 'Film' : 'Série';
  applyCriteriaLabelsForMediaType(type);
  // Pour un film, la carte Notation est toujours visible (on peut ajuster
  // les curseurs avant même d'avoir cherché un titre). Pour une série, il
  // faut d'abord qu'une saison soit sélectionnée pour que noter ait un
  // sens — selectSeason() la révèle elle-même le moment venu.
  document.getElementById('notation-card').style.display = type === 'movie' || selectedSeasonNumber != null ? '' : 'none';
  if (type === 'tv' && typeof renderTvContinueList === 'function') renderTvContinueList();
}

// Les deux critères reformulés pour une saison — les 5 autres (scenario,
// realisation, acteurs, ambiance, affect) restent identiques au film,
// donc pas dans cette table.
const TV_CRITERIA_LABELS = { photo: 'Qualité du final', rythme: 'Rythme & Cohérence de la saison' };
const _originalCriteriaLabels = {};

function applyCriteriaLabelsForMediaType(type) {
  Object.keys(TV_CRITERIA_LABELS).forEach(c => {
    const labelEl = document.getElementById(`crit-label-${c}`);
    if (!labelEl || !labelEl.firstChild) return;
    // Le badge de pondération (<span class="weight-badge">) est un enfant
    // du label — on ne modifie QUE le nœud de texte qui le précède, pour
    // ne jamais l'écraser (même classe de bug déjà rencontrée ailleurs
    // dans ce projet : cibler le bon élément, pas tout le conteneur).
    if (!(c in _originalCriteriaLabels)) _originalCriteriaLabels[c] = labelEl.firstChild.nodeValue;
    const newText = (type === 'tv' ? TV_CRITERIA_LABELS[c] : _originalCriteriaLabels[c].trim()) + ' ';
    labelEl.firstChild.nodeValue = newText;
    const trimmed = newText.trim();
    document.querySelectorAll(`.criterion-step-btn[data-target="${c}"]`).forEach(btn => {
      const sign = btn.dataset.step.startsWith('-') ? 'Diminuer' : 'Augmenter';
      btn.setAttribute('aria-label', `${sign} ${trimmed} de 0,5`);
    });
  });
}

const tvSearchEl = document.getElementById('tv-search');
const tvSuggestEl = document.getElementById('tv-suggestions');
const tvSearchStatus = document.getElementById('tv-search-status');
const tvSearchClearBtn = document.getElementById('tv-search-clear-btn');
let tvSearchTimer;

tvSearchEl.addEventListener('input', () => {
  clearTimeout(tvSearchTimer);
  tvSearchClearBtn.style.display = tvSearchEl.value ? 'flex' : 'none';
  const q = tvSearchEl.value.trim();
  if (q.length < 2) {
    tvSuggestEl.style.display = 'none';
    tvSearchStatus.style.display = 'none';
    return;
  }
  tvSearchStatus.style.display = 'none';
  tvSuggestEl.style.display = 'block';
  tvSuggestEl.innerHTML = `
    <div class="skeleton-item"><div class="skeleton-poster skeleton-bg"></div><div style="flex:1"><div class="skeleton-text long skeleton-bg"></div><div class="skeleton-text short skeleton-bg"></div></div></div>
    <div class="skeleton-item"><div class="skeleton-poster skeleton-bg"></div><div style="flex:1"><div class="skeleton-text long skeleton-bg"></div><div class="skeleton-text short skeleton-bg"></div></div></div>
  `;
  tvSearchTimer = setTimeout(() => fetchTvSuggestions(q), 280);
});
tvSearchClearBtn.addEventListener('click', () => {
  tvSearchEl.value = '';
  tvSearchEl.dispatchEvent(new Event('input'));
  tvSearchEl.focus();
});

async function fetchTvSuggestions(q) {
  try {
    const res = await fetch(`/api/search?tvQuery=${encodeURIComponent(q)}`);
    const data = await readApiJson(res);
    const results = (data.results || []).filter(s => s.poster_path).slice(0, 8);
    if (results.length === 0) {
      tvSuggestEl.style.display = 'none';
      tvSearchStatus.textContent = 'Aucune série trouvée.';
      tvSearchStatus.style.display = 'block';
      return;
    }
    tvSuggestEl.innerHTML = results.map(s => `
      <div class="suggestion-item" data-show-id="${s.id}" data-show-name="${escAttr(s.name)}" data-show-poster="${escAttr(s.poster_path || '')}">
        <img class="suggestion-poster" src="${tmdbImage(s.poster_path, 'w92')}" alt="" loading="lazy">
        <div class="suggestion-info">
          <div class="suggestion-title">${escAttr(s.name)}</div>
          <div class="suggestion-year">${s.first_air_date ? s.first_air_date.slice(0, 4) : ''}</div>
        </div>
      </div>
    `).join('');
    tvSuggestEl.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => selectShow({
        id: item.dataset.showId, name: item.dataset.showName, poster_path: item.dataset.showPoster,
      }));
    });
  } catch (err) {
    tvSuggestEl.style.display = 'none';
    tvSearchStatus.textContent = describeApiFailure(err);
    tvSearchStatus.style.display = 'block';
  }
}

async function selectShow(show) {
  selectedShow = show;
  tvSuggestEl.style.display = 'none';
  tvSearchEl.value = show.name;
  document.getElementById('tv-season-strip').style.display = 'none';
  document.getElementById('tv-season-picker').style.display = 'none';
  openTvDetailSheet(show.id);
}

function selectSeason(season) {
  const stripEl = document.getElementById('tv-season-strip');
  stripEl.style.display = 'flex';
  const posterImg = document.getElementById('tv-strip-poster');
  posterImg.src = tmdbImage(season.poster, 'w200');
  document.getElementById('tv-strip-title').textContent = `${selectedShow.name} — ${season.name}`;
  document.getElementById('tv-strip-genre').textContent = `${season.episodeCount} épisode${season.episodeCount > 1 ? 's' : ''}`;
  selectedSeasonNumber = Number(season.number);
  selectedSeasonName = season.name;
  selectedSeasonEpisodeCount = Number(season.episodeCount);
  document.getElementById('tv-season-complete-banner').style.display = 'none';
  refreshShowAverageDisplay();

  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
  const localSeason = showEntry?.seasons?.[String(selectedSeasonNumber)];
  const episodesComplete = localSeason && localSeason.totalEpisodes > 0 && localSeason.watchedEpisodes.length >= localSeason.totalEpisodes;
  const isComplete = localSeason && (episodesComplete || localSeason.rating);

  const startPromptEl = document.getElementById('tv-season-start-prompt');
  const inProgressEl = document.getElementById('tv-season-in-progress-msg');
  const notationEl = document.getElementById('notation-card');

  if (isComplete) {
    // Saison terminée : plus rien à cocher, on passe directement à la note
    // — pré-remplie si déjà notée, exactement le même geste que rouvrir
    // depuis l'Historique.
    startPromptEl.style.display = 'none';
    inProgressEl.style.display = 'none';
    notationEl.style.display = '';
    loadSeasonRatingIntoForm();
  } else if (localSeason) {
    // Déjà entamée (via le widget En cours) mais pas finie : pas de second
    // suivi ici, juste un rappel de où continuer plutôt qu'un doublon.
    notationEl.style.display = 'none';
    startPromptEl.style.display = 'none';
    inProgressEl.style.display = 'flex';
    document.getElementById('tv-in-progress-text').textContent =
      `${localSeason.watchedEpisodes.length}/${localSeason.totalEpisodes} épisodes déjà vus — continue depuis le widget "En cours" en haut de cet onglet.`;
  } else {
    // Jamais touchée : propose de commencer plutôt que d'ouvrir directement
    // un suivi épisode par épisode ici.
    notationEl.style.display = 'none';
    inProgressEl.style.display = 'none';
    startPromptEl.style.display = 'flex';
    document.getElementById('tv-start-prompt-text').textContent = `Commencer "${selectedShow.name} — ${season.name}" ?`;
  }
}

function startTrackingSeason() {
  const shows = loadTvShows();
  const showEntry = getOrCreateTvShow(shows);
  const seasonKey = String(selectedSeasonNumber);
  if (!showEntry.seasons[seasonKey]) {
    showEntry.seasons[seasonKey] = { seasonName: selectedSeasonName, watchedEpisodes: [], totalEpisodes: selectedSeasonEpisodeCount };
  }
  saveTvShows(shows);
  document.getElementById('tv-season-start-prompt').style.display = 'none';
  document.getElementById('tv-season-in-progress-msg').style.display = 'flex';
  document.getElementById('tv-in-progress-text').textContent =
    `0/${selectedSeasonEpisodeCount} épisodes vus — continue depuis le widget "En cours" en haut de cet onglet.`;
  if (typeof renderTvContinueList === 'function') renderTvContinueList();
  showToast(`"${selectedShow.name} — ${selectedSeasonName}" ajoutée à En cours`);
}
document.getElementById('tv-start-season-btn').addEventListener('click', startTrackingSeason);

// ═══════════════════════════════════════════
//  SÉRIES — Phase 2 : suivi épisode par épisode
// ═══════════════════════════════════════════
// Stockage : une entrée par SÉRIE (lbx_tv_shows), avec ses saisons
// imbriquées — chaque saison garde la liste des épisodes vus et son
// total. Aucune note stockée ici (Phase 3) : la note de saison viendra
// plus tard, la note globale de série ne sera jamais stockée du tout,
// toujours recalculée à la volée à partir des saisons notées.
const TV_SHOWS_KEY = 'lbx_tv_shows';
let selectedSeasonNumber = null;
let selectedSeasonName = null;
let selectedSeasonEpisodeCount = 0;

function loadTvShows() {
  try { return JSON.parse(localStorage.getItem(TV_SHOWS_KEY)) || []; } catch { return []; }
}
function saveTvShows(shows) {
  localStorage.setItem(TV_SHOWS_KEY, JSON.stringify(shows));
}
function getOrCreateTvShow(shows) {
  let entry = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
  if (!entry) {
    entry = { tmdbTvId: selectedShow.id, title: selectedShow.name, poster_path: selectedShow.poster_path, genre: selectedShow.genres || '', seasons: {} };
    shows.push(entry);
  }
  return entry;
}
function getOrCreateTvSeason(showEntry, seasonName, totalEpisodes) {
  const key = String(selectedSeasonNumber);
  if (!showEntry.seasons[key]) {
    showEntry.seasons[key] = { seasonName, watchedEpisodes: [], totalEpisodes };
  }
  // Le total peut differer de ce qu'on avait stocke si TMDb ajoute un
  // episode entre deux visites (saison en cours de diffusion) — on le
  // reajuste plutot que de garder une valeur perimee.
  showEntry.seasons[key].totalEpisodes = totalEpisodes;
  return showEntry.seasons[key];
}

function loadSeasonRatingIntoForm() {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
  const seasonEntry = showEntry && showEntry.seasons[String(selectedSeasonNumber)];
  const rating = seasonEntry && seasonEntry.rating;

  if (rating && rating.mode === 'quick' && rating.values?.quick !== undefined) {
    setMode('quick');
    quickRating = parseFloat(rating.values.quick);
    const radioEl = document.getElementById('s' + (quickRating * 2));
    if (radioEl) radioEl.checked = true;
  } else {
    setMode('detail');
    CRITERIA.forEach(c => {
      document.getElementById(c).value = rating && rating.values && rating.values[c] !== undefined ? rating.values[c] : 5;
    });
  }
  document.getElementById('review-text').value = rating ? (rating.review || '') : '';
  calculateScore();
}

// Toutes les notes de saison, toutes séries confondues, à plat — réutilisé
// pour le radar (moyennes par critère, même fonction pure que les films)
// et pour fusionner l'activité films+séries dans le graphique 6 mois (voir
// 06-history.js) : la heatmap ET ce graphique restent uniques, décidé
// ensemble, contrairement au reste des statistiques qui bascule.
function getAllTvSeasonRatings() {
  return loadTvShows().flatMap(show =>
    Object.values(show.seasons || {}).filter(s => s.rating).map(s => s.rating)
  );
}

function refreshShowAverageDisplay() {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(selectedShow.id));
  const avg = computeShowAverageScore(showEntry);
  const el = document.getElementById('tv-show-average');
  if (avg == null) {
    el.style.display = 'none';
    return;
  }
  const ratedCount = Object.values(showEntry.seasons).filter(s => s.rating).length;
  el.textContent = `Note globale : ${avg.toFixed(1)}/10 (moyenne de ${ratedCount} saison${ratedCount > 1 ? 's' : ''} notée${ratedCount > 1 ? 's' : ''})`;
  el.style.display = 'block';
}

function saveTvSeasonRating() {
  if (!selectedShow || selectedSeasonNumber == null) {
    showToast('Sélectionne une série et une saison avant de noter.');
    return;
  }
  const score = calculateScore();
  const shows = loadTvShows();
  const showEntry = getOrCreateTvShow(shows);
  const seasonKey = String(selectedSeasonNumber);
  // La saison existe déjà forcément (créée dès qu'on "Commence" à la suivre,
  // voir startTrackingSeason) — on y ajoute juste la note, sans repasser par
  // getOrCreateTvSeason pour ne pas risquer d'écraser totalEpisodes avec
  // une valeur périmée.
  if (!showEntry.seasons[seasonKey]) {
    showEntry.seasons[seasonKey] = { seasonName: selectedSeasonName, watchedEpisodes: [], totalEpisodes: selectedSeasonEpisodeCount };
  }
  showEntry.seasons[seasonKey].rating = {
    mode: currentMode,
    values: currentMode === 'detail'
      ? CRITERIA.reduce((acc, c) => { acc[c] = document.getElementById(c).value; return acc; }, {})
      : { quick: quickRating },
    score: score.toFixed(1),
    stars: document.getElementById('stars-display').textContent,
    review: document.getElementById('review-text').value.trim(),
    date: new Date().toISOString(),
  };
  saveTvShows(shows);
  document.getElementById('tv-season-complete-banner').style.display = 'none';
  showToast(`"${selectedShow.name} — ${selectedSeasonName}" notée`);
  if (typeof playSaveConfirmation === 'function') playSaveConfirmation();
  refreshShowAverageDisplay();
  if (typeof statsDirty !== 'undefined') statsDirty = true;
}

function maybeShowSeasonCompleteBanner(showTmdbId, seasonKey, seasonEntry) {
  if (seasonEntry.watchedEpisodes.length < seasonEntry.totalEpisodes) return;
  const banner = document.getElementById('tv-season-complete-banner');
  banner.dataset.showId = showTmdbId;
  banner.dataset.seasonKey = seasonKey;
  banner.style.display = 'flex';
}

document.getElementById('tv-season-complete-dismiss').addEventListener('click', () => {
  document.getElementById('tv-season-complete-banner').style.display = 'none';
});
document.getElementById('tv-rate-season-btn').addEventListener('click', () => {
  const banner = document.getElementById('tv-season-complete-banner');
  const showId = banner.dataset.showId;
  const seasonKey = banner.dataset.seasonKey;
  banner.style.display = 'none';

  const show = loadTvShows().find(s => String(s.tmdbTvId) === String(showId));
  if (show) {
    switchMobileNav('rating');
    setMediaType('tv');
    selectedShow = { id: show.tmdbTvId, name: show.title, poster_path: show.poster_path };
    document.getElementById('tv-search').value = show.title;
    document.getElementById('tv-season-picker').style.display = 'none';
    const seasonData = show.seasons[seasonKey];
    selectedSeasonNumber = Number(seasonKey);
    selectedSeasonName = seasonData.seasonName;
    document.getElementById('tv-season-strip').style.display = 'flex';
    document.getElementById('tv-strip-poster').src = tmdbImage(show.poster_path, 'w200');
    document.getElementById('tv-strip-title').textContent = `${show.title} — ${seasonData.seasonName}`;
    document.getElementById('tv-strip-genre').textContent = `${seasonData.totalEpisodes} épisodes`;
    document.getElementById('tv-season-start-prompt').style.display = 'none';
    document.getElementById('tv-season-in-progress-msg').style.display = 'none';
    refreshShowAverageDisplay();
    loadSeasonRatingIntoForm();
  }
  const card = document.getElementById('notation-card');
  card.style.display = '';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ═══════════════════════════════════════════
//  SÉRIES — Phase 4 : Historique scindé Films/Séries
// ═══════════════════════════════════════════
// Bascule façon Détaillé/Rapide (pas un simple filtre dans une liste
// mélangée) : une carte de saison et une carte de film n'ont pas le même
// contenu à afficher, les mélanger aurait rendu chaque carte confuse.
// Comptage par SÉRIE, pas par saison — noter 3 saisons de la même série
// compte pour 1, pas 3, comme convenu.

function switchHistoryMediaFilter(type) {
  historyMediaFilter = type;
  document.getElementById('hist-tab-movie').classList.toggle('active', type === 'movie');
  document.getElementById('hist-tab-tv').classList.toggle('active', type === 'tv');
  const movieList = document.getElementById('history-list');
  const tvList = document.getElementById('tv-history-list');
  if (type === 'movie') fadeSwitchDisplay(tvList, movieList); else fadeSwitchDisplay(movieList, tvList);
  renderActiveHistoryView();
  if (type === 'tv') retrofitMissingTvGenres();
}

// Récupère silencieusement le genre des séries suivies avant l'ajout de ce
// filtre (donc sans genre stocké) — une seule fois par série, en arrière-
// plan, sans bloquer l'affichage déjà rendu avec les genres déjà connus.
async function retrofitMissingTvGenres() {
  const missing = loadTvShows().filter(s => !s.genre);
  if (missing.length === 0) return;
  for (const show of missing) {
    try {
      const data = await fetch(`/api/search?tvId=${show.tmdbTvId}`).then(readApiJson);
      const genreStr = (data.genres || []).map(g => g.name).join(', ');
      const current = loadTvShows();
      const entry = current.find(s => String(s.tmdbTvId) === String(show.tmdbTvId));
      if (entry && genreStr) { entry.genre = genreStr; saveTvShows(current); }
    } catch { /* silencieux — retentera au prochain passage sur l'onglet */ }
  }
  if (historyMediaFilter === 'tv') renderTvHistory();
}

function getSortedTvShows() {
  const shows = loadTvShows();
  let s = shows;
  if (historySearchQuery) {
    s = s.filter(sh => sh.title && sh.title.toLowerCase().includes(historySearchQuery));
  }
  if (activeScoreFilter !== null) {
    s = s.filter(sh => isScoreInActiveRange(computeShowAverageScore(sh)));
  }
  if (activeGenre) {
    s = s.filter(sh => sh.genre && sh.genre.split(',').map(g => g.trim()).includes(activeGenre));
  }
  if (activeLikedFilter) {
    s = s.filter(sh => sh.liked);
  }
  const avg = (sh) => computeShowAverageScore(sh);
  if (sortOrder === 'score-desc') return [...s].sort((a, b) => (avg(b) ?? -1) - (avg(a) ?? -1));
  if (sortOrder === 'score-asc')  return [...s].sort((a, b) => (avg(a) ?? 11) - (avg(b) ?? 11));
  if (sortOrder === 'title')      return [...s].sort((a, b) => a.title.localeCompare(b.title));
  // "Récents" : dernière saison mise à jour (notée ou suivie), la plus
  // récente d'abord — même esprit que le tri "Récents" des films.
  const lastUpdate = (sh) => Object.values(sh.seasons || {}).reduce((max, se) => {
    const d = se.rating?.date || '';
    return d > max ? d : max;
  }, '');
  return [...s].sort((a, b) => lastUpdate(b).localeCompare(lastUpdate(a)));
}

function renderTvHistory() {
  const allShows = loadTvShows();
  const shows = getSortedTvShows();
  const container = document.getElementById('tv-history-list');
  renderGenreChips(allShows, renderTvHistory);
  document.getElementById('filter-row').style.display = allShows.length === 0 ? 'none' : '';

  const badge = document.getElementById('hist-count-badge');
  const filmCount = loadHistory().length;
  const filmFragment = `${filmCount} film${filmCount > 1 ? 's' : ''}`;
  if (historySearchQuery || activeScoreFilter || activeLikedFilter) {
    badge.textContent = `${filmFragment} · ${shows.length} / ${allShows.length} série${allShows.length > 1 ? 's' : ''}`;
    badge.style.color = 'var(--orange)';
  } else {
    badge.textContent = `${filmFragment} · ${allShows.length} série${allShows.length > 1 ? 's' : ''}`;
    badge.style.color = '';
  }

  if (allShows.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.clapper}</div>Aucune série suivie pour l'instant — cherche-en une dans l'onglet Noter.</div>`;
    return;
  }
  if (shows.length === 0) {
    container.innerHTML = `<div class="empty-state">Aucun résultat pour ce filtre.</div>`;
    return;
  }

  container.innerHTML = `<div class="hist-grid">${shows.map(renderTvShowCard).join('')}</div>`;

  container.querySelectorAll('.hist-grid-card[data-show-id]').forEach((cardEl) => {
    const show = shows.find(s => String(s.tmdbTvId) === cardEl.dataset.showId);
    applyPosterAccent(tmdbImage(show?.poster_path, 'w154'), cardEl);
  });

  container.querySelectorAll('.tv-show-card-open-btn').forEach(btn => {
    btn.addEventListener('click', () => openTvDetailSheet(btn.dataset.showId));
  });

  container.querySelectorAll('.tv-show-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.showId;
      const show = loadTvShows().find(s => String(s.tmdbTvId) === String(id));
      if (!show) return;
      openModal(
        'Retirer cette série',
        `"${show.title}" et toutes ses saisons suivies/notées seront définitivement retirées. Continuer ?`,
        () => {
          const remaining = loadTvShows().filter(s => String(s.tmdbTvId) !== String(id));
          saveTvShows(remaining);
          if (typeof recordTombstone === 'function') recordTombstone('lbx_tv_show_tombstones', String(id));
          renderTvHistory();
          showToast(`"${show.title}" retirée`);
          if (typeof statsDirty !== 'undefined') statsDirty = true;
        },
        true
      );
    });
  });
}

function deleteTvSeasonWithConfirm(showId, seasonKey) {
  const show = loadTvShows().find(s => String(s.tmdbTvId) === String(showId));
  if (!show) return;
  const seasonName = show.seasons[seasonKey]?.seasonName || `Saison ${seasonKey}`;
  const isLastSeason = Object.keys(show.seasons).length === 1;
  openModal(
    'Retirer cette saison',
    isLastSeason
      ? `"${seasonName}" est la dernière saison suivie de "${show.title}" — la retirer retire toute la série. Continuer ?`
      : `"${seasonName}" de "${show.title}" sera définitivement retirée. Continuer ?`,
    () => {
      const shows = loadTvShows();
      const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
      if (!showEntry) return;
      delete showEntry.seasons[seasonKey];
      if (typeof recordTombstone === 'function') recordTombstone('lbx_tv_season_tombstones', `${showId}:${seasonKey}`);
      const remaining = Object.keys(showEntry.seasons).length === 0
        ? shows.filter(s => String(s.tmdbTvId) !== String(showId))
        : shows;
      if (Object.keys(showEntry.seasons).length === 0 && typeof recordTombstone === 'function') {
        recordTombstone('lbx_tv_show_tombstones', String(showId));
      }
      saveTvShows(remaining);
      renderTvHistory();
      // Ludex 2.0 : ce bouton est désormais accessible DEPUIS la fiche
      // détail (voir 19-tv-detail.js) — la rouvrir sur elle-même après
      // suppression pour que sa liste de saisons reflète le changement,
      // pas seulement la grille en arrière-plan. tdsCurrentData n'existe
      // que si ce fichier est chargé (toujours vrai ici) et qu'une fiche
      // série est actuellement ouverte.
      if (typeof tdsCurrentData !== 'undefined' && tdsCurrentData?.id && remaining.find(s => String(s.tmdbTvId) === String(showId))) {
        openTvDetailSheet(showId);
      } else if (typeof closeTvDetailSheet === 'function' && typeof tdsCurrentData !== 'undefined' && tdsCurrentData?.id === Number(showId)) {
        closeTvDetailSheet(); // la série entière vient de disparaître avec sa dernière saison
      }
      showToast(`"${seasonName}" retirée`);
      if (typeof statsDirty !== 'undefined') statsDirty = true;
    },
    true
  );
}

// Ludex 2.0 : la carte devient une cellule de grille (poster + badges) —
// la liste extensible par saison (Voir les X saisons, avec rouvrir/
// supprimer) a migré dans la fiche détail (voir buildSeasonProgressionSection,
// 19-tv-detail.js), qui affichait déjà la progression par saison mais sans
// ces deux actions avant ce changement. Un tap ouvre directement la fiche —
// plus de repli "tout gérer depuis la grille".
function renderTvShowCard(show) {
  const avg = computeShowAverageScore(show);
  const seasons = Object.entries(show.seasons || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
  const seasonsWithProgress = seasons.filter(([, s]) => s.totalEpisodes > 0);
  const totalEpisodes = seasonsWithProgress.reduce((sum, [, s]) => sum + s.totalEpisodes, 0);
  const watchedEpisodes = seasonsWithProgress.reduce((sum, [, s]) => sum + s.watchedEpisodes.length, 0);
  const progressPct = totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0;
  const posterUrl = tmdbImage(show.poster_path, 'w154');

  const scoreColor = avg == null ? 'var(--text-mid)' : avg >= 7.5 ? 'var(--green)' : avg >= 5.0 ? 'var(--gold)' : 'var(--red)';
  const isHighScore = avg != null && avg >= 8.5;
  const isFeatured = !!show.liked || isHighScore;

  const imgHtml = posterUrl
    ? `<img class="hist-grid-poster" src="${posterUrl}" alt="Affiche de ${escAttr(show.title)}" loading="lazy" decoding="async">`
    : `<div class="hist-grid-poster-ph">${ICONS.tv || ICONS.clapper}</div>`;

  return `
    <div class="hist-item hist-grid-card${isFeatured ? ' hist-grid-card-featured' : ''}" data-show-id="${show.tmdbTvId}">
      <button type="button" class="tv-show-card-open-btn hist-item-open" data-show-id="${show.tmdbTvId}" aria-label="Voir la fiche de ${escAttr(show.title)}">
        ${imgHtml}
      </button>
      <div class="hist-grid-badge" style="color:${scoreColor}">${avg != null ? avg.toFixed(1) : '—'}</div>
      ${isFeatured ? `<div class="hist-grid-featured-badge">${show.liked ? `${ICONS.heart} Coup de cœur` : `★ ${avg.toFixed(1)}`}</div>` : ''}
      ${totalEpisodes > 0 ? `
        <div class="hist-grid-progress" title="${watchedEpisodes}/${totalEpisodes} épisodes vus" aria-hidden="true">
          <div class="hist-grid-progress-fill" style="width:${progressPct}%"></div>
        </div>
      ` : ''}
      <div class="hist-actions">
        <button type="button" class="hist-action-btn del tv-show-delete-btn" data-show-id="${show.tmdbTvId}" title="Retirer" aria-label="Retirer ${escAttr(show.title)}">${ICONS.trash}</button>
      </div>
    </div>
  `;
}

// Glissement sur les lignes de saison — mêmes paramètres physiques déjà
// éprouvés que l'historique films (voir initHistoryGestures), mais
// contrôleur séparé plutôt qu'une généralisation complète : le système
// film est ancien, très affiné (de nombreux bugs corrigés un par un au
// fil de plusieurs sessions), le réécrire pour le rendre générique aurait
// un vrai risque de régression sur un comportement déjà fiable et testé.
// Version allégée ici : pas de menu d'appui long (pas d'équivalent série
// pour l'instant), pas de survie à un nouveau rendu complexe (un
// re-rendu annule simplement un geste armé, acceptable sur cette liste
// moins sollicitée que l'historique principal).
function initTvSeasonSwipeGestures(container) {
  const MOVE_CANCEL_PX = 12;
  const SWIPE_THRESHOLD = 80;
  const MAX_DRAG = 130;

  let startX = 0, startY = 0;
  let pressedItem = null, pressedContent = null;
  let wasSwipe = false;
  let swipeMode = null;
  let dx = 0;
  let armedItem = null, armedDirection = null;

  function cancelArmed() {
    if (!armedItem) return;
    const content = armedItem.querySelector('.tv-season-row-content');
    if (content) { content.style.transition = 'transform var(--dur-base) var(--ease-out)'; content.style.transform = ''; }
    armedItem.classList.remove('hist-swipe-armed-left', 'hist-swipe-armed-right', 'hist-swipe-left', 'hist-swipe-right');
    armedItem = null;
    armedDirection = null;
  }

  function confirmArmed() {
    if (!armedItem) return;
    const showId = armedItem.dataset.showId;
    const seasonKey = armedItem.dataset.seasonKey;
    const dir = armedDirection;
    armedItem = null;
    armedDirection = null;
    if (dir === 'left') {
      deleteTvSeasonWithConfirm(showId, seasonKey);
    } else {
      reopenTvSeason(showId, seasonKey);
    }
  }

  function resetGesture() {
    if (pressedItem) pressedItem.classList.remove('hist-dragging');
    pressedItem = null;
    pressedContent = null;
    swipeMode = null;
    dx = 0;
  }

  function cancelGestureFully() {
    if (pressedItem) {
      if (pressedContent) {
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = '';
      }
      pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
    }
    resetGesture();
  }

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.tv-season-row');
    if (!item || e.target.closest('.tv-season-reopen-btn') || e.target.closest('.tv-season-delete-btn')) { resetGesture(); return; }
    e.stopPropagation();
    pressedItem = item;
    pressedContent = item.querySelector('.tv-season-row-content');
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swipeMode = null;
    dx = 0;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!pressedItem) return;
    e.stopPropagation();
    const rawDx = e.touches[0].clientX - startX;
    const rawDy = e.touches[0].clientY - startY;
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll';
        if (swipeMode === 'swipe') {
          if (armedItem === pressedItem) cancelArmed();
          pressedItem.classList.add('hist-dragging');
        }
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;
    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
    pressedItem.classList.toggle('hist-swipe-right', dx > 10);
  }, { passive: true });

  function resolveGesture() {
    if (!pressedItem) return;
    if (swipeMode === 'swipe') {
      if (dx <= -SWIPE_THRESHOLD) {
        cancelArmed();
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = 'translateX(-120px)';
        pressedItem.classList.add('hist-swipe-armed-left');
        armedItem = pressedItem;
        armedDirection = 'left';
        hapticPulse(pressedItem, 'medium');
      } else if (dx >= SWIPE_THRESHOLD) {
        cancelArmed();
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = 'translateX(120px)';
        pressedItem.classList.add('hist-swipe-armed-right');
        armedItem = pressedItem;
        armedDirection = 'right';
        hapticPulse(pressedItem, 'medium');
      } else {
        pressedContent.style.transform = '';
        pressedItem.classList.remove('hist-swipe-left', 'hist-swipe-right');
      }
      wasSwipe = true;
      setTimeout(() => { wasSwipe = false; }, 300);
    }
    resetGesture();
  }
  container.addEventListener('touchend', resolveGesture);
  container.addEventListener('touchcancel', cancelGestureFully);

  // Souris (pratique pour tester sur desktop / vercel dev)
  let mouseActive = false;
  container.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.tv-season-row');
    if (!item || e.target.closest('.tv-season-reopen-btn') || e.target.closest('.tv-season-delete-btn')) return;
    mouseActive = true;
    pressedItem = item;
    pressedContent = item.querySelector('.tv-season-row-content');
    startX = e.clientX;
    startY = e.clientY;
    swipeMode = null;
    dx = 0;
  });
  document.addEventListener('mousemove', (e) => {
    if (!mouseActive || !pressedItem) return;
    const rawDx = e.clientX - startX;
    const rawDy = e.clientY - startY;
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll';
        if (swipeMode === 'swipe') {
          if (armedItem === pressedItem) cancelArmed();
          pressedItem.classList.add('hist-dragging');
        }
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;
    dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
    pressedItem.classList.toggle('hist-swipe-right', dx > 10);
  });
  document.addEventListener('mouseup', () => {
    if (!mouseActive) return;
    mouseActive = false;
    resolveGesture();
  });

  container.addEventListener('click', (e) => {
    if (armedItem) {
      const hint = e.target.closest('.hist-swipe-hint');
      const clickedItem = e.target.closest('.tv-season-row');
      if (hint && clickedItem === armedItem) {
        confirmArmed();
        return;
      }
      const wasArmedItself = clickedItem === armedItem;
      cancelArmed();
      if (wasArmedItself) return;
    }
  }, true); // capture : s'exécute avant les listeners de clic sur les boutons internes (reopen/delete)

  document.addEventListener('click', (e) => {
    if (armedItem && !container.contains(e.target)) cancelArmed();
  }, true);
}

// Glissement sur la carte de série elle-même — supprime toute la série
// (pas juste une saison). Uniquement vers la gauche : contrairement à une
// saison, une série entière n'a pas d'action "Modifier" unique vers
// laquelle glisser à droite, donc pas de second sens ici. Contrôleur
// séparé plutôt que de généraliser initTvSeasonSwipeGestures : n'agit que
// sur l'en-tête de la carte (pas sur la liste de saisons dépliée juste en
// dessous), pour ne jamais entrer en conflit avec le glissement des
// lignes de saison qui vit dans une zone distincte du DOM.
function initTvShowCardSwipeGestures(container) {
  const MOVE_CANCEL_PX = 12;
  const SWIPE_THRESHOLD = 80;
  const MAX_DRAG = 130;

  let startX = 0, startY = 0;
  let pressedItem = null, pressedContent = null;
  let swipeMode = null;
  let dx = 0;
  let armedItem = null;

  function cancelArmed() {
    if (!armedItem) return;
    const content = armedItem.querySelector('.tv-show-card-header');
    if (content) { content.style.transition = 'transform var(--dur-base) var(--ease-out)'; content.style.transform = ''; }
    armedItem.classList.remove('hist-swipe-armed-left', 'hist-swipe-left');
    armedItem = null;
  }

  function confirmArmed() {
    if (!armedItem) return;
    const showId = armedItem.dataset.showId;
    armedItem = null;
    const btn = container.querySelector(`.tv-show-delete-btn[data-show-id="${showId}"]`);
    if (btn) btn.click(); // réutilise exactement la même confirmation/suppression que le bouton visible
  }

  function resetGesture() {
    if (pressedItem) pressedItem.classList.remove('hist-dragging');
    pressedItem = null;
    pressedContent = null;
    swipeMode = null;
    dx = 0;
  }

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.tv-show-card-header-wrap');
    if (!item || e.target.closest('.tv-show-card-open-btn') || e.target.closest('.tv-show-delete-btn')) { resetGesture(); return; }
    e.stopPropagation();
    pressedItem = item;
    pressedContent = item.querySelector('.tv-show-card-header');
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swipeMode = null;
    dx = 0;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!pressedItem) return;
    e.stopPropagation();
    const rawDx = e.touches[0].clientX - startX;
    const rawDy = e.touches[0].clientY - startY;
    if (swipeMode === null) {
      if (Math.abs(rawDx) > MOVE_CANCEL_PX || Math.abs(rawDy) > MOVE_CANCEL_PX) {
        swipeMode = Math.abs(rawDx) > Math.abs(rawDy) * 0.5 ? 'swipe' : 'scroll';
        if (swipeMode === 'swipe') {
          if (armedItem === pressedItem) cancelArmed();
          pressedItem.classList.add('hist-dragging');
        }
      } else {
        return;
      }
    }
    if (swipeMode !== 'swipe') return;
    // Seulement vers la gauche : un glissement vers la droite ne fait rien
    // (pas de deuxième action), donc plafonné à 0 plutôt que de suivre le doigt.
    dx = Math.max(-MAX_DRAG, Math.min(0, rawDx));
    pressedContent.style.transform = `translateX(${dx}px)`;
    pressedItem.classList.toggle('hist-swipe-left', dx < -10);
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!pressedItem) return;
    if (swipeMode === 'swipe') {
      if (dx <= -SWIPE_THRESHOLD) {
        cancelArmed();
        pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
        pressedContent.style.transform = 'translateX(-120px)';
        pressedItem.classList.add('hist-swipe-armed-left');
        armedItem = pressedItem;
        hapticPulse(pressedItem, 'medium');
      } else {
        pressedContent.style.transform = '';
        pressedItem.classList.remove('hist-swipe-left');
      }
    }
    resetGesture();
  });
  container.addEventListener('touchcancel', () => {
    if (pressedItem && pressedContent) {
      pressedContent.style.transition = 'transform var(--dur-base) var(--ease-out)';
      pressedContent.style.transform = '';
      pressedItem.classList.remove('hist-swipe-left');
    }
    resetGesture();
  });

  container.addEventListener('click', (e) => {
    if (!armedItem) return;
    const hint = e.target.closest('.hist-swipe-hint');
    const clickedItem = e.target.closest('.tv-show-card-header-wrap');
    if (hint && clickedItem === armedItem) { confirmArmed(); return; }
    const wasArmedItself = clickedItem === armedItem;
    cancelArmed();
    if (wasArmedItself) return;
  }, true);

  document.addEventListener('click', (e) => {
    if (armedItem && !container.contains(e.target)) cancelArmed();
  }, true);
}

function reopenTvSeason(showId, seasonKey) {
  const show = loadTvShows().find(s => String(s.tmdbTvId) === String(showId));
  if (!show) return;
  switchMobileNav('rating');
  setMediaType('tv');
  selectedShow = { id: show.tmdbTvId, name: show.title, poster_path: show.poster_path };
  document.getElementById('tv-search').value = show.title;
  document.getElementById('tv-season-picker').style.display = 'none';
  const seasonData = show.seasons[seasonKey];
  selectSeason({ number: seasonKey, name: seasonData.seasonName, episodeCount: seasonData.totalEpisodes, poster: show.poster_path });
  document.getElementById('notation-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ═══════════════════════════════════════════
//  SÉRIES — Phase 5 : statistiques
// ═══════════════════════════════════════════
// Bascule sur le tableau de bord (KPI, radar, distribution des notes) —
// comptage par SÉRIE, pas par saison, comme partout ailleurs dans le
// module. La heatmap ET le graphique "Activité (6 derniers mois)" restent
// UNIQUES dans les deux modes (décidé ensemble) : ils montrent le rythme
// de visionnage global, films et séries confondus, pas de dédoublement.
// "Top Réalisateurs" n'a pas d'équivalent série pour l'instant (aucune
// donnée de showrunner récupérée) — replié plutôt que vide ou trompeur.

function switchStatsMediaFilter(type) {
  statsMediaFilter = type;
  document.getElementById('stats-tab-movie').classList.toggle('active', type === 'movie');
  document.getElementById('stats-tab-tv').classList.toggle('active', type === 'tv');
  const dashboard = document.querySelector('.dashboard-grid');
  const applyChange = () => {
    document.getElementById('kpi-total-label').textContent = type === 'movie' ? 'Films notés' : 'Séries suivies';
    document.getElementById('top-directors-box').style.display = type === 'movie' ? '' : 'none';
    if (type === 'tv') renderTvStats(); else renderStats();
  };
  if (!dashboard) { applyChange(); return; }
  dashboard.style.transition = 'opacity var(--dur-fast) var(--ease-out)';
  dashboard.style.opacity = '0';
  setTimeout(() => {
    applyChange();
    requestAnimationFrame(() => {
      dashboard.style.opacity = '1';
      setTimeout(() => { dashboard.style.removeProperty('opacity'); dashboard.style.removeProperty('transition'); }, 150);
    });
  }, 140);
}

function renderTvStats() {
  const shows = loadTvShows();
  animateCountUp(document.getElementById('kpi-total'), shows.length);

  const showAverages = shows.map(computeShowAverageScore).filter(a => a != null);
  if (showAverages.length === 0) {
    document.getElementById('kpi-avg').textContent = '-';
  } else {
    const avg = showAverages.reduce((a, b) => a + b, 0) / showAverages.length;
    animateCountUp(document.getElementById('kpi-avg'), avg, { decimals: 1 });
  }

  // Compte les SÉRIES ayant au moins une saison notée cette année (pas le
  // nombre brut de saisons notées) — même logique de comptage par série.
  const currentYear = new Date().getFullYear().toString();
  const yearShowsCount = shows.filter(s =>
    Object.values(s.seasons || {}).some(se => se.rating?.date?.startsWith(currentYear))
  ).length;
  // Ludex 2.0 : #kpi-year a disparu (voir le même correctif côté films dans
  // 06c-profile-stats.js) — sous-texte du Hero Header à la place.
  const heroYearSubEl = document.getElementById('profile-hero-year-sub');
  if (heroYearSubEl) heroYearSubEl.textContent = `+${yearShowsCount} en ${currentYear}`;

  const allRatings = getAllTvSeasonRatings();

  if (allRatings.length === 0) {
    document.getElementById('radar-chart-container').innerHTML = '';
    document.getElementById('radar-chart-container').style.minHeight = '0';
    document.getElementById('radar-empty').style.display = 'block';
  } else {
    const avgsByCriterion = computeCriteriaAverages(allRatings, CRITERIA);
    const avgs = CRITERIA.map(c => avgsByCriterion[c] || 0);
    const radarSvg = createRadarSVG(avgs, 'tv');
    if (radarSvg) {
      document.getElementById('radar-chart-container').innerHTML = radarSvg;
      document.getElementById('radar-chart-container').style.minHeight = '160px';
      document.getElementById('radar-empty').style.display = 'none';
    } else {
      document.getElementById('radar-chart-container').innerHTML = '';
      document.getElementById('radar-chart-container').style.minHeight = '0';
      document.getElementById('radar-empty').style.display = 'block';
    }
  }

  // Ludex 2.0 : timeline retirée (voir index.html) — la heatmap couvre déjà
  // ce rôle, films et séries confondus.

  const dist = { '50': 0, '45': 0, '40': 0, '35': 0, '30': 0, '25': 0, '20': 0, '15': 0, '10': 0, '05': 0 };
  allRatings.forEach(r => {
    const stars = Math.round((parseFloat(r.score) / 2) * 2) / 2;
    const key = Math.round(stars * 10).toString().padStart(2, '0');
    if (dist[key] !== undefined) dist[key]++;
  });
  buildHistogram(dist);
}

// ═══════════════════════════════════════════
//  SÉRIES — Widget "En cours" (onglet Noter, mode Série uniquement)
// ═══════════════════════════════════════════
// Une carte par série ayant un épisode à regarder : soit une saison
// entamée mais pas finie, soit — si la dernière saison connue vient
// d'être terminée — la saison suivante si elle existe (détectée via TMDb,
// pas stockée d'avance puisque seules les saisons déjà sélectionnées sont
// connues localement). Si aucune suite n'existe, la série disparaît
// simplement du widget.

async function renderTvContinueList() {
  const container = document.getElementById('tv-continue-list');
  const sectionEl = document.getElementById('tv-continue-section');
  const shows = loadTvShows();
  const candidates = [];

  for (const show of shows) {
    const entries = Object.entries(show.seasons || {});
    const partial = entries
      .filter(([, s]) => s.totalEpisodes > 0 && s.watchedEpisodes.length < s.totalEpisodes && !s.paused)
      .sort((a, b) => Number(b[0]) - Number(a[0]))[0];
    if (partial) {
      candidates.push({ show, seasonKey: partial[0], seasonEntry: partial[1] });
      continue;
    }
    const complete = entries
      .filter(([, s]) => s.totalEpisodes > 0 && s.watchedEpisodes.length >= s.totalEpisodes)
      .sort((a, b) => Number(b[0]) - Number(a[0]))[0];
    if (complete) {
      candidates.push({ show, seasonKey: complete[0], seasonEntry: complete[1], needsNextSeasonCheck: true });
    }
  }

  if (candidates.length === 0) {
    sectionEl.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  sectionEl.style.display = 'block';
  document.getElementById('tv-continue-count').textContent = `(${candidates.length})`;
  container.innerHTML = candidates.map((c, i) => `<div class="tv-continue-card tv-continue-loading" data-continue-idx="${i}">Chargement…</div>`).join('');

  candidates.forEach(async (cand, idx) => {
    const resolved = await resolveNextTvEpisode(cand);
    const placeholder = container.querySelector(`[data-continue-idx="${idx}"]`);
    if (!placeholder) return; // le conteneur a pu être reconstruit entre-temps
    if (!resolved) {
      placeholder.remove();
      if (container.children.length === 0) document.getElementById('tv-continue-section').style.display = 'none';
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderTvContinueCard(resolved);
    placeholder.replaceWith(wrapper.firstElementChild);
  });
}

async function resolveNextTvEpisode(cand) {
  const { show, needsNextSeasonCheck } = cand;
  let seasonKey = cand.seasonKey;
  let seasonEntry = cand.seasonEntry;

  if (needsNextSeasonCheck) {
    const nextNum = Number(seasonKey) + 1;
    try {
      const showDetail = await fetch(`/api/search?tvId=${show.tmdbTvId}`).then(readApiJson);
      const nextMeta = (showDetail.seasons || []).find(s => s.season_number === nextNum);
      if (!nextMeta) return null; // pas de saison suivante
      const shows = loadTvShows();
      const showEntry = shows.find(s => String(s.tmdbTvId) === String(show.tmdbTvId));
      seasonKey = String(nextNum);
      if (!showEntry.seasons[seasonKey]) {
        showEntry.seasons[seasonKey] = { seasonName: nextMeta.name, watchedEpisodes: [], totalEpisodes: nextMeta.episode_count };
        saveTvShows(shows);
      }
      seasonEntry = showEntry.seasons[seasonKey];
    } catch { return null; }
  }

  try {
    const seasonData = await fetch(`/api/search?tvSeasonShowId=${show.tmdbTvId}&tvSeasonNumber=${seasonKey}`).then(readApiJson);
    const episodes = seasonData.episodes || [];
    const nextEp = episodes.find(e => !seasonEntry.watchedEpisodes.includes(e.episode_number));
    if (!nextEp) return null;
    return { show, seasonKey, seasonEntry, episode: nextEp };
  } catch { return null; }
}

// Texte engageant selon la proximité de diffusion — "Demain", "J-3", ou la
// date complète au-delà d'une semaine (pas la peine d'un compte à rebours
// pour un épisode encore loin).
function formatAirCountdown(airDateStr) {
  const airDate = new Date(airDateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((airDate - today) / 86400000);
  if (diffDays <= 0) return 'Diffusion imminente';
  if (diffDays === 1) return 'Demain';
  if (diffDays <= 13) return `J-${diffDays}`;
  return `Diffusion le ${airDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

function renderTvContinueCard({ show, seasonKey, seasonEntry, episode }) {
  const posterUrl = tmdbImage(show.poster_path, 'w154');

  // Ludex 2.0 : protection anti-spoilers — un épisode déjà présent dans la
  // liste de la saison (donc "next unwatched" au sens strict) mais dont la
  // date de diffusion n'est pas encore passée reste verrouillé : ni titre,
  // ni synopsis, ni action de notation. episode.air_date vient de la même
  // réponse saison déjà chargée (pas d'appel réseau supplémentaire) —
  // équivalent en pratique à next_episode_to_air pour cet usage précis :
  // le prochain épisode non vu ET pas encore diffusé est justement celui
  // que next_episode_to_air désignerait.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const airDate = episode.air_date ? new Date(episode.air_date + 'T00:00:00') : null;
  const isLocked = !airDate || airDate > today;

  if (isLocked) {
    const countdown = episode.air_date ? formatAirCountdown(episode.air_date) : 'Date de diffusion inconnue';
    return `
      <div class="tv-continue-card tv-continue-locked">
        ${posterUrl ? `<img class="tv-continue-poster" src="${posterUrl}" alt="" loading="lazy">` : `<div class="tv-continue-poster tv-continue-poster-ph">${ICONS.clapper}</div>`}
        <div class="tv-continue-info">
          <div class="tv-continue-show-title">${escAttr(show.title)}</div>
          <div class="tv-continue-ep-title"><span class="tv-continue-ep-masked">Épisode à venir</span></div>
          <div class="tv-continue-meta">${escAttr(countdown)}</div>
        </div>
        <div class="tv-continue-lock-badge" aria-label="Épisode pas encore diffusé, notation indisponible" title="Pas encore diffusé">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        </div>
      </div>
    `;
  }

  const meta = [
    episode.air_date ? new Date(episode.air_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    episode.runtime ? `${episode.runtime} min` : '',
  ].filter(Boolean).join(' · ');
  return `
    <div class="tv-continue-card">
      <div class="tv-continue-card-actions">
        <button type="button" class="tv-continue-pause-btn" data-show-id="${show.tmdbTvId}" data-season-key="${seasonKey}" aria-label="Mettre en pause" title="Mettre en pause — reprends-la depuis sa fiche">${ICONS.pause}</button>
        <button type="button" class="tv-continue-remove-btn" data-show-id="${show.tmdbTvId}" data-season-key="${seasonKey}" aria-label="Retirer ${escAttr(show.title)} de cette liste" title="Retirer de la liste">${ICONS.close || '✕'}</button>
      </div>
      ${posterUrl ? `<img class="tv-continue-poster" src="${posterUrl}" alt="" loading="lazy">` : `<div class="tv-continue-poster tv-continue-poster-ph">${ICONS.clapper}</div>`}
      <div class="tv-continue-info">
        <div class="tv-continue-show-title">${escAttr(show.title)}</div>
        <div class="tv-continue-ep-title">${escAttr(seasonEntry.seasonName)} · Ép. ${episode.episode_number} — ${escAttr(episode.name || 'Sans titre')}</div>
        ${meta ? `<div class="tv-continue-meta">${escAttr(meta)}</div>` : ''}
        ${episode.overview ? `
          <details class="tv-continue-synopsis">
            <summary>Synopsis</summary>
            <p>${escAttr(episode.overview)}</p>
          </details>
        ` : ''}
      </div>
      <button type="button" class="tv-continue-check-btn" data-show-id="${show.tmdbTvId}" data-season-key="${seasonKey}" data-episode="${episode.episode_number}" aria-label="Valider l'épisode ${episode.episode_number} de ${escAttr(show.title)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>
      </button>
    </div>
  `;
}

document.getElementById('tv-continue-list').addEventListener('click', async (e) => {
  const removeBtn = e.target.closest('.tv-continue-remove-btn');
  if (removeBtn) {
    // Retire uniquement de cette liste — aucune donnée touchée, la carte
    // peut revenir au prochain rendu si les conditions correspondent
    // encore (ex : un épisode coché ailleurs).
    const cardEl = removeBtn.closest('.tv-continue-card');
    cardEl.remove();
    const container = document.getElementById('tv-continue-list');
    if (container.children.length === 0) document.getElementById('tv-continue-section').style.display = 'none';
    return;
  }

  const pauseBtn = e.target.closest('.tv-continue-pause-btn');
  if (pauseBtn) {
    const shows = loadTvShows();
    const showEntry = shows.find(s => String(s.tmdbTvId) === String(pauseBtn.dataset.showId));
    const seasonEntry = showEntry?.seasons?.[pauseBtn.dataset.seasonKey];
    if (seasonEntry) {
      seasonEntry.paused = true;
      saveTvShows(shows);
    }
    const cardEl = pauseBtn.closest('.tv-continue-card');
    cardEl.remove();
    const container = document.getElementById('tv-continue-list');
    if (container.children.length === 0) document.getElementById('tv-continue-section').style.display = 'none';
    showToast('Mise en pause — reprends-la depuis sa fiche');
    return;
  }

  const btn = e.target.closest('.tv-continue-check-btn');
  if (!btn) return;
  const showId = btn.dataset.showId;
  const seasonKey = btn.dataset.seasonKey;
  const episodeNumber = Number(btn.dataset.episode);

  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
  if (!showEntry) return;
  const seasonEntry = showEntry.seasons[seasonKey];
  if (!seasonEntry.watchedEpisodes.includes(episodeNumber)) seasonEntry.watchedEpisodes.push(episodeNumber);
  saveTvShows(shows);
  if (typeof statsDirty !== 'undefined') statsDirty = true;
  maybeShowSeasonCompleteBanner(showId, seasonKey, seasonEntry);

  const cardEl = btn.closest('.tv-continue-card');
  cardEl.classList.add('tv-continue-loading');
  const resolved = await resolveNextTvEpisode({
    show: showEntry, seasonKey, seasonEntry,
    needsNextSeasonCheck: seasonEntry.watchedEpisodes.length >= seasonEntry.totalEpisodes,
  });
  const container = document.getElementById('tv-continue-list');
  if (!resolved) {
    cardEl.remove();
    if (container.children.length === 0) document.getElementById('tv-continue-section').style.display = 'none';
  } else {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderTvContinueCard(resolved);
    cardEl.replaceWith(wrapper.firstElementChild);
  }
});

// Repli/dépliage de tout le widget — pour ne pas surcharger l'écran quand
// plusieurs séries sont en cours. Préférence mémorisée pour rester repliée
// d'une visite à l'autre si l'utilisateur le souhaite.
document.getElementById('tv-continue-toggle').addEventListener('click', () => {
  const list = document.getElementById('tv-continue-list');
  const toggle = document.getElementById('tv-continue-toggle');
  const collapsed = list.style.display === 'none';
  list.style.display = collapsed ? '' : 'none';
  toggle.setAttribute('aria-expanded', String(collapsed));
  toggle.classList.toggle('collapsed', !collapsed);
  localStorage.setItem('lbx_tv_continue_collapsed', collapsed ? '0' : '1');
});
if (localStorage.getItem('lbx_tv_continue_collapsed') === '1') {
  document.getElementById('tv-continue-list').style.display = 'none';
  document.getElementById('tv-continue-toggle').setAttribute('aria-expanded', 'false');
  document.getElementById('tv-continue-toggle').classList.add('collapsed');
}

// ═══════════════════════════════════════════
//  FICHE SÉRIE DÉTAILLÉE
// ═══════════════════════════════════════════
// Ouverte au tap sur une série (carte dans l'Historique). Même structure et
// mécanique que la fiche film (voir 12-movie-detail.js) : squelette de
// chargement, récupération à la demande, sections qui apparaissent en
// cascade. Adaptée où le format série le demande — la vraie différence :
// pas de "Ta note" unique, mais la progression par saison + note globale.

const tdsEl = document.getElementById('tv-detail-sheet');
const tdsContentEl = document.getElementById('tds-content');
const tdsCloseBtn = document.getElementById('tds-close-btn');

tdsContentEl.addEventListener('click', (e) => {
  const trailerWrap = e.target.closest('.mds-trailer-wrap');
  if (!trailerWrap || trailerWrap.querySelector('iframe')) return;
  const key = trailerWrap.dataset.videoKey;
  trailerWrap.innerHTML = `<iframe class="mds-trailer" src="https://www.youtube.com/embed/${key}?autoplay=1" title="Bande-annonce" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
});

function buildTdsSkeleton() {
  return `
    <div class="mds-skeleton">
      <div class="mds-skeleton-poster skeleton-bg"></div>
      <div class="mds-skeleton-lines">
        <div class="skeleton-text long skeleton-bg" style="height:18px;"></div>
        <div class="skeleton-text short skeleton-bg"></div>
      </div>
    </div>
    <div class="skeleton-text long skeleton-bg" style="margin-top:18px;"></div>
    <div class="skeleton-text long skeleton-bg"></div>
    <div class="skeleton-text short skeleton-bg"></div>
  `;
}

function buildSeasonProgressionSection(data, localShow) {
  const tmdbSeasons = (data.seasons || []).filter(s => s.season_number > 0 && s.episode_count > 0);
  if (tmdbSeasons.length === 0) return '';

  const avg = localShow ? computeShowAverageScore(localShow) : null;
  const avgHtml = avg != null
    ? `<div class="mds-personal-score">${avg.toFixed(1)}/10 <span class="mds-personal-stars">note globale</span></div>`
    : `<div class="mds-row"><span class="mds-label">—</span><span>Pas encore notée</span></div>`;

  const rowsHtml = tmdbSeasons.map(ts => {
    const key = String(ts.season_number);
    const localSeason = localShow?.seasons?.[key];
    let statusHtml;
    if (localSeason?.rating) {
      statusHtml = `<span class="tds-season-status tds-season-rated">${localSeason.rating.score}/10</span>`;
    } else if (localSeason) {
      statusHtml = `<span class="tds-season-status">${localSeason.watchedEpisodes.length}/${localSeason.totalEpisodes} ép.</span>`;
    } else {
      statusHtml = `<span class="tds-season-status tds-season-untracked">Non suivie</span>`;
    }
    return `
      <details class="tds-season-details" data-season-number="${ts.season_number}" data-episode-count="${ts.episode_count}" data-season-name="${escAttr(ts.name)}" data-season-poster="${escAttr(ts.poster_path || data.poster_path || '')}">
        <summary class="tds-season-progress-row">
          <span>${escAttr(ts.name)}</span>
          <span class="tds-season-progress-right">
            ${statusHtml}
            ${localSeason ? `<button type="button" class="tds-season-reopen-btn" data-show-id="${escAttr(String(localShow.tmdbTvId))}" data-season-key="${key}" title="Rouvrir pour noter" aria-label="Rouvrir ${escAttr(ts.name)} pour la noter">${ICONS.star}</button>` : ''}
            ${localSeason ? `<button type="button" class="tds-season-delete-btn" data-show-id="${escAttr(String(localShow.tmdbTvId))}" data-season-key="${key}" title="Retirer cette saison" aria-label="Retirer ${escAttr(ts.name)}">${ICONS.trash}</button>` : ''}
          </span>
        </summary>
        <div class="tds-season-episodes" data-loaded="false"></div>
      </details>
    `;
  }).join('');

  return `
    <div class="mds-section mds-personal" style="animation-delay:.05s">
      <div class="mds-section-title">Progression</div>
      ${avgHtml}
    </div>
    <div class="mds-section" style="animation-delay:.08s">
      <div class="mds-section-title">Détail par saison</div>
      <div class="tds-season-progress-list">${rowsHtml}</div>
    </div>
  `;
}

function buildTdsContent(data, localShow) {
  const posterUrl = tmdbImage(data.poster_path, 'w342');
  const year = data.first_air_date ? data.first_air_date.slice(0, 4) : '';
  const genres = (data.genres || []).map(g => g.name).join(', ');
  function personLink(p) {
    return `<span class="mds-person-link" data-person-id="${p.id}" data-person-name="${escAttr(p.name)}">${escAttr(p.name)}</span>`;
  }
  const creators = (data.created_by || []).map(personLink).join(', ');
  const castList = (data.credits?.cast || []).slice(0, 5);
  const castHtml = castList.map(c => escAttr(c.name)).join(', ');
  const firstAirStr = data.first_air_date
    ? new Date(data.first_air_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Inconnue';
  const statusLabels = { 'Returning Series': 'En cours', 'Ended': 'Terminée', 'Canceled': 'Annulée' };
  const statusStr = statusLabels[data.status] || data.status || 'Inconnu';
  const seasonCount = (data.seasons || []).filter(s => s.season_number > 0).length;

  return `
    <div class="mds-header" style="animation-delay:0s; --mds-backdrop: ${data.backdrop_path ? `url('${tmdbImage(data.backdrop_path, 'w780')}')` : 'none'}">
      <div class="mds-header-left">
        <div class="mds-poster-wrap">
          ${posterUrl
            ? `<img class="mds-poster" src="${posterUrl}" alt="Affiche de ${escAttr(data.name)}" loading="lazy">`
            : `<div class="mds-poster mds-poster-ph">${ICONS.clapper}</div>`}
          ${data.vote_average ? `<div class="mds-score-stamp"><span class="mds-score-stamp-val">${data.vote_average.toFixed(1)}</span><span class="mds-score-stamp-label">TMDb</span></div>` : ''}
        </div>
        ${localShow ? `<button type="button" class="mds-poster-change-btn" data-tv-poster-picker="${escAttr(String(data.id))}">Changer l'affiche</button>` : ''}
      </div>
      <div class="mds-header-info">
        <div class="mds-title" id="tds-title">${escAttr(data.name)}</div>
        <div class="mds-meta">${[year, `${seasonCount} saison${seasonCount > 1 ? 's' : ''}`, genres].filter(Boolean).map(s => `<span>${s}</span>`).join('')}</div>
        <div class="mds-external-ratings" id="tds-external-ratings"></div>
        ${creators ? `<div class="mds-header-director"><span class="mds-director-label">Créée par</span> <b>${creators}</b></div>` : ''}
      </div>
      ${localShow ? `
        <!-- Ludex 2.0 : "coup de cœur" pour les séries (voir
             Ludex_Specifications_Historique) — au niveau de LA SÉRIE entière
             (localShow.liked), pas par saison : plus simple, et cohérent
             avec la carte vedette de l'Historique qui représente une série
             en un seul bloc, pas saison par saison. Seulement visible une
             fois la série suivie (localShow existe) — se marquer "coup de
             cœur" sur une série qu'on n'a pas encore commencée n'a pas de sens. -->
        <button type="button" class="heart-btn tds-heart-btn ${localShow.liked ? 'active' : ''}" id="tds-heart-btn" data-show-id="${escAttr(String(data.id))}" title="Marquer comme coup de cœur" aria-label="Marquer ${escAttr(data.name)} comme coup de cœur" aria-pressed="${localShow.liked ? 'true' : 'false'}"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>
      ` : ''}
    </div>

    ${!localShow ? `
    <div class="mds-actions" style="animation-delay:.02s">
      <button type="button" class="mds-action-btn primary" id="tds-start-btn" title="Commencer cette série">${ICONS.play} Commencer la série</button>
    </div>
    ` : ''}

    ${buildSeasonProgressionSection(data, localShow)}

    ${(() => {
      const trailer = pickBestTrailer(data.videos?.results || []);
      if (!trailer) return '';
      return `
      <div class="mds-section" style="animation-delay:.12s">
        <div class="mds-section-title">Bande-annonce</div>
        <div class="mds-trailer-wrap" data-video-key="${trailer.key}" role="button" tabindex="0" aria-label="Lire la bande-annonce de ${escAttr(data.name)}">
          <img class="mds-trailer-thumb" src="https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg" alt="" loading="lazy">
          <div class="mds-trailer-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
      </div>`;
    })()}

    ${data.overview ? `
      <div class="mds-section" style="animation-delay:.15s">
        <div class="mds-section-title">Synopsis</div>
        <div class="mds-overview" id="tds-overview">${escAttr(data.overview)}</div>
        <button type="button" class="mds-overview-toggle" id="tds-overview-toggle">Lire la suite ▾</button>
      </div>` : ''}

    <div class="mds-section" style="animation-delay:.18s">
      <div class="mds-section-title">Détails</div>
      <div class="mds-row"><span class="mds-label">Première diffusion</span><span>${firstAirStr}</span></div>
      <div class="mds-row"><span class="mds-label">Statut</span><span>${escAttr(statusStr)}</span></div>
      ${castHtml ? `<div class="mds-row"><span class="mds-label">Avec</span><span>${castHtml}</span></div>` : ''}
    </div>

    ${(data.credits?.cast || []).length > 0 ? `
      <div class="mds-section" style="animation-delay:.22s">
        <div class="mds-section-title">Casting</div>
        <div class="mds-cast-carousel" id="tds-cast-carousel"></div>
      </div>` : ''}
  `;
}

async function populateTdsExternalRatings(imdbId) {
  const el = document.getElementById('tds-external-ratings');
  if (!el || !imdbId) return;
  try {
    const res = await fetch(`/api/search?imdbId=${imdbId}`);
    const data = await readApiJson(res);
    const ratings = data.ratings || [];
    if (ratings.length === 0) return;
    const labels = { 'Internet Movie Database': 'IMDb', 'Rotten Tomatoes': 'RT', 'Metacritic': 'Metacritic' };
    el.innerHTML = ratings
      .filter(r => labels[r.Source])
      .map(r => `<span class="mds-external-rating"><b>${labels[r.Source]}</b> ${escAttr(r.Value)}</span>`)
      .join('');
  } catch { /* silencieux : la note TMDb deja affichee suffit */ }
}

function setupTdsOverviewToggle() {
  const overview = document.getElementById('tds-overview');
  const toggle = document.getElementById('tds-overview-toggle');
  if (!overview || !toggle) return;
  requestAnimationFrame(() => {
    if (overview.scrollHeight <= overview.clientHeight + 2) toggle.style.display = 'none';
  });
}

function renderTdsCastCarousel(castArray) {
  const outer = document.getElementById('tds-cast-carousel');
  if (!outer) return;
  const cast = castArray.filter(c => c.id).slice(0, 20);
  if (cast.length === 0) return;

  const itemsHtml = cast.map(actor => {
    const photoUrl = tmdbImage(actor.profile_path, 'w185');
    return `
      <div class="mds-cast-item" data-person-id="${actor.id}" data-person-name="${escAttr(actor.name)}" role="button" tabindex="0" aria-label="Voir la fiche de ${escAttr(actor.name)}">
        ${photoUrl
          ? `<img class="mds-cast-photo" src="${photoUrl}" alt="Photo de ${escAttr(actor.name)}" loading="lazy">`
          : `<div class="mds-cast-photo mds-cast-photo-ph">${ICONS.clapper}</div>`}
        <div class="mds-cast-name">${escAttr(actor.name)}</div>
        ${actor.character ? `<div class="mds-cast-character">${escAttr(actor.character)}</div>` : ''}
      </div>`;
  }).join('');

  // Duplique la liste une fois : le défilement peut boucler sans à-coup dès
  // qu'il a parcouru l'équivalent d'une copie complète — même technique que
  // la fiche film (voir renderCastCarousel).
  outer.innerHTML = `<div class="mds-cast-track">${itemsHtml}${itemsHtml}</div>`;
  const track = outer.querySelector('.mds-cast-track');

  outer.addEventListener('click', (e) => {
    const item = e.target.closest('.mds-cast-item');
    if (item) openPersonDetailSheet(item.dataset.personId, item.dataset.personName);
  });

  const AUTO_SCROLL_SPEED = 0.3;
  const RESUME_DELAY_MS = 3000;
  let autoScrollPaused = false;
  let resumeTimer = null;

  function pauseThenScheduleResume() {
    autoScrollPaused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { autoScrollPaused = false; }, RESUME_DELAY_MS);
  }

  function tick() {
    if (!autoScrollPaused && tdsEl.classList.contains('open')) {
      outer.scrollLeft += AUTO_SCROLL_SPEED;
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0 && outer.scrollLeft >= halfWidth) outer.scrollLeft -= halfWidth;
    }
    if (tdsEl.classList.contains('open')) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  outer.addEventListener('touchstart', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('touchmove', (e) => { e.stopPropagation(); pauseThenScheduleResume(); }, { passive: true });
  outer.addEventListener('wheel', pauseThenScheduleResume, { passive: true });
  outer.addEventListener('scroll', pauseThenScheduleResume, { passive: true });
}

// Sauvegarde l'affiche choisie sur la série suivie localement — même geste
// que applyChosenPoster côté film, mais écrit directement le fragment TMDb
// brut (poster_path), déjà le format utilisé partout côté séries, plutôt
// que de construire une URL complète comme les films en ont besoin.
function applyChosenTvPoster(tmdbTvId, posterPath) {
  const shows = loadTvShows();
  const show = shows.find(s => String(s.tmdbTvId) === String(tmdbTvId));
  if (!show) return 0;
  show.poster_path = posterPath;
  saveTvShows(shows);
  return 1;
}

let tdsCurrentData = null;

async function openTvDetailSheet(tmdbTvId) {
  if (!tmdbTvId) return;
  lastFocusedBeforeModal = document.activeElement;
  tdsContentEl.innerHTML = buildTdsSkeleton();
  tdsEl.classList.add('open');
  tdsCloseBtn.focus();
  const tdsBoxEl = tdsEl.querySelector('.mds-box');
  if (tdsBoxEl) tdsBoxEl.scrollTop = 0;

  try {
    const res = await fetch(`/api/search?tvId=${tmdbTvId}`);
    if (!res.ok) throw new Error('bad status');
    const data = await readApiJson(res);
    if (!data || !data.name) throw new Error('no data');

    const localShow = loadTvShows().find(s => String(s.tmdbTvId) === String(tmdbTvId));
    tdsContentEl.innerHTML = buildTdsContent(data, localShow);
    tdsCurrentData = data;
    renderTdsCastCarousel(data.credits?.cast || []);
    const tdsPosterUrl = tmdbImage(data.poster_path, 'w342');
    applyPosterAccent(tdsPosterUrl, tdsEl.querySelector('.mds-box'));
    setupTdsOverviewToggle();
    setupStickyHeader(tdsEl);
    if (data.external_ids?.imdb_id) populateTdsExternalRatings(data.external_ids.imdb_id);
    wireSeasonDetailsToggles();
  } catch (e) {
    tdsCurrentData = null;
    tdsContentEl.innerHTML = `
      <div class="error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        <div class="error-state-msg">Impossible de charger les détails de la série. Vérifie ta connexion.</div>
        <button type="button" class="error-retry-btn" data-retry-tv-id="${escAttr(String(tmdbTvId))}">Réessayer</button>
      </div>`;
  }
}

// ── Grille d'épisodes, uniquement dans la fiche série ──
// Chargée à la demande au premier dépliage d'une saison (pas toutes en même
// temps à l'ouverture de la fiche) — même mécanique de coche/rattrapage que
// ce qui existait avant dans Noter, juste déplacée ici.

function wireSeasonDetailsToggles() {
  tdsContentEl.querySelectorAll('.tds-season-details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      const episodesContainer = details.querySelector('.tds-season-episodes');
      if (episodesContainer.dataset.loaded === 'true') return;
      loadAndRenderSeasonEpisodes(details, episodesContainer);
    });
  });
}

async function loadAndRenderSeasonEpisodes(detailsEl, container) {
  const showId = tdsCurrentData.id;
  const seasonNumber = detailsEl.dataset.seasonNumber;
  container.innerHTML = '<div class="search-status" style="display:block;">Chargement des épisodes…</div>';
  try {
    const data = await fetch(`/api/search?tvSeasonShowId=${showId}&tvSeasonNumber=${seasonNumber}`).then(readApiJson);
    const episodes = data.episodes || [];
    if (episodes.length === 0) {
      container.innerHTML = '<div class="search-status" style="display:block;">Aucun épisode trouvé pour cette saison.</div>';
      return;
    }
    renderTdsEpisodeChecklist(container, showId, String(seasonNumber), detailsEl.dataset.seasonName, episodes);
    container.dataset.loaded = 'true';
  } catch (err) {
    container.innerHTML = `<div class="search-status" style="display:block;">${escAttr(describeApiFailure(err))}</div>`;
  }
}

function renderTdsEpisodeChecklist(container, showId, seasonKey, seasonName, episodes) {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
  const seasonEntry = showEntry?.seasons?.[seasonKey];
  const watched = seasonEntry ? seasonEntry.watchedEpisodes : [];

  const rowsHtml = episodes.map(ep => {
    const isWatched = watched.includes(ep.episode_number);
    const meta = [
      ep.air_date ? new Date(ep.air_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      ep.runtime ? `${ep.runtime} min` : '',
    ].filter(Boolean).join(' · ');
    return `
      <div class="tv-episode-row" data-episode="${ep.episode_number}">
        <button type="button" class="tv-episode-check${isWatched ? ' watched' : ''}" data-episode="${ep.episode_number}" aria-pressed="${isWatched}" aria-label="Marquer l'épisode ${ep.episode_number} comme ${isWatched ? 'non vu' : 'vu'}">
          <svg class="tv-episode-checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>
        </button>
        <div class="tv-episode-info">
          <div class="tv-episode-title">${ep.episode_number}. ${escAttr(ep.name || 'Sans titre')}</div>
          ${meta ? `<div class="tv-episode-meta">${escAttr(meta)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="tds-episode-list">${rowsHtml}</div>
    <button type="button" class="mds-action-btn primary tds-rate-now-btn" style="display:none;" data-show-id="${showId}" data-season-key="${seasonKey}">Noter cette saison</button>
  `;

  container.querySelectorAll('.tv-episode-check').forEach(btn => {
    btn.addEventListener('click', () => onTdsEpisodeCheckClick(showId, seasonKey, seasonName, episodes.length, Number(btn.dataset.episode), container));
  });

  updateTdsRateButtonVisibility(container, showId, seasonKey);
}

function onTdsEpisodeCheckClick(showId, seasonKey, seasonName, totalEpisodes, episodeNumber, container) {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
  if (!showEntry) return;
  if (!showEntry.seasons[seasonKey]) {
    // Ne devrait normalement pas arriver (la saison est censée déjà exister
    // dès qu'elle a été "commencée" depuis Noter), créée quand même par
    // sécurité plutôt que de planter.
    showEntry.seasons[seasonKey] = { seasonName, watchedEpisodes: [], totalEpisodes };
  }
  const seasonEntry = showEntry.seasons[seasonKey];
  const already = seasonEntry.watchedEpisodes.includes(episodeNumber);

  const applyState = (num, watched) => {
    const btn = container.querySelector(`.tv-episode-check[data-episode="${num}"]`);
    if (!btn) return;
    btn.classList.toggle('watched', watched);
    btn.setAttribute('aria-pressed', String(watched));
  };

  if (already) {
    seasonEntry.watchedEpisodes = seasonEntry.watchedEpisodes.filter(n => n !== episodeNumber);
    saveTvShows(shows);
    applyState(episodeNumber, false);
    updateTdsRateButtonVisibility(container, showId, seasonKey);
    updateSeasonProgressRowStatus(showId, seasonKey);
    if (typeof statsDirty !== 'undefined') statsDirty = true;
    return;
  }

  const maxWatched = seasonEntry.watchedEpisodes.length ? Math.max(...seasonEntry.watchedEpisodes) : 0;
  const skipsAhead = episodeNumber > maxWatched + 1;
  const markWatched = (numbers) => {
    for (const n of numbers) if (!seasonEntry.watchedEpisodes.includes(n)) seasonEntry.watchedEpisodes.push(n);
    saveTvShows(shows);
    for (const n of numbers) applyState(n, true);
    updateTdsRateButtonVisibility(container, showId, seasonKey);
    updateSeasonProgressRowStatus(showId, seasonKey);
    if (typeof statsDirty !== 'undefined') statsDirty = true;
  };

  if (skipsAhead) {
    const from = maxWatched + 1;
    const proposeAll = confirm(`Marquer aussi les épisodes ${from} à ${episodeNumber - 1} comme vus ?`);
    const toMark = [];
    if (proposeAll) { for (let n = from; n <= episodeNumber; n++) toMark.push(n); }
    else toMark.push(episodeNumber);
    markWatched(toMark);
  } else {
    markWatched([episodeNumber]);
  }
}

function updateTdsRateButtonVisibility(container, showId, seasonKey) {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
  const seasonEntry = showEntry?.seasons?.[seasonKey];
  const btn = container.querySelector('.tds-rate-now-btn');
  if (!btn || !seasonEntry) return;
  const isComplete = seasonEntry.totalEpisodes > 0 && seasonEntry.watchedEpisodes.length >= seasonEntry.totalEpisodes;
  btn.style.display = isComplete ? 'block' : 'none';
}

// Met à jour le badge visible dans le <summary> (X/Y ép.) sans reconstruire
// toute la fiche — seulement si la saison n'est pas déjà notée (une note
// existante prime toujours sur le décompte d'épisodes dans l'affichage).
function updateSeasonProgressRowStatus(showId, seasonKey) {
  const shows = loadTvShows();
  const showEntry = shows.find(s => String(s.tmdbTvId) === String(showId));
  const seasonEntry = showEntry?.seasons?.[seasonKey];
  if (!seasonEntry || seasonEntry.rating) return;
  const details = tdsContentEl.querySelector(`.tds-season-details[data-season-number="${seasonKey}"]`);
  const statusEl = details?.querySelector('.tds-season-status');
  if (statusEl) statusEl.textContent = `${seasonEntry.watchedEpisodes.length}/${seasonEntry.totalEpisodes} ép.`;
}

function closeTvDetailSheet() {
  closeModal(tdsEl);
}

tdsCloseBtn.addEventListener('click', closeTvDetailSheet);
tdsEl.addEventListener('click', (e) => {
  if (e.target === tdsEl) { closeTvDetailSheet(); return; }

  const personLinkEl = e.target.closest('.mds-person-link');
  if (personLinkEl) {
    openPersonDetailSheet(personLinkEl.dataset.personId, personLinkEl.dataset.personName);
    return;
  }

  const retryBtn = e.target.closest('[data-retry-tv-id]');
  if (retryBtn) { openTvDetailSheet(retryBtn.dataset.retryTvId); return; }

  const posterChangeBtn = e.target.closest('.mds-poster-change-btn[data-tv-poster-picker]');
  if (posterChangeBtn) { openPosterPicker(posterChangeBtn.dataset.tvPosterPicker, 'tv'); return; }

  const heartBtn = e.target.closest('#tds-heart-btn[data-show-id]');
  if (heartBtn) {
    const shows = loadTvShows();
    const show = shows.find(s => String(s.tmdbTvId) === String(heartBtn.dataset.showId));
    if (show) {
      show.liked = !show.liked;
      saveTvShows(shows);
      heartBtn.classList.toggle('active', show.liked);
      heartBtn.setAttribute('aria-pressed', String(show.liked));
      hapticPulse(heartBtn, 'medium');
      if (typeof statsDirty !== 'undefined') statsDirty = true;
    }
    return;
  }

  // Ludex 2.0 : le bouton supprimer d'une saison a migré ici depuis
  // l'ancienne carte extensible de l'Historique (retirée avec le passage en
  // grille) — même fonction (deleteTvSeasonWithConfirm, 18-tv-shows.js),
  // juste un point d'entrée différent. preventDefault+stopPropagation
  // impératifs : ce bouton vit DANS un <summary>, sans ça le clic
  // déclencherait aussi l'ouverture/fermeture du <details> parent.
  const seasonDeleteBtn = e.target.closest('.tds-season-delete-btn[data-show-id]');
  if (seasonDeleteBtn) {
    e.preventDefault();
    e.stopPropagation();
    deleteTvSeasonWithConfirm(seasonDeleteBtn.dataset.showId, seasonDeleteBtn.dataset.seasonKey);
    return;
  }

  const seasonReopenBtn = e.target.closest('.tds-season-reopen-btn[data-show-id]');
  if (seasonReopenBtn) {
    e.preventDefault();
    e.stopPropagation();
    reopenTvSeason(seasonReopenBtn.dataset.showId, seasonReopenBtn.dataset.seasonKey);
    return;
  }

  // "Commencer la série" : crée le suivi de la première saison directement
  // (sans passer par Noter), l'ajoute au widget "En cours", puis recharge
  // la fiche sur place pour montrer la progression qui vient de démarrer.
  if (e.target.closest('#tds-start-btn')) {
    const data = tdsCurrentData;
    if (!data) return;
    const seasons = (data.seasons || [])
      .filter(s => s.season_number > 0 && s.episode_count > 0)
      .sort((a, b) => a.season_number - b.season_number);
    const first = seasons[0];
    if (!first) return;
    const shows = loadTvShows();
    let showEntry = shows.find(s => String(s.tmdbTvId) === String(data.id));
    if (!showEntry) {
      const genreStr = (data.genres || []).map(g => g.name).join(', ');
      showEntry = { tmdbTvId: data.id, title: data.name, poster_path: data.poster_path, genre: genreStr, seasons: {} };
      shows.push(showEntry);
    }
    const seasonKey = String(first.season_number);
    if (!showEntry.seasons[seasonKey]) {
      showEntry.seasons[seasonKey] = { seasonName: first.name, watchedEpisodes: [], totalEpisodes: first.episode_count };
    }
    saveTvShows(shows);
    showToast(`"${data.name} — ${first.name}" ajoutée à En cours`);
    if (typeof renderTvContinueList === 'function') renderTvContinueList();
    openTvDetailSheet(data.id);
    return;
  }

  // Bouton "Noter cette saison", affiché une fois tous les épisodes cochés
  // dans la grille — même navigation que rouvrir depuis l'Historique.
  const rateNowBtn = e.target.closest('.tds-rate-now-btn');
  if (rateNowBtn && tdsCurrentData) {
    const showId = rateNowBtn.dataset.showId;
    const seasonKey = rateNowBtn.dataset.seasonKey;
    const show = loadTvShows().find(s => String(s.tmdbTvId) === String(showId));
    if (show && show.seasons[seasonKey]) {
      const seasonData = show.seasons[seasonKey];
      closeTvDetailSheet();
      switchMobileNav('rating');
      setMediaType('tv');
      selectedShow = { id: show.tmdbTvId, name: show.title, poster_path: show.poster_path };
      document.getElementById('tv-search').value = show.title;
      document.getElementById('tv-season-picker').style.display = 'none';
      selectSeason({
        number: seasonKey, name: seasonData.seasonName,
        episodeCount: seasonData.totalEpisodes, poster: show.poster_path,
      });
    }
    return;
  }
});

initSwipeToClose(tdsEl, closeTvDetailSheet);
