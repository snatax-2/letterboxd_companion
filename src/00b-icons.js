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

  // ── Ludex 2.0 : boussole/signet/clapperboard/TV réutilisées à la fois
  //    dans la barre de navigation (index.html, statique) et dans les 5
  //    bascules Films/Séries (voir wireMediaSwitchIcons(), 01-navigation.js)
  //    — centralisées ici pour n'avoir qu'un seul endroit à modifier.
  //    Fournies par l'utilisateur (boussole, TV, clapperboard — même
  //    famille visuelle Hugeicons, trait 1.5) ; le signet est une
  //    approximation dans le même style (aucune version fournie), à
  //    remplacer si un fichier précis arrive plus tard. Un NOUVEAU clapper
  //    plutôt qu'une réutilisation de ICONS.clapper (trait 2, dessin
  //    différent, pas de la même famille visuelle que ces trois-là).
  compassNav: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--icon-stroke, 1.5)" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z"/><path d="M12.4014 8.29796L15.3213 7.32465C16.2075 7.02924 16.6507 6.88153 16.8846 7.11544C17.1185 7.34935 16.9708 7.79247 16.6753 8.67871L15.702 11.5986C15.1986 13.1088 14.9469 13.8639 14.4054 14.4054C13.8639 14.9469 13.1088 15.1986 11.5986 15.702L8.67871 16.6753C7.79247 16.9708 7.34935 17.1185 7.11544 16.8846C6.88153 16.6507 7.02924 16.2075 7.32465 15.3213L8.29796 12.4014C8.80136 10.8912 9.05306 10.1361 9.59457 9.59457C10.1361 9.05306 10.8912 8.80136 12.4014 8.29796Z"/><path d="M12.125 12H12M12.25 12C12.25 12.1381 12.1381 12.25 12 12.25C11.8619 12.25 11.75 12.1381 11.75 12C11.75 11.8619 11.8619 11.75 12 11.75C12.1381 11.75 12.25 11.8619 12.25 12Z"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--icon-stroke, 1.5)" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M4 14.5V6.5C4 4.61438 4 3.67157 4.58579 3.08579C5.17157 2.5 6.11438 2.5 8 2.5H16C17.8856 2.5 18.8284 2.5 19.4142 3.08579C20 3.67157 20 4.61438 20 6.5V19.9506C20 20.9354 20 21.4278 19.6894 21.6357C19.1015 22.0293 18.2679 21.4457 17.8321 21.1526L13.2214 18.0454C12.7576 17.7335 12.5257 17.5776 12.2643 17.5455C12.0888 17.5238 11.9112 17.5238 11.7357 17.5455C11.4743 17.5776 11.2424 17.7335 10.7786 18.0454L6.16789 21.1526C5.73206 21.4457 4.89848 22.0293 4.31063 21.6357C4 21.4278 4 20.9354 4 19.9506V14.5Z"/></svg>`,
  clapperboardStroke: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--icon-stroke, 1.5)" class="icon"><path d="M2.5 10.5C2.5 6.72876 2.5 4.84315 3.67157 3.67157C4.84315 2.5 6.72876 2.5 10.5 2.5H13.5C17.2712 2.5 19.1569 2.5 20.3284 3.67157C21.5 4.84315 21.5 6.72876 21.5 10.5V13.5C21.5 17.2712 21.5 19.1569 20.3284 20.3284C19.1569 21.5 17.2712 21.5 13.5 21.5H10.5C6.72876 21.5 4.84315 21.5 3.67157 20.3284C2.5 19.1569 2.5 17.2712 2.5 13.5V10.5Z"/><path d="M3 8H22"/><path d="M6 8L11.5 2.5"/><path d="M13 8L18.5 2.5"/><path d="M6.5 17.5H10.5" stroke-linecap="round"/><path d="M6.5 13.5L15.5 13.5" stroke-linecap="round"/></svg>`,
  tv: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--icon-stroke, 1.5)" stroke-linecap="round" class="icon"><path d="M2 14C2 10.2288 2 8.34315 3.17157 7.17157C4.34315 6 6.22876 6 10 6H14C17.7712 6 19.6569 6 20.8284 7.17157C22 8.34315 22 10.2288 22 14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14Z"/><path d="M9 3L12 6L16 2" stroke-linejoin="round"/></svg>`,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ICONS };
}
