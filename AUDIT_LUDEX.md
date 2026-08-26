# Audit Complet — Ludex Rating Companion
*(Rapport de niveau Senior / Staff Engineer)*

## Executive Summary
Ludex Rating Companion est une application web monopage (PWA) fonctionnant essentiellement comme un carnet de bord pour cinéphiles et sériphiles. Son objectif est de permettre de noter, de tenir un historique, de gérer une liste d'envies et de découvrir des films et des séries de manière personnalisée sans un algorithme contraignant.
Le projet témoigne d'une grande passion et d'un souci minutieux du détail (particulièrement en matière d'animations et de micro-interactions CSS), mais souffre d'une dette architecturale importante côté Frontend. Son approche "Vanilla JS" avec concaténation monolithique de fichiers (plus de 20 fichiers `src/` assemblés dans un `app.js`) complique la maintenabilité. L'UI et l'UX donnent souvent un sentiment "premium" sur mobile grâce au soin apporté au *CSS*, mais le code sous-jacent est fragile, sujet aux régressions, et parfois lourd.

## Compréhension de l'application
**Type d'application** : Progressive Web App (PWA) orientée mobile-first.
**Objectif fonctionnel** : Suivi de visionnage (historique, notation rapide ou multicritères, "à voir", découverte).
**Utilisateurs cibles** : Cinéphiles et sériphiles (usage personnel).
**Stack technique** :
- **Frontend** : Vanilla HTML, CSS, JavaScript (sans framework de composants comme React ou Vue).
- **Backend / API** : Serverless Vercel Functions (`/api`), servant principalement de proxy vers TheMovieDB (TMDb) et Supabase.
- **Base de données** : Supabase (pour la synchronisation inter-appareils via "codes de synchro").
**Architecture Générale** :
- **Client lourd** : Toute la logique d'état et d'interface est gérée côté client.
- **Build Step Rudimentaire** : Scripts Node.js maison pour concaténer les fichiers (`app.js`) et minifier le CSS/JS.
- **État (State)** : Muté directement via le DOM ou via des variables globales (e.g. `currentMode`, `isLiked`). Pas de store centralisé.
- **Persistance** : `localStorage` couplé à une synchronisation asynchrone avec Supabase.

### Carte Mentale de l'Architecture Actuelle
```text
[ Vercel CDN ]
  |-- index.html (Structure UI statique + CSS inline/minifié)
  |-- styles.css (Thèmes CSS variables, UI pure)
  |-- app.js (Code concaténé)
       |-- 03-foundation.js (Variables globales, helpers, DOM utils)
       |-- 03b-pure-logic.js (Logique mathématique de calcul, ELO, pure)
       |-- 01...20.js (Logique UI, Listeners, DOM Mutation par domaine)
  |-- sw.js (Service Worker PWA)

[ Vercel Serverless Functions ]
  |-- /api/search.js (Proxy TMDb, caching)
  |-- /api/sync.js (Proxy Supabase, Rate Limiting, Sync logic)

[ Supabase (PostgreSQL) ]
  |-- ludex_sync (Synchronisation d'état JSONB par code hashé)
```

## Architecture
**Sévérité des problèmes : CRITIQUE / ÉLEVÉE**

Le choix du Vanilla JS pur avec manipulation directe du DOM et gestion d'état globale est le point faible majeur du projet.
1. **Couplage Fort UI/Logique (Sévérité: ÉLEVÉE)** : La plupart des fichiers (e.g., `18-tv-shows.js`, `05-rating-form.js`) lisent l'état depuis le DOM (e.g., `document.getElementById('movie-title').value`) ou écrivent directement l'HTML via `innerHTML`.
    - *Impact* : Fragilité. Changer un ID dans l'HTML casse la logique. Tester l'UI nécessite un navigateur complet (E2E).
    - *Correction* : Introduire un store léger (type Redux-lite ou Zustand-like si on reste en Vanilla, ou migrer vers Preact/Svelte).
2. **Gestion de l'État Globale (Sévérité: CRITIQUE)** : Des variables comme `currentMode`, `selectedShow`, `activeGenre` sont partagées globalement et mutées de partout.
    - *Impact* : "Race conditions" (récemment corrigées via `_tvShowsWriteQueue` mais révélateur du problème). Risques d'états asynchrones impossibles.
    - *Correction* : Isoler l'état dans une structure unifiée (ex: `state = { rating: {...}, tv: {...} }`) avec un dispatcher (events ou fonctions reducer).
3. **Concaténation vs Bundling (Sévérité: MOYENNE)** : Les fichiers sont numérotés et concaténés (ex: `00-pwa.js` à `20-back-navigation.js`).
    - *Impact* : Pas de scope (les variables `const` ou `let` fuient si non encapsulées dans des IIFE), dépendance forte à l'ordre des fichiers, pas de *Tree Shaking*.
    - *Correction* : Utiliser un bundler moderne (Vite, esbuild) avec les modules ES (`import`/`export`).
4. **Duplication de Code (Sévérité: MOYENNE)** : Il y a de nombreux "renderers" qui construisent des chaînes de template HTML presque identiques.

## Code Quality
**Score : 4.5/10**
- *Le positif* : Le code est extrêmement bien documenté. Les commentaires expliquent le *pourquoi* des choix architecturaux et des patchs. `03b-pure-logic.js` est une excellente initiative de séparation pour la testabilité.
- *Le négatif* : Constante manipulation DOM (`document.getElementById()`), écouteurs d'événements ajoutés de manière impérative (parfois en inline HTML `onclick=`), variables globales fuyantes. Les templates littéraux sont omniprésents et sujets aux failles XSS (bien qu'atténués par `escAttr()`).

