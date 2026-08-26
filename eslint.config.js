// Configuration ESLint ciblée sur les classes de bugs qui ont RÉELLEMENT
// mordu ce projet (voir README) :
// - no-redeclare : doublons de noms de fonctions — la 2e écrase silencieusement
//   la 1re (a cassé la carte "Ton profil" via renderProfileExtras dupliqué)
// - no-dupe-keys : clés dupliquées dans un objet littéral (la flamme des ICONS)
// Le lint tourne sur src/ (hygiène par fichier) ET sur app.js construit :
// c'est dans le fichier concaténé que les doublons ENTRE fichiers apparaissent.
//
// no-undef reste désactivé sur src/ pris fichier par fichier : les fichiers y
// partagent leurs globals par concaténation (architecture assumée, sans
// bundler), donc chaque appel inter-fichiers y paraît indéfini. Il est en
// revanche actif sur le app.js CONCATÉNÉ, où toutes les déclarations sont
// visibles — même raisonnement que no-unused-vars plus bas.
const js = require('@eslint/js');
const globals = require('globals');

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
    languageOptions: {
      globals: {
        ...globals.browser,
        // Garde `typeof module !== 'undefined' && module.exports` en fin de
        // certains fichiers : elle permet aux tests unitaires (node --test) de
        // require() la logique pure. Inoffensive dans le navigateur.
        module: 'readonly',
        // Définies par affectation (`window.X = function …`) puis appelées sans
        // préfixe ailleurs, y compris depuis des attributs onclick d'index.html.
        // ESLint ne relie pas une affectation sur `window` à une déclaration de
        // portée : il faut les lui nommer. Toute fonction ajoutée sur ce modèle
        // doit être ajoutée ici, sinon le lint la signalera comme indéfinie.
        deleteItem: 'readonly',
        loadItem: 'readonly',
        removeWatchlist: 'readonly',
        toggleLikedForItem: 'readonly',
        watchlistToForm: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
      // ── POURQUOI CETTE RÈGLE EXISTE ────────────────────────────────────
      // En activant no-unused-vars, j'ai converti dix `catch (e)` en `catch {}`
      // — et trois de ces blocs se servaient encore de leur liaison. Le lint
      // n'a rien vu (no-undef était désactivé partout), les tests non plus :
      // ce sont des chemins d'erreur. Résultat, trois ReferenceError au lieu
      // du traitement d'erreur prévu, dont l'annulation du partage de carte de
      // profil, qui est un geste utilisateur parfaitement banal.
      //
      // Sur le fichier concaténé, la règle ne produit aucun faux positif une
      // fois les globals navigateur et les cinq fonctions `window.X` déclarés
      // ci-dessus. Mesuré : 1025 signalements sans cette déclaration, 0 avec.
      'no-undef': 'error',
    },
  },
  {
    files: ['api/**/*.js'],
    languageOptions: { sourceType: 'module' },
  },
];
