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

  flame: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.5-2-1-3 2 1 4 4 4 7a7 7 0 0 1-14 0c0-4 3-6 4-8 .5-1 .5-2 0-3 1 0 2.5 0 3 0z"/></svg>`,

  search: `<svg ${ICON_ATTRS}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,

  barChart: `<svg ${ICON_ATTRS}><line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="19" y1="20" x2="19" y2="15"/></svg>`,

  target: `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>`,

  flame: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.5-2-1-3 2 1 4 4 4 7a7 7 0 0 1-14 0c0-4 3-6 4-8 .5-1 .5-2 0-3 1 0 2.5 0 3 0z"/></svg>`,

  clapper: `<svg ${ICON_ATTRS}><path d="M3 8l1.5-3h4L7 8"/><path d="M8.5 8l1.5-3h4l-1.5 3"/><path d="M14 8l1.5-3h4l-1.5 3"/><rect x="3" y="8" width="18" height="12" rx="1"/></svg>`,

  copy: `<svg ${ICON_ATTRS}><rect x="9" y="9" width="11" height="11" rx="1"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>`,

  refresh: `<svg ${ICON_ATTRS}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>`,

  trash: `<svg ${ICON_ATTRS}><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/><line x1="10" y1="11" x2="10" y2="16"/><line x1="14" y1="11" x2="14" y2="16"/></svg>`,

  palette: `<svg ${ICON_ATTRS}><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.3c1.8 0 3.2-1.4 3.2-3.2C21 6.6 17 2 12 2z"/><circle cx="7" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>`,

  cloud: `<svg ${ICON_ATTRS}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,

  moon: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>`,

  edit: `<svg ${ICON_ATTRS}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,

  check: `<svg ${ICON_ATTRS}><polyline points="20 6 9 17 4 12"/></svg>`,

  close: `<svg ${ICON_ATTRS}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

  star: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="icon"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6z"/></svg>`,

  popcorn: `<svg ${ICON_ATTRS}><path d="M6 8h12l-1.4 12.1a1 1 0 0 1-1 .9H8.4a1 1 0 0 1-1-.9L6 8z"/><path d="M9 8v13M12 8v13M15 8v13"/><path d="M5 8a2 2 0 0 1 2-3h10a2 2 0 0 1 2 3"/></svg>`,

  sofa: `<svg ${ICON_ATTRS}><path d="M5 12a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3H5v-3z"/><path d="M4 15v4M20 15v4"/><path d="M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>`,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ICONS };
}
