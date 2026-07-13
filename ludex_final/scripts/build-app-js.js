// Reconstruit app.js à partir des fichiers découpés dans src/.
//
// Pourquoi : app.js faisait ~1750 lignes en un seul bloc, difficile à naviguer.
// Le code est maintenant réparti en fichiers plus petits et thématiques dans src/
// (ex: src/08-watchlist.js pour tout ce qui touche à la watchlist), mais le
// navigateur continue de charger un seul fichier app.js classique (pas de modules
// ES, pas d'import/export) : ce script se contente de les recoller bout à bout,
// dans le bon ordre, exactement comme si le code n'avait jamais été coupé.
//
// Le préfixe numérique (00-, 01-, 02-...) de chaque fichier de src/ DÉFINIT l'ordre
// de concaténation. C'est important car certaines variables/fonctions déclarées
// dans un fichier sont utilisées par les fichiers suivants (comme avant le découpage).
//
// Ce script tourne automatiquement à chaque déploiement Vercel (voir "build" dans
// package.json), avant generate-sw-cache.js (qui a besoin du app.js à jour pour
// calculer son hash). Il faut aussi le relancer en local après avoir modifié un
// fichier de src/, avant de tester avec `vercel dev` :
//
//     npm run build
//
// Ne jamais éditer app.js directement : il est régénéré à chaque build et toute
// modification manuelle serait écrasée.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const OUTPUT_FILE = path.join(ROOT, 'app.js');

function build() {
  const files = fs.readdirSync(SRC_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort(); // les préfixes numériques (00-, 01-...) garantissent le bon ordre

  const header =
    '// ⚠️ FICHIER GÉNÉRÉ AUTOMATIQUEMENT — NE PAS ÉDITER DIRECTEMENT.\n' +
    '// Modifie les fichiers dans src/, puis lance `npm run build`.\n' +
    `// Assemblé depuis : ${files.join(', ')}\n\n`;

  const parts = files.map((file) => {
    const content = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
    return content.replace(/\s*$/, '\n'); // une seule fin de ligne propre entre fichiers
  });

  fs.writeFileSync(OUTPUT_FILE, header + parts.join('\n'), 'utf8');
  console.log(`[build-app-js] app.js régénéré à partir de ${files.length} fichiers de src/ : ${files.join(', ')}`);
}

build();
