# Ludex Rating Companion

App de notation de films (recherche TMDb, fiche film, watchlist, providers de streaming BE) — front-end statique + une fonction serverless Vercel qui fait office de proxy vers l'API TMDb.

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique des versions.

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

### Régression visuelle (captures d'écran)

`tests/e2e/visual-regression.spec.js` compare des captures d'écran contre des références commitées (`tests/e2e/visual-regression.spec.js-snapshots/`) — attrape les régressions de PIXEL (une couleur qui change par erreur) qu'aucun test comportemental ne voit. Couvre 2 vues stables (Noter, Historique) × 4 thèmes.

**Limite honnête** : Chromium headless ≠ Mobile Safari — ces captures attrapent les régressions *relatives* (« ça a changé depuis la dernière fois »), pas la fidélité absolue au rendu sur un vrai iPhone.

**Si le test échoue après un changement visuel VOULU** (pas un bug) : régénère les références —
```powershell
npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots
```
puis commit les `.png` mis à jour. Si le test échoue et que rien n'a été changé intentionnellement, c'est une vraie régression à corriger, pas à ignorer.

**Risque connu** : les références ont été générées dans un environnement Linux (le même genre que le runner GitHub Actions), mais un rendu de police légèrement différent entre environnements reste possible. Une tolérance de 2 % (`maxDiffPixelRatio`) absorbe l'anti-aliasing mineur ; si la CI échoue sans changement visuel réel, régénère les références *depuis la CI elle-même* plutôt qu'en local.

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
- **`tests/e2e/error-log.spec.js`** — une vraie erreur JS non interceptée est journalisée (sans toucher aux données de films), un avertissement s'affiche une seule fois même en cascade, et le journal est visible/copiable depuis Réglages.
- **`tests/e2e/sync-error-messages.spec.js`** — la synchro cloud distingue maintenant une vraie coupure réseau, une erreur API précise (ex: limite de requêtes) et un échec générique du service : trois messages différents et exacts, plus jamais un « vérifie ta connexion » générique qui blâme l'utilisateur à tort.
- **`tests/e2e/api-error-honesty.spec.js`** — même correctif étendu à la recherche principale, la recherche watchlist et le sélecteur d'affiches : une vraie erreur API (statut non-200) est maintenant détectée et affichée avec son vrai message, au lieu d'être silencieusement traitée comme « aucun résultat ».
- **`tests/e2e/duels-reset.spec.js`** — réinitialiser les duels depuis Réglages (avec confirmation obligatoire) efface classement/cotes/paires jouées sans toucher aux films ni aux notes ; annuler ne touche à rien. A aussi révélé et corrigé un bug de z-index (une confirmation déclenchée depuis une modale déjà ouverte se retrouvait sous elle, boutons incliquables).
- **`tests/e2e/feature-flags.spec.js`** — les 4 bascules (Duels, Quiz du jour, Carrousel tendances, Recommandations Découvrir) masquent/affichent bien leur section, sans jamais toucher aux données sous-jacentes ; la préférence persiste après rechargement ; réactiver fait réapparaître immédiatement sans recharger la page. A aussi révélé et corrigé un bug de rendu (Duel du jour se rendait au chargement quel que soit l'onglet actif, créant des éléments dupliqués qui cassaient d'autres tests).
- **`tests/e2e/accessibility.spec.js`** — audit automatisé axe-core sur les 5 onglets principaux (× thèmes défaut et Technicolor), la fiche film, la fiche personne et la modale de confirmation. Zéro violation sérieuse/critique restante. A fait remonter et corriger : bascules/curseurs/poids sans nom accessible (13 éléments), contraste insuffisant (splash, VS des duels, bouton danger), dialogues sans nom quand vides, et un vrai bug — les cartes de l'historique avaient un rôle bouton sans AUCUNE activation clavier (Entrée/Espace ne faisait rien), en plus d'englober d'autres boutons (violation d'imbrication ARIA) ; restructuré pour isoler la zone cliquable et ajouté la gestion clavier manquante.
- **`tests/e2e/visual-regression.spec.js`** — captures d'écran comparées à des références commitées (Noter, Historique × 4 thèmes) : attrape les régressions de pixel qu'aucun test comportemental ne voit. Voir la section dédiée plus haut pour le workflow de mise à jour des références.
- **`tests/e2e/offline-full.spec.js`** — parcours hors-ligne RÉEL (pas une requête mockée) : installe le service worker en ligne d'abord, bascule vraiment hors-ligne, recharge la page, vérifie que le shell vient du cache, que chaque onglet reste utilisable, que le badge hors-ligne s'affiche, et qu'aucune erreur JS ni entrée de journal d'erreurs n'apparaît sur tout le parcours. Vérifie aussi qu'une action purement locale (supprimer un film) fonctionne intégralement sans réseau.
- **`tests/e2e/wrapped-share.spec.js`** — vérifie deux fonctionnalités existantes mais jamais testées jusqu'ici : la carte de profil partageable et la Rétrospective annuelle façon Wrapped (5 slides, navigation, canvas final). Confirme que chaque canvas dessine du vrai contenu (pas vide) et que le téléchargement produit un PNG valide. A aussi révélé et corrigé un petit défaut : la carte d'entrée de la Rétrospective restait visible même avec un historique vide.
- **`tests/e2e/theme-signatures.spec.js`** — mis à jour pour les 7 thèmes actuels (Scuderia/Anderson retirés du test, Carnet et Moderne ajoutés).
- **`tests/e2e/visual-regression.spec.js`** — thème Scuderia remplacé par Méridien dans la boucle ; corrigé au passage un bug de timing (attente fixe de 300ms au lieu d'attendre la vraie disparition de l'écran de démarrage, causant un faux échec aléatoire).
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
- **`tests/e2e/duels.spec.js`** — parcours complet des duels : cotes mises à jour symétriquement, passer un duel ne touche à rien, message clair avec moins de 2 films, podium avec médailles, deux films déjà affrontés ne se recroisent jamais (état « tous les duels joués » quand c'est épuisé), points ELO non affichés, rangs 4-10 sous accordéon fermé par défaut.
- **`tests/e2e/badges-fold.spec.js`** — les badges du profil sont pliés par défaut (compteur x/y visible), et se déplient au clic.
- **`tests/e2e/lots-cde.spec.js`** — duel du jour jouable une seule fois par jour (alimente le même classement), le départage priorise deux films de même note jamais affrontés, chercher « 199 » filtre l'historique par décennie 1990, le badge hors-ligne apparaît/disparaît avec le réseau.
- **`tests/e2e/theme-signatures.spec.js`** — boucle sur tous les thèmes du sélecteur (chacun s'applique et définit son fond) + sondes des touches signatures (noir : affiches en N&B et vignettage ; scuderia : bande rouge latérale ; anderson : double encadrement).
- **`tests/e2e/swipe-confirm.spec.js`** — via de vrais TouchEvents : swiper une carte de l'historique puis taper la zone révélée supprime bien le film (au lieu d'ouvrir sa fiche — le bug corrigé), et taper ailleurs sur la carte armée annule proprement.
- **`tests/e2e/premium-polish.spec.js`** — le meta theme-color suit le thème actif (barre de statut iOS assortie), les polices sont chargées depuis le head avec préconnexion.
- **`tests/e2e/error-states.spec.js`** — panne réseau sur la fiche film : l'état d'erreur dessiné apparaît (message + bouton), et « Réessayer » recharge la fiche complète une fois le réseau revenu.
- **`tests/e2e/poster-picker.spec.js`** — le sélecteur d'affiche : choisir une variante la persiste dans l'historique (URL w185), rafraîchit la fiche (w342) et ferme la modale ; le bouton n'apparaît pas pour un film hors collection. Vérifie aussi que chaque affiche s'affiche en entier (object-fit: contain, pas de rognage). Vérifie aussi que chaque case a une hauteur réelle exacte (2:3 en pixels calculés par JS, plus de cases tronquées). Deux tests de non-régression pour le bug signalé : le choix tient bon après fermeture/réouverture de la fiche (pas seulement avant), et fonctionne aussi pour un film seulement en watchlist (pas encore noté).
- **`tests/e2e/hist-uniform.spec.js`** — cartes d'historique à hauteur uniforme malgré des genres/acteurs très longs (lignes bornées avec ellipse) ; filtre genre plié par défaut avec le genre actif toujours visible, filtrage fonctionnel après dépliage. Verifie aussi le cas reel signale (tag "À la maison" sur une seule carte : memes hauteurs).
- **`tests/e2e/xss.spec.js`** — un titre de film piégé (balise img avec onerror, script dans la critique) s'affiche partout comme texte et ne s'exécute jamais — historique, toast coup de cœur.
- **`tests/e2e/targeted-render.spec.js`** — renderStats() (radar/timeline/heatmap/badges/décennies) est différé tant que l'onglet Profil n'est pas visible, et rattrapé dès qu'on y bascule ; aucun retard si on reste sur Profil.
- **`tests/e2e/drag-fluidity.spec.js`** — la transition CSS est bien désactivée (0s) pendant un glissement actif de l'historique, mesurée en plein geste, et restaurée au relâchement.
- **`tests/e2e/watchlist-swipe.spec.js`** — corrigé pour désactiver l'écran d'accueil avant d'agir (le test était intermittent sur un état vraiment vierge, indépendamment du reste de ce travail).
- **`tests/migrations.test.js`** — normalisation v2 des items d'historique : champs garantis (savedAt, values, title), époque neutre plutôt que « maintenant », idempotence (rejouer = aucun changement), pas de mutation de l'original.
- **`tests/e2e/migrations.spec.js`** — des données ancienne forme sont migrées au chargement (version posée à 2, sauvegarde pré-migration contenant l'état d'avant, données normalisées, app fonctionnelle) ; des données à jour ne relancent rien.
- **`tests/e2e/ux-polish.spec.js`** — l'aperçu du geste de swipe se joue une seule fois à la première visite de l'historique ; l'en-tête de la fiche film garde toujours un fond opaque (teinté ou non).
- **`tests/letterboxd-import.test.js`** — parseur CSV (virgules dans les titres, guillemets doublés, CRLF, retours à la ligne dans un champ) et mapping Letterboxd (note /5 -> /10, détection diary/ratings/watched par l'en-tête, lignes sans titre ignorées).
- **`tests/e2e/letterboxd-import.spec.js`** — import réel d'un diary.csv (fusion, doublons ignorés, conversion des notes, titre à virgule intact) ; bannière de rappel de sauvegarde après 30 jours, retirée après export.
- **`tests/e2e/profile-cards.spec.js`** — la carte "Ton profil" (membre depuis, temps visionné) se remplit bien, tout comme la heatmap calendrier, les décennies et "Il y a un an" — protège aussi contre la régression du doublon de fonction qui avait silencieusement cassé la première.

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

### Minification au déploiement

`vercel.json` exécute `npm run build && node scripts/minify-for-deploy.js`. La seconde étape minifie `app.js` et `styles.css` (Terser + clean-css) **uniquement dans l'environnement de build Vercel** — mesuré : ~95 Ko → ~48 Ko gzippé pour le JS, ~45 Ko → ~29 Ko pour le CSS, soit environ moitié moins de données à charger sur le premier accès (avant que le service worker ne mette tout en cache).

Le fichier `app.js` commité dans Git reste volontairement lisible (utile pour les diffs et les revues) : cette étape ne touche jamais aux fichiers du dépôt, seulement à la copie éphémère que Vercel sert aux utilisateurs. La CI (`npm run build:js`, sans la minification) continue de comparer contre cette version lisible.

## Points à vérifier

- Le endpoint `/api/search` gère 5 cas via des query params (`query`, `id`, `providers`, `img`, `recommendations`), avec mise en cache CDN adaptée à chaque type de donnée.
- `app.js` est généré depuis `src/` à chaque build — voir la section "Structure du projet" plus haut si tu ajoutes du code.
