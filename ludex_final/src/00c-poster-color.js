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