## Fonctionnalités
- Les fonctionnalités sont riches et dignes d'une application "Premium" : système ELO pour duels de films, notes sur 7 critères, gestion PWA hors-ligne, rétrospective annuelle style "Spotify Wrapped", et synchronisation Cloud chiffrée.
- *Incohérence* : L'historique et le système TV (Séries) ont été rajoutés par-dessus la structure Films. Bien qu'ils aient été scindés, certaines actions restent partagées de manière confuse (ex: `#view-date` partagé par les films et les séries, compliquant les formulaires).
- La gestion des *empty states* et des erreurs réseaux est bien implémentée et "Premium" (illustrations, messages spécifiques, retry button).

## UX / UI
- **Impression globale : PREMIUM**.
- L'interface bénéficie d'un design system clair via des variables CSS. Le concept des "Thèmes" (Technicolor, Bauhaus, Carnet) est très bien exécuté.
- *Amélioration* : Certaines modales/sheets sur mobile pourraient bénéficier d'une meilleure distinction hiérarchique, bien que le récent `z-index` fix (ex: `10010` pour `#modal`) témoigne d'un effort de consolidation.

## Fluidité & Animations
- L'app excelle ici. L'usage de `requestAnimationFrame` et de transformations GPU (`transform: scale()`, `translateY()`) assure des micro-interactions de qualité native.
- *Cependant*, l'absence de *Virtual DOM* signifie que de larges rendus (ex: re-render l'historique ou la Watchlist avec `innerHTML`) détruisent et recréent les nœuds du DOM, ce qui, sans virtualisation (remplacé par un `content-visibility: auto`), ralentit les téléphones d'entrée de gamme lors du scrolling d'une longue liste.

## Performance
- **Frontend** : Bundle JS et CSS minifié en un seul bloc. C'est performant sur la première visite (pas de waterfall de modules), mais la taille globale va souffrir de la scalabilité. Le lazy loading des images (via `loading="lazy"`) est correct.
- **DOM** : Le *re-render* complet via `innerHTML` est coûteux.
- **Backend / API** : Excellente utilisation du Cache CDN (`Cache-Control: s-maxage, stale-while-revalidate`) sur Vercel. Réduit considérablement les requêtes à TMDb.

