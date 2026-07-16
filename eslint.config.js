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
    },
  },
  {
    files: ['api/**/*.js'],
    languageOptions: { sourceType: 'module' },
  },
];
