'use strict';

// Exécuté sans `defer`, juste après le nœud du splash : applique le thème et
// demande uniquement les polices nécessaires avant le premier rendu utile.
// Ce fichier externe remplace l'ancien script inline afin que la CSP puisse
// interdire l'exécution JavaScript inline.
const THEME_FONTS = Object.freeze({
  dark: ['Playfair+Display:ital,wght@0,500;0,600;0,700;1,500', 'Inter:wght@400;500;600;700', 'JetBrains+Mono:wght@400;500;600'],
  light: ['Playfair+Display:ital,wght@0,500;0,600;0,700;1,500', 'Inter:wght@400;500;600;700', 'JetBrains+Mono:wght@400;500;600'],
});

const BASE_FONTS = [];
const loadedFontSets = new Set();

window.loadThemeFonts = function loadThemeFonts(theme) {
  const safeTheme = Object.prototype.hasOwnProperty.call(THEME_FONTS, theme) ? theme : 'dark';
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
    const lightLegacyThemes = new Set(['carnet', 'cinephile', 'moderne']);
    let theme = settings.theme || 'dark';
    if (lightLegacyThemes.has(theme)) theme = 'light';
    else if (!['dark', 'light', 'system'].includes(theme)) theme = 'dark';
    if (theme === 'system') {
      theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    const palettes = {
      dark: '#0A0A0C',
      light: '#F5F4F0',
    };
    const safeTheme = Object.prototype.hasOwnProperty.call(palettes, theme) ? theme : 'dark';
    const background = palettes[safeTheme];
    window.loadThemeFonts(safeTheme);

    const splash = document.getElementById('app-splash');
    if (!splash) return;
    splash.style.background = background;
    const title = splash.querySelector('.app-splash-title');
    if (title) title.style.color = relativeLuminance(background) > 0.35 ? '#111111' : '#FAFAFA';
  } catch {
    window.loadThemeFonts('dark');
  }
})();

// Initialiseur Vercel Speed Insights, également externalisé pour la CSP.
window.si = window.si || function speedInsights() {
  (window.siq = window.siq || []).push(arguments);
};
