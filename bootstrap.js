'use strict';

// Exécuté sans `defer`, juste après le nœud du splash : applique le thème et
// demande uniquement les polices nécessaires avant le premier rendu utile.
// Ce fichier externe remplace l'ancien script inline afin que la CSP puisse
// interdire l'exécution JavaScript inline.
const THEME_FONTS = Object.freeze({
  default: ['Fraunces:ital,wght@0,600;1,600', 'Work+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400', 'IBM+Plex+Mono:wght@400;500;600'],
  carnet: ['Special+Elite', 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400', 'Courier+Prime:ital,wght@0,400;0,700;1,400', 'Caveat:wght@400;600;700'],
  filmnoir: ['Cinzel:wght@400;700;900', 'Inter:wght@400;600;700', 'Space+Mono:ital,wght@0,400;0,700;1,400'],
  cinephile: ['Poppins:wght@400;500;600;700;800', 'Fragment+Mono:ital@0;1'],
  moderne: ['Syne:wght@400;700;800', 'DM+Sans:ital,wght@0,400;0,500;0,700;1,400', 'Martian+Mono:wght@400;600;700'],
  technicolor: ['Oswald:wght@400;600;700', 'Inter:wght@400;600;700', 'JetBrains+Mono:wght@400;600;700'],
});

const BASE_FONTS = ['Titillium+Web:ital,wght@0,300;0,400;0,600;0,700;1,400'];
const loadedFontSets = new Set();

window.loadThemeFonts = function loadThemeFonts(theme) {
  const safeTheme = Object.prototype.hasOwnProperty.call(THEME_FONTS, theme) ? theme : 'default';
  if (loadedFontSets.has(safeTheme)) return;
  loadedFontSets.add(safeTheme);

  const families = BASE_FONTS.concat(THEME_FONTS[safeTheme]);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families.map((family) => `family=${family}`).join('&')}&display=swap`;
  document.head.appendChild(link);
};

function relativeLuminance(hex) {
  let value = hex.replace('#', '');
  if (value.length === 3) value = value.split('').map((char) => char + char).join('');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) => (
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  ));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

(function themeSplash() {
  try {
    const settings = JSON.parse(localStorage.getItem('lbx_settings') || '{}');
    let theme = settings.theme || 'default';
    if (theme === 'system') {
      theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'default' : 'filmnoir';
    }

    const palettes = {
      default: '#14181c',
      carnet: '#FAF3EC',
      filmnoir: '#050505',
      cinephile: '#F9F6F0',
      moderne: '#F9F6F0',
      technicolor: '#101425',
    };
    const safeTheme = Object.prototype.hasOwnProperty.call(palettes, theme) ? theme : 'default';
    const background = palettes[safeTheme];
    window.loadThemeFonts(safeTheme);

    const splash = document.getElementById('app-splash');
    if (!splash) return;
    splash.style.background = background;
    const title = splash.querySelector('.app-splash-title');
    if (title) title.style.color = relativeLuminance(background) > 0.35 ? '#14181c' : '#ffffff';
  } catch {
    window.loadThemeFonts('default');
  }
})();

// Initialiseur Vercel Speed Insights, également externalisé pour la CSP.
window.si = window.si || function speedInsights() {
  (window.siq = window.siq || []).push(arguments);
};
