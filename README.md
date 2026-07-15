# Ludex Rating Companion

App de notation de films (recherche TMDb, fiche film, watchlist, providers de streaming BE) — front-end statique + une fonction serverless Vercel qui fait office de proxy vers l'API TMDb.

## Structure du projet

```
ludex/
├── index.html            → structure de la page
├── styles.css             → tous les styles et thèmes
├── app.js                  → ⚠️ FICHIER GÉNÉRÉ, ne pas éditer directement (voir src/)
├── src/                    → code source réel de app.js, découpé par thème
│   ├── 00-pwa.js             → enregistrement du service worker
│   ├── 01-navigation.js       → onglets desktop & mobile, swipe entre onglets
│   ├── 02-theme.js            → thèmes & réglages
│   ├── 03-foundation.js       → config, helpers, state, stockage local
│   ├── 03b-pure-logic.js      → logique pure et testable (score, fusion cloud) — voir tests/
│   ├── 04-search.js           → recherche TMDb & auto-complétion
│   ├── 05-rating-form.js      → formulaire de notation (score, tags, sauvegarde...)
│   ├── 06-history.js          → historique, dashboard, stats, tri
│   ├── 07-data-io.js          → export / import
│   ├── 08-watchlist.js        → watchlist
│   ├── 09-modal-init.js       → modale de confirmation & initialisation
│   ├── 10-cloud-sync.js       → synchronisation cloud (sauvegarde/restauration)
│   └── 11-discover.js         → onglet "Découvrir" façon Tinder (swipe pour ajouter/passer)
├── tests/                  → tests automatisés (node:test), voir section dédiée plus bas
├── scripts/
│   ├── build-app-js.js      → concatène src/*.js dans l'ordre pour produire app.js
│   └── generate-sw-cache.js → calcule le hash de version pour sw.js
├── sw.js                   → service worker (PWA, hors-ligne)
├── manifest.json            → manifeste PWA (icônes, nom, couleurs)
├── favicon.png, icon-192.png, icon-512.png, apple-touch-icon.png
├── api/
│   ├── package.json       → marque ce dossier en module ES (pour Node/tests uniquement)
│   ├── _rateLimit.js       → limiteur de requêtes partagé (pas une route, préfixe _)
│   ├── search.js           → fonction serverless Vercel (proxy TMDb + cache)
│   └── sync.js             → fonction serverless Vercel (synchro cloud Supabase)
├── .github/workflows/ci.yml → vérifications automatiques (build, tests, syntaxe) à chaque push
├── package.json
├── vercel.json
├── .gitignore
└── .env.example           → variables d'environnement nécessaires (TMDB_KEY, SUPABASE_*)
```

### Pourquoi `app.js` est généré

Le fichier faisait à l'origine ~1750 lignes en un seul bloc. Le code est maintenant réparti dans `src/`, mais le navigateur charge toujours un seul fichier classique `app.js` (pas de modules ES, aucun risque de casser l'ordre d'exécution existant). Le script `scripts/build-app-js.js` recolle les fichiers de `src/` bout à bout, dans l'ordre de leur préfixe numérique (`00-`, `01-`, `02-`...), pour reproduire exactement le même comportement qu'avant le découpage.

**Règle à retenir : ne jamais éditer `app.js` directement**, il serait écrasé au prochain build. Édite le fichier concerné dans `src/`, puis régénère avec :
```bash
npm run build:js
```

Vercel régénère aussi `app.js` automatiquement à chaque déploiement (`npm run build`, voir `vercel.json`).

## 1. Mise en place dans VS Code