## Accessibilité
- **Score : 8/10**.
- Le projet inclut des attributs `aria-`, un `skip-link`, un support de la touche "réduire les animations" (`prefers-reduced-motion`).
- *Cependant*, les templates générés en JS omettent parfois des règles sémantiques ou emboîtent des éléments interactifs (les corrections E2E montrent que ça a été pris au sérieux, mais le Vanilla JS rend cela difficile à garantir en continu).

## Responsive Design
- L'approche mobile-first est très solide avec un layout qui se transforme correctement sur les plus grands écrans.
- Le carrousel et la mise en page de l'historique et des watchlists utilisent bien des grilles CSS intelligentes (ex. `repeat(auto-fill, minmax(...))`) permettant un redimensionnement très fluide sur tablette/desktop.

## Design System
- Un véritable Design System a été implémenté en CSS natif. Il existe une palette de variables (`--bg`, `--surface`, `--text`, etc.) qui permettent de basculer facilement entre des dizaines de thèmes complets.
- L'utilisation cohérente des échelles typographiques (`--text-xs` à `--text-2xl`), des espaces et de l'élévation est le signe d'un code UI très mature. C'est l'un des gros points forts du projet.

## Sécurité
- Le Backend Proxy API cache les clés TMDb.
- La Synchro Supabase hache le code en SHA-256 (`storageKey`) avant la requête. Sécurité **très solide** contre les fuites de la DB Supabase.
- Côté client, l'utilisation massive de `.innerHTML` avec `escAttr()` est un risque. S'il y a un oubli de `escAttr()`, c'est une faille XSS immédiate. Mieux vaudrait utiliser `textContent` ou un framework qui échappe par défaut.

