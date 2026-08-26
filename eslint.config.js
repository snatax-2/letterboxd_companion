// Configuration ESLint ciblée sur les classes de bugs qui ont RÉELLEMENT
// mordu ce projet (voir README) :
// - no-redeclare : doublons de noms de fonctions — la 2e écrase silencieusement
//   la 1re (a cassé la carte "Ton profil" via renderProfileExtras dupliqué)
// - no-dupe-keys : clés dupliquées dans un objet littéral (la flamme des ICONS)
// Le lint tourne sur src/ (hygiène par fichier) ET sur app.js construit :
// c'est dans le fichier concaténé que les doublons ENTRE fichiers apparaissent.
//
// no-undef est volontairement désactivé : les 17 fichiers de src/ partagent
// leurs globals par concaténation (architecture assumée, sans bundler) —
// énumérer chaque fonction partagée serait ingérable et sans valeur.
const js = require('@eslint/js');

module.exports = [
  {
    files: ['src/**/*.js', 'app.js', 'api/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
    },
    rules: {
      'no-redeclare': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-func-assign': 'error',
      'no-unreachable': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'eqeqeq': ['error', 'smart'],
    },
  },
  // no-unused-vars UNIQUEMENT sur app.js, pas sur src/ pris fichier par fichier.
  // Raison : avec le partage de globals par concaténation, une fonction déclarée
  // dans src/12 et appelée depuis src/15 paraît inutilisée quand ESLint lit src/12
  // isolément — mesuré, ça donnait 72 faux positifs. Sur le fichier CONCATÉNÉ,
  // tous les appels inter-fichiers sont visibles : 0 faux positif.
  // Les fonctions consommées par les onclick d'index.html sont déclarées avec
  // /* exported ... */ en tête de leur fichier source.
  {
    files: ['app.js'],
    rules: {
      'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['api/**/*.js'],
    languageOptions: { sourceType: 'module' },
  },
];