1. Installer [VS Code](https://code.visualstudio.com/) et l'extension **Vercel** (optionnel) + **ESLint**/**Live Server** si besoin.
2. Ouvrir le dossier `ludex/` dans VS Code (`File > Open Folder`).
3. Récupérer une clé API TMDb sur https://www.themoviedb.org/settings/api si ce n'est pas déjà fait.
4. Copier `.env.example` en `.env` et renseigner ta clé :
   ```
   cp .env.example .env
   ```
   puis éditer `.env` :
   ```
   TMDB_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## Synchronisation cloud (Supabase)

Permet de sauvegarder historique + watchlist + réglages en ligne (pour ne jamais les perdre) et de les retrouver sur un autre appareil via un "code de synchronisation" que tu choisis toi-même.

**Fusion, pas écrasement** : si tu notes un film sur ton PC et un autre sur ton téléphone avant de synchroniser, les deux sont conservés — rien n'est perdu. Si tu notes le *même* film des deux côtés, c'est la version la plus récente qui est gardée. Les suppressions sont respectées elles aussi (via un petit mécanisme de traces horodatées), donc un film supprimé sur un appareil ne réapparaît pas après une synchro depuis un autre appareil qui l'avait encore.

1. Crée un compte gratuit sur https://supabase.com et un nouveau projet.
2. Dans le projet, va dans **SQL Editor** → **New query**, colle ceci, puis **Run** :
   ```sql
   create table if not exists ludex_sync (
     sync_code  text primary key,
     payload    jsonb not null,
     updated_at timestamptz not null default now()
   );
   ```
3. Va dans **Settings → API**. Note deux valeurs :
   - **Project URL** (ex: `https://xxxxxxxxxxxx.supabase.co`)
   - **service_role key** (⚠️ pas la clé "anon" — la clé "service_role", à garder secrète)
4. Ajoute-les à ton `.env` local :
   ```
   SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. Ajoute les **mêmes** variables dans Vercel : `Project Settings → Environment Variables` (Production + Preview + Development).
6. Dans l'app, ouvre les réglages (⚙️) → section "Synchronisation cloud" → choisis un code (ex: un mot de passe que toi seul connais) → **Sauvegarder maintenant**.
7. Sur un autre appareil/navigateur, ouvre les réglages, entre le **même code**, clique **Restaurer depuis le cloud**.

La clé `service_role` ne quitte jamais le serveur (elle est utilisée uniquement dans `api/sync.js`, jamais envoyée au navigateur) — c'est cette fonction serverless qui fait l'intermédiaire entre l'app et Supabase.

## Tests automatisés

La logique la plus critique de l'app (calcul du score, fusion de la synchro cloud, rate limiting de l'API) est couverte par des tests automatisés, sans dépendance externe (juste `node:test`, intégré à Node.js).

```bash
npm test
```

Ce que ça couvre :
- **`tests/score.test.js`** — calcul du score en mode rapide et en mode détaillé (moyenne pondérée), conversion en étoiles.
- **`tests/merge-logic.test.js`** — fusion de l'historique/watchlist entre deux appareils : union de films différents, résolution de conflit sur le même film (le plus récent gagne), respect des suppressions (tombstones), purge automatique après 90 jours.
- **`tests/description-tiers.test.js`** — textes descriptifs par palier + qualificatif "bas/haut de la fourchette" pour chaque valeur de 0 à 10.
- **`tests/criteria-averages.test.js`** — moyennes personnelles par critère (repère sur les sliders + radar), gestion des anciens films sans un critère donné.
- **`tests/profile-stats.test.js`** — onglet Profil : formatage du temps visionné, calcul de série (streak) hebdomadaire, badges débloqués.
- **`tests/wrapped-stats.test.js`** — rétrospective annuelle : filtrage par année, genre/réalisateur/acteur/mois les plus fréquents, film le mieux noté, temps visionné, cas limites (historique vide, films sans date).

## Tests de bout en bout (E2E, vrai navigateur)

`npm test` teste la LOGIQUE (Node/jsdom, aucun rendu CSS réel). `npm run test:e2e` complète ça avec de vrais tests dans un vrai navigateur (Playwright/Chromium, viewport mobile, vrais événements tactiles) — c'est le seul moyen d'attraper les bugs de rendu/interaction que jsdom ne peut pas voir (mise en page CSS, gestes tactiles réels).

**Première installation** :
```powershell
npm install
npx playwright install chromium
```

**Lancer les tests** :
```powershell
npm run test:e2e
```

- **`tests/e2e/tab-swipe.spec.js`** — navigation par glissement entre les 5 onglets, dans les deux sens, pour toutes les paires adjacentes + les cas limites (glisser au-delà du premier/dernier onglet). Cible la classe de bug rencontrée plusieurs fois (un onglet non reconnu par `currentView()`).
- **`tests/e2e/quick-rating.spec.js`** — widget d'étoiles : glissement pour sélectionner (et isolation du swipe d'onglet), + vérification du VRAI style calculé (`clip-path`) sur une étoile pleine — c'est le seul moyen d'attraper la classe de bug qu'on a eue (sélecteur CSS qui ne matchait jamais, étoiles pleines affichées à moitié).
- **`tests/e2e/trending-carousel.spec.js`** — glisser sur le carrousel de tendances n'entraîne pas de changement d'onglet.
- **`tests/e2e/sheet-swipe-close.spec.js`** — glisser vers le bas ferme la fiche film (seuil suffisant/insuffisant), et la croix de fermeture reste fonctionnelle.
- **`tests/e2e/history-swipe-race.spec.js`** — un swipe légèrement diagonal au départ est bien reconnu, et l'état "armé" d'un item se préserve correctement à travers un re-rendu (synchro en arrière-plan, etc.) au lieu de laisser un état fantôme.
- **`tests/e2e/history-stale-index.spec.js`** — deux suppressions/modifications confirmées coup sur coup suppriment les bons films, sans décalage d'index dû à une suppression qui s'intercale.
- **`tests/e2e/update-banner.spec.js`** — le bandeau "nouvelle version disponible" reste caché par défaut, s'affiche correctement une fois déclenché, et le bouton recharge la page.
- **`tests/e2e/pull-to-refresh.spec.js`** — tirer suffisamment vers le bas (en haut de page) déclenche le rafraîchissement ; aucune interférence si la page est déjà scrollée.
- **`tests/e2e/watchlist-swipe.spec.js`** — retrait par glissement (avec annulation possible), isolation vis-à-vis du swipe de changement d'onglet.
- **`tests/e2e/person-detail-sheet.spec.js`** — filmographie limitée au rôle principal, films déjà vus grisés, navigation vers la fiche film au clic.
- **`tests/e2e/keyboard-accessibility.spec.js`** — activation par Entrée/Espace des cartes cliquables (tendances, casting, filmographie...), focus déplacé à l'ouverture d'une fiche, piégeage du focus dans une fiche ouverte.
- **`tests/e2e/surprise-me.spec.js`** — le bouton "Surprends-moi" ouvre la fiche du film pioché, et affiche un message (sans planter) si aucun résultat.
- **`tests/e2e/onboarding.spec.js`** — l'accueil ne s'affiche qu'à un vrai nouvel utilisateur (aucune donnée), se parcourt en plusieurs étapes, et ne revient plus une fois vu (que ce soit terminé ou passé).
- **`tests/e2e/header-scroll-check.spec.js`** — après défilement d'une fiche film, le bouton de fermeture reste visible et rien ne dépasse au-dessus de l'en-tête.
- **`tests/e2e/trailer-click-to-load.spec.js`** — la bande-annonce affiche une vignette cliquable, l'iframe ne se charge qu'au clic.
- **`tests/e2e/watchlist-picker.spec.js`** — choisir une liste existante (même si ce n'est pas la liste active) ajoute bien le film dedans ; créer une nouvelle liste à la volée fonctionne aussi.
- **`tests/e2e/daily-quiz.spec.js`** — quiz du jour : bonne réponse (confirmation + série), mauvaise réponse (série remise à zéro). Écrit pour ton environnement (celui où j'ai développé avait une restriction réseau propre à son bac à sable empêchant une vérification E2E fiable pour ce fichier précis — la logique a été validée séparément en détail).
- **`tests/e2e/technicolor-theme.spec.js`** — le thème Technicolor se sélectionne et applique bien ses couleurs (fond, rouge), sauvegardé correctement dans les réglages.
- **`tests/duels.test.js`** — cœur mathématique ELO : symétrie stricte des gains/pertes, sensibilité à l'écart de cotes, bornes, conservation de la somme du système.
- **`tests/e2e/duels.spec.js`** — parcours complet des duels : choisir un film met à jour les cotes (une au-dessus, une en dessous de 1200), passer un duel ne touche à rien, message clair avec moins de 2 films, classement avec médailles après 3 duels.
- **`tests/e2e/ux-polish.spec.js`** — l'aperçu du geste de swipe se joue une seule fois à la première visite de l'historique ; l'en-tête de la fiche film garde toujours un fond opaque (teinté ou non).
- **`tests/letterboxd-import.test.js`** — parseur CSV (virgules dans les titres, guillemets doublés, CRLF, retours à la ligne dans un champ) et mapping Letterboxd (note /5 -> /10, détection diary/ratings/watched par l'en-tête, lignes sans titre ignorées).
- **`tests/e2e/letterboxd-import.spec.js`** — import réel d'un diary.csv (fusion, doublons ignorés, conversion des notes, titre à virgule intact) ; bannière de rappel de sauvegarde après 30 jours, retirée après export.

À étendre à chaque nouvelle fonctionnalité tactile (nouveaux carrousels, nouvelles fiches, etc.) pour ne plus jamais laisser passer ce type de régression.

- **`tests/rate-limit.test.js`** — limite de requêtes par IP et par identifiant, isolation entre IP différentes.

Ces tests tournent aussi automatiquement dans le CI/CD (GitHub Actions) à chaque `push`. La logique testée vit dans `src/03b-pure-logic.js` : un fichier volontairement sans DOM ni `localStorage`, pour pouvoir être exécuté tel quel par Node (voir le commentaire en tête de ce fichier pour le détail du fonctionnement).

## 2. Tester en local

Le projet a une fonction serverless (`/api/search.js`), donc un simple `Live Server` sur `index.html` ne suffira pas pour les appels API. Utilise la CLI Vercel :

```bash
npm i -g vercel
vercel dev
```

Cela lance un serveur local qui simule l'environnement Vercel (fichiers statiques + `/api`). Ouvre l'URL affichée (en général `http://localhost:3000`).

⚠️ **`vercel dev` ne relance pas automatiquement le build** (`npm run build`) à chaque modification. Si tu modifies un fichier dans `src/`, régénère `app.js` toi-même avant de tester :
```bash
npm run build:js
```

### Tests automatisés

```bash
npm test
```

Protège la logique la plus critique de l'app contre une régression future :
- **Calcul du score** (`tests/score.test.js`) : mode rapide, mode détaillé (moyenne pondérée), conversion en étoiles.
- **Fusion de la synchro cloud** (`tests/merge-logic.test.js`) : union de films différents, résolution de conflit (le plus récent gagne), suppressions respectées (tombstones), pas de doublons.
- **Rate limiting de l'API** (`tests/rate-limit.test.js`) : blocage au-delà de la limite, compteurs indépendants par IP/par code.

Cette logique vit dans `src/03b-pure-logic.js` — un fichier volontairement sans DOM ni `localStorage`, pour pouvoir être testé avec Node directement (sans navigateur). Le reste du code (lecture de sliders, écriture à l'écran...) reste dans les fichiers habituels et appelle ces fonctions pures.

Ces tests tournent aussi automatiquement dans le CI/CD (voir plus bas) à chaque `push`.

## 3. Passage sur GitHub

Depuis le terminal intégré de VS Code, à la racine de `ludex/` :

```bash
git init
git add .
git commit -m "Initial commit: structure Ludex Rating Companion"
```

Puis crée un dépôt vide sur https://github.com/new (sans README ni .gitignore, pour éviter les conflits), et lie-le :

```bash
git branch -M main
git remote add origin https://github.com/<ton-utilisateur>/<nom-du-repo>.git
git push -u origin main
```

`.env` est ignoré par Git (voir `.gitignore`) : ta clé API ne partira jamais sur GitHub.

## 4. Déploiement sur Vercel

1. Va sur https://vercel.com/new et importe le dépôt GitHub que tu viens de créer.
2. Vercel détecte automatiquement :
   - les fichiers statiques à la racine (`index.html`, `styles.css`, `app.js`) ;
   - `api/search.js` comme fonction serverless (Node.js).
3. **Avant de déployer**, ajoute la variable d'environnement dans l'écran de configuration du projet (ou après, dans `Settings > Environment Variables`) :
   - Nom : `TMDB_KEY`
   - Valeur : ta clé TMDb
   - Environnements : Production, Preview, Development
4. Clique sur **Deploy**.

Chaque nouveau `git push` sur `main` redéploiera automatiquement en production ; chaque push sur une autre branche/PR génère un déploiement de preview isolé.

## Points à vérifier

- Le endpoint `/api/search` gère 5 cas via des query params (`query`, `id`, `providers`, `img`, `recommendations`), avec mise en cache CDN adaptée à chaque type de donnée.
- `app.js` est généré depuis `src/` à chaque build — voir la section "Structure du projet" plus haut si tu ajoutes du code.