## Tests
- Excellent ! La présence de Node.js tests pour la pure logique (`03b-pure-logic.js`) et de Playwright (E2E) pour tester la PWA dans son ensemble (y compris le visuel, le tactile et l'accessibilité avec `axe-core`) est une pratique "Staff Engineer" exemplaire.

## Maintenabilité
- Difficile pour un nouveau développeur. L'absence de modules ES (`import/export`), le recours à des scripts de build personnalisés pour concaténer, et la dépendance au fichier unique `app.js` généré est une forme de dette technique majeure pour une app moderne (2024+).

---

## Dette Technique & Top 20 des Problèmes

| # | Problème | Gravité | Impact | Effort | Priorité |
|---|---|---|---|---|---|
| 1 | Architecture d'état globale et manipulée en impératif (Variables globales) | CRITIQUE | Bugs d'UI désynchronisée, asynchronisme impossible à prédire | P0 (Bloquant) | P1 |
| 2 | Génération du DOM via `innerHTML` et strings | CRITIQUE | Risque XSS, perte des event listeners, lenteur DOM | P0 | P1 |
| 3 | Concaténation de fichiers au lieu de modules ES | ÉLEVÉE | Faux scoping, pollution du namespace, pas de Tree Shaking | P1 | P1 |
| 4 | Fichiers monolithiques multi-responsabilités | ÉLEVÉE | Code dur à maintenir (`app.js` généré) | P1 | P1 |
| 5 | Absence de Virtualisation sur les longues listes | MOYENNE | Lenteur au scroll et crash potentiels (mobile) | P2 | P2 |
| 6 | Séparation imparfaite `movie` vs `tv` | MOYENNE | Complexité à rajouter de nouveaux types de médias | P2 | P2 |
| 7 | Handlers d'événements ajoutés aux éléments enfants au lieu de la délégation | MOYENNE | Lenteur au rendu, memory leaks potentiels | P2 | P2 |
| 8 | Multiples appels redondants de `document.getElementById` | FAIBLE | Goulot d'étranglement au recalcul UI | P3 | P3 |
| 9 | Mix logique API et logique UI dans des fonctions comme `fetchAndRenderProviders` | MOYENNE | Baisse de testabilité de la couche data | P2 | P3 |
| 10 | Manque de typage (TypeScript ou JSDoc avancé) | MOYENNE | Refactorings risqués, contrats de données implicites | P2 | P2 |
| 11 | Utilisation de `setTimeout(..., 0)` pour garantir l'ordre d'initialisation | ÉLEVÉE | "Race conditions" cachées par un hack temporel | P1 | P1 |
| 12 | Tests unitaires très couplés à `03b-pure-logic.js` mais le reste est intraitable en jsdom | MOYENNE | Seule l'interface E2E Playwright valide le gros de l'app | P2 | P2 |
| 13 | Gestion de l'offline qui repose en grande partie sur l'UI et pas sur le cache SW structuré | FAIBLE | Dégradation d'expérience offline partielle | P3 | P3 |
| 14 | Z-index gérés arbitrairement dans le CSS (`10011`, `9999`) | MOYENNE | Conflits modales fréquents, regressions UI futures | P3 | P3 |
| 15 | Le script de synchronisation API écrit/lit dans une queue unique globale (`_tvShowsWriteQueue`) | MOYENNE | Point de contention performance et logique opaque | P2 | P2 |
| 16 | Le bouton Noter/Coup de coeur partagé pour les items Tv vs Movie de façon parfois divergente | MOYENNE | Code source non-DRY pour les actions similaires | P2 | P3 |
| 17 | Logique de validation de texte XSS (`escAttr`) manuellement appelé partout | ÉLEVÉE | Oubli garanti au fil du temps (XSS vulnerability) | P1 | P1 |
| 18 | `localStorage` synchrone pour les gros payloads JSON | MOYENNE | Bloque le thread principal JS au démarrage et sauvegarde | P2 | P2 |
| 19 | Composants UI HTML liés statiquement au CSS via classes d'animations dédiées (e.g. `tapPop`) | FAIBLE | Rend la modification du behavior d'animation risquée | P3 | P3 |
| 20 | Les appels API backend sont non-paginés à certaines échelles (limites 40-100) | FAIBLE | Risque de payload massive si la DB s'agrandit | P3 | P3 |

---

## Plan de Remise à Niveau (Roadmap)

### Phase 1 — Corrections critiques
- **Objectif** : Résoudre les risques de sécurité (XSS) et les "race conditions" critiques.
- **Tâches** :
  - Automatiser la protection XSS (remplacer `innerHTML` et `escAttr` manuel par des méthodes sécurisées comme `textContent` ou `DocumentFragment` natif).
  - Éliminer le hack `setTimeout(0)` à l'initialisation.
- **Ordre d'exécution** : Immédiat.
- **Dépendances** : Aucune.
- **Difficulté estimée** : Moyenne.
- **Bénéfice attendu** : Sécurisation absolue contre l'injection, élimination des bugs asynchrones de chargement.

### Phase 2 — Performance
- **Objectif** : Optimiser le rendu DOM et réduire les bottlenecks JS synchrones.
- **Tâches** :
  - Implémenter la virtualisation (`virtual-scroller`) pour les longues listes (Historique, Watchlist).
  - Migrer les écritures/lectures de `localStorage` très lourdes en asynchrone (IndexedDB) pour libérer le thread UI.
- **Ordre d'exécution** : Après la Phase 1.
- **Dépendances** : Phase 1 (stabilité de l'initialisation).
- **Difficulté estimée** : Élevée.
- **Bénéfice attendu** : 60FPS garanti au scroll, y compris sur les vieux smartphones avec un gros historique.

### Phase 3 — Architecture
- **Objectif** : Moderniser l'outillage et l'isolation du code (Bundling, State).
- **Tâches** :
  - Remplacer les scripts de concaténation `build-app-js.js` par un bundler (Vite).
  - Convertir le code en modules ES (`import/export`).
  - Centraliser les variables d'état (store) et unifier les actions de mutation (`dispatch`).
- **Ordre d'exécution** : En parallèle ou après la Phase 2.
- **Dépendances** : Aucune.
- **Difficulté estimée** : Très Élevée (impact transverse).
- **Bénéfice attendu** : DX (Developer Experience) moderne, Tree Shaking, HMR, code plus lisible et testable unitairement.

### Phase 4 — UX/UI
- **Objectif** : Renforcer l'unification des composants entre "Films" et "Séries".
- **Tâches** :
  - Extraire les actions communes (Noter, Mettre en favori, Supprimer) en fonctions UI génériques, indépendantes du Media Type.
  - Aligner l'UX du widget "En cours" TV pour qu'il soit aussi naturel que l'ajout en Watchlist.
- **Ordre d'exécution** : Après le refactoring de la Phase 3.
- **Dépendances** : Phase 3 (Architecture component-like).
- **Difficulté estimée** : Faible.
- **Bénéfice attendu** : Cohérence UX absolue, moins de duplication.

### Phase 5 — Accessibilité
- **Objectif** : Atteindre un standard de conformité strict (WCAG AA complet).
- **Tâches** :
  - S'assurer que tous les nouveaux fragments générés dynamiquement passent les tests `axe-core` sans violations.
  - Revoir l'utilisation d'ARIA où les sémantiques natives (`<button>`, `<a>`) peuvent les remplacer.
- **Ordre d'exécution** : Après refonte UI de la Phase 4.
- **Dépendances** : Phase 4.
- **Difficulté estimée** : Faible.
- **Bénéfice attendu** : Application utilisable universellement, robustesse du markup.

### Phase 6 — Qualité
- **Objectif** : Couvrir le code applicatif non-pure-logic.
- **Tâches** :
  - Introduire TypeScript (ou JSDoc typé strict).
  - Élargir les tests Unitaires au-delà de `03b-pure-logic.js` en mockant le Store fraîchement créé.
- **Ordre d'exécution** : Fin de projet technique.
- **Dépendances** : Phase 3 (Modules ES et Store isolés).
- **Difficulté estimée** : Moyenne.
- **Bénéfice attendu** : Zéro régression future sur la refonte, refactorings sécurisés.

### Phase 7 — Polish
- **Objectif** : Maintenir l'identité premium et affiner les interactions.
- **Tâches** :
  - Réévaluer l'usage des z-index (`10010`) pour un contexte d'empilement propre.
  - Découpler les classes d'animation (`tapPop`) du HTML brut vers un système de variantes de composants via JS/CSS.
- **Ordre d'exécution** : Ultime.
- **Dépendances** : Toutes les phases précédentes.
- **Difficulté estimée** : Faible.
- **Bénéfice attendu** : Code CSS plus propre, animations plus modulaires.

## Score Final

| Domaine | Score |
|---|---|
| Architecture | 3/10 |
| Qualité du code | 4.5/10 |
| Fonctionnalités | 9/10 |
| UX | 9/10 |
| UI | 9/10 |
| Accessibilité | 8/10 |
| Performance | 6/10 |
| Fluidité | 8/10 |
| Responsive | 8/10 |
| Sécurité | 7/10 |
| Tests | 9/10 |
| Maintenabilité | 3/10 |
| Design System | 8/10 |
| **NOTE GLOBALE** | **7/10** |

**Conclusion** : Ludex Rating Companion est un produit d'exception d'un point de vue fonctionnel et Design. C'est une application qui donne une impression "Premium" à l'utilisateur final. Toutefois, côté ingénierie, l'application a poussé l'approche Vanilla JS à sa limite absolue. Un passage à l'échelle ou l'intégration d'autres développeurs sur le projet nécessitera impérativement une modernisation du socle Frontend vers une approche modulaire et déclarative (Bundler + DOM Réactif).