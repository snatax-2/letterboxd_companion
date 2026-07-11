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
function extractPosterAccentColorFromUrl(url) {
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
          if (count === 0) { resolve(null); return; }
          resolve(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`);
        } catch (e) {
          resolve(null); // canvas "tainted" (CORS) : dégradation silencieuse
        }
      };
      img.onerror = () => resolve(null);
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
