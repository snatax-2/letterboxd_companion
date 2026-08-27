# Ludex Rating Companion

Application personnelle de notation et de suivi de films et séries : historique détaillé, watchlists multiples, progression par saison, profil, analyses et synchronisation facultative entre appareils. Le navigateur conserve les données localement ; des fonctions Vercel servent de proxy vers TMDb/Gemini et de passerelle vers Supabase.

Application en ligne : [https://ludex-three.vercel.app/](https://ludex-three.vercel.app/)

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique des versions.

## Structure du projet

```
ludex/
├── index.html            → structure de la page
├── bootstrap.js          → thème initial, polices à la demande et métriques Vercel
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
│   ├── 06a-history-list.js    → historique : liste, recherche, tri, filtre par genre
│   ├── 06b-history-actions.js → historique : toast, feuille d'action, appui long
│   ├── 06c-profile-stats.js   → profil : statistiques, dashboard, renderAll()
│   ├── 06d-profile-share-cards.js → profil : cartes à partager (dessin canvas, Wrapped)
│   │   (issus du découpage de l'ancien 06-history.js, 1698 lignes/6 responsabilités —
│   │    voir CHANGELOG pour le détail de la répartition)
│   ├── 07-data-io.js          → export / import
│   ├── 08-watchlist.js        → watchlist
│   ├── 09-modal-init.js       → modale de confirmation & initialisation
│   ├── 10-cloud-sync.js       → synchronisation cloud (sauvegarde/restauration)
│   ├── 11-discover.js         → onglet "Découvrir"
│   ├── 12-movie-detail.js     → fiche film
│   ├── 13-duels.js            → classement personnel par duels ELO
│   ├── 17-film-analysis.js    → analyses personnelles et retour Gemini optionnel
│   ├── 18-tv-shows.js         → suivi des séries et saisons
│   └── 19-tv-detail.js        → fiche série
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
│   ├── analyse-film.js     → mentor filmique Gemini, optionnel
│   └── sync.js             → fonction serverless Vercel (synchro cloud Supabase)
├── .github/workflows/ci.yml → vérifications automatiques (build, tests, syntaxe) à chaque push
├── package.json
├── vercel.json
├── .gitignore
└── .env.example           → variables d'environnement documentées
```

### Pourquoi `app.js` est généré

Le fichier faisait à l'origine ~1750 lignes en un seul bloc. Le code est maintenant réparti dans `src/`, mais le navigateur charge toujours un seul fichier classique `app.js` (pas de modules ES, aucun risque de casser l'ordre d'exécution existant). Le script `scripts/build-app-js.js` recolle les fichiers de `src/` bout à bout, dans l'ordre de leur préfixe numérique (`00-`, `01-`, `02-`...), pour reproduire exactement le même comportement qu'avant le découpage.

**Règle à retenir : ne jamais éditer `app.js` directement**, il serait écrasé au prochain build. Édite le fichier concerné dans `src/`, puis régénère avec :
```bash
npm run build:js
```

**`app.js` n'est pas commité** (il est dans `.gitignore`) : c'est un pur artefact de build, dont le diff est par construction la somme des diffs de `src/`. Après un `git clone`, il faut donc le construire une fois avant de servir le site en local — `npm run build:js`, ou n'importe quelle commande qui en dépend (`npm run lint`, `npm run check:load`, `npm run test:e2e` le construisent automatiquement).

> **Pourquoi ce choix.** `app.js` était commité, et le CI vérifiait qu'il correspondait bien à `src/`. Une version *minifiée* s'y est retrouvée commitée (via `scripts/minify-for-deploy.js`, qui minifie en place) : la vérification a échoué à chaque push pendant 12 jours, et comme les étapes suivantes du workflow en dépendaient, **le lint, les 162 tests unitaires et les 90 specs e2e ont été sautés à chaque fois**. Ne plus commiter l'artefact supprime définitivement cette classe de panne.

Vercel construit `app.js` à chaque déploiement (`npm run build`, voir `vercel.json`), et le CI fait de même avant de lancer les vérifications.

### Minification (`scripts/minify.js`)

`npm run build` minifie aussi `app.js` (en place) et génère `styles.min.css` à partir de `styles.css` — un gain mesuré de -47% sur le JS et -34% sur le CSS. **Règle à retenir : `styles.css` reste la source à éditer** (comme avant), c'est `styles.min.css` qui est réellement chargé par `index.html` et mis en cache par le service worker. Ne jamais éditer `styles.min.css` directement, il serait écrasé au prochain build — exactement la même règle que pour `app.js`.

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

Permet de sauvegarder l'état personnel complet (films, séries, listes films/séries, analyses, duels et réglages) et de le retrouver sur un autre appareil via un code secret. L'export JSON manuel utilise le même schéma versionné et reste recommandé comme sauvegarde indépendante.

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
6. Dans l'app, ouvre les réglages (⚙️) → section "Synchronisation cloud" → clique **Générer un code sûr** → **Copier le code** → **Sauvegarder maintenant**.
7. Sur un autre appareil/navigateur, ouvre les réglages, colle le **même code**, clique **Restaurer depuis le cloud**.

La clé `service_role` ne quitte jamais le serveur (elle est utilisée uniquement dans `api/sync.js`, jamais envoyée au navigateur) — c'est cette fonction serverless qui fait l'intermédiaire entre l'app et Supabase.

### Le code de synchronisation est un secret, pas un pseudo

Il n'y a pas de compte ni de mot de passe : **le code SEUL donne accès aux données**. Qui le connaît peut lire ton historique complet (films, notes, critiques écrites) et l'écraser. C'est le même modèle qu'un lien de partage secret.

Trois garde-fous sont en place :

- **Un nouveau code doit faire au moins 16 caractères.** Le bouton *Générer un code sûr* en produit un de 26 caractères tirés au hasard (`crypto.getRandomValues`, jamais `Math.random`). Un code court et mémorisable — `dario`, `films`, `test` — se devine en quelques secondes ; c'est précisément ce que le minimum empêche.
- **Le code n'est jamais stocké en clair.** La ligne Supabase est indexée par `sha256(code)`. Si la base fuite, aucun code utilisable n'en sort. *Aucune migration SQL n'est nécessaire* : la colonne `sync_code` contient simplement un hash désormais.
- **Le code voyage dans un en-tête** (`X-Sync-Code`), plus dans l'URL — une query string finit dans les journaux d'accès et les caches. Le `?code=` reste accepté en repli le temps que les service workers servant une ancienne version de `app.js` soient remplacés.

**Si tu utilisais déjà un code court**, il continue de fonctionner : tes données restent accessibles, et la ligne migre automatiquement vers sa forme hachée à la première sauvegarde (l'ancienne ligne en clair est alors supprimée). Mais **tant que tu gardes ce code court, il reste devinable** — l'app affiche un avertissement dans les réglages. Pour le remplacer : *Générer un code sûr*, puis *Sauvegarder maintenant*, puis recopie le nouveau code sur tes autres appareils. Note l'ancien quelque part d'abord si tu as un doute.

## Tests automatisés

La logique la plus critique de l'app (calcul du score, fusion de la synchro cloud, rate limiting de l'API) est couverte par des tests automatisés, sans dépendance externe (juste `node:test`, intégré à Node.js).

```bash
npm test
```

Ce que ça couvre :
- **`tests/score.test.js`** — calcul du score en mode rapide et en mode détaillé (moyenne pondérée), conversion en étoiles.
- **`tests/tv-show-average.test.js`** — note globale d'une série (module Séries, Phase 3) : moyenne des saisons notées uniquement, jamais stockée toujours recalculée, une saison suivie mais non notée n'entre pas dans le calcul.
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
- **`tests/e2e/jetons-semantiques.spec.js`** — non-régression sur le design system lui-même (phase 7 de l'audit) : sur les 6 thèmes, vérifie que les jetons requis sont définis et non vides, que les paires sémantiques restent visuellement distinctes (les deux séries du graphique mensuel, fond/carte, carte/bordure, texte/fond — comparaison sur la couleur RÉSOLUE par le navigateur, pas sur la chaîne CSS), et que les trois niveaux d'élévation diffèrent bien entre eux. C'est le filet qui manquait quand `--gold` et `--blue` se sont retrouvés identiques sur le thème par défaut, rendant le graphique illisible.
- **`tests/e2e/offline-full.spec.js`** — parcours hors-ligne RÉEL (pas une requête mockée) : installe le service worker en ligne d'abord, bascule vraiment hors-ligne, recharge la page, vérifie que le shell vient du cache, que chaque onglet reste utilisable, que le badge hors-ligne s'affiche, et qu'aucune erreur JS ni entrée de journal d'erreurs n'apparaît sur tout le parcours. Vérifie aussi qu'une action purement locale (supprimer un film) fonctionne intégralement sans réseau. Fusionné (phase 6 de l'audit, ex-`lots-cde.spec.js`) : le badge apparaît/disparaît bien avec l'état réseau, indépendamment du reste du parcours.
- **`tests/e2e/desktop-layout.spec.js`** — verrouille le correctif d'affichage PC : le carrousel Tendances (10 films) ne fait plus deborder la page en largeur bureau (1440px), et aucun chevauchement entre les deux colonnes sur les 4 onglets. Mis a jour pour le nouveau systeme d'onglets unique (remplace la grille a deux colonnes) : verifie la barre a 5 onglets et qu'un seul onglet est visible a la fois. Fusionné (phase 6 de l'audit, ex-`phase4-desktop-layout.spec.js`) : actions d'une carte d'historique atteignables à la souris, pas de mise en page multi-colonnes qui masque des films, largeur du conteneur à 1100px, mobile inchangé, zéro violation d'accessibilité sur les 6 thèmes en largeur desktop.
- **`tests/e2e/curated-lists.spec.js`** — listes prédéfinies "Classiques à explorer" : rendu de la carte (12 listes), calcul du pourcentage vu par décennie, ouverture de la feuille détail avec la bonne grille (vus/manquants), raccourci Découvrir → Profil, ajout en masse des manquants à la watchlist.
- **`tests/e2e/saga.spec.js`** — bande des autres films de la saga en bas de la fiche film (belongs_to_collection TMDb), et ouverture de la fiche saga complète (grille, % vu) en cliquant le lien "Voir la saga complète".
- **`tests/e2e/curated-studios.spec.js`** — accordéon "Par studio" dans Classiques à explorer (A24, Ghibli, Pixar, Blumhouse, Marvel Studios — identifiants TMDb vérifiés), avec un test dédié qui verrouille le correctif d'année manquante (voir plus bas).
- **`tests/e2e/curated-countries.spec.js`** — carte du monde stylisée dans Classiques à explorer : 8 pastilles-pays affichées, pourcentage vu correct, ouverture de la fiche pays au clic sur une pastille.
- **`tests/e2e/theme-explorer.spec.js`** — exploration par thème dans Découvrir (mots-clés TMDb) : 8 puces affichées, ouverture d'une fiche thème sans barre de complétion ni bouton d'ajout en masse (esprit découverte, pas collection), clic sur un film ouvre bien sa fiche.
- **`tests/e2e/on-this-day.spec.js`** — "Ce jour-là" dans Découvrir : affiche les anniversaires ronds trouvés avec leur badge ("Il y a X ans"), clic ouvre la fiche du film ; section entièrement masquée si aucun anniversaire n'est trouvé ce jour-là.
- **`tests/e2e/blind-spots.spec.js`** — "D'après tes goûts" dans Découvrir : résolution réalisateur→id TMDb à partir de 3 films notés haut du même réalisateur, agrégation correcte de la moyenne et du nombre de films manquants, ouverture de la fiche personne au clic ; section masquée si l'historique est vide ou si moins de 2 films partagent un même réalisateur.
- **`tests/e2e/film-analysis.spec.js`** — module Analyse de film : boucle complète (écrire → envoyer → recevoir un retour structuré → garder une trace en stockage local, persistante après fermeture/réouverture de la fiche), validation côté client (champs vides bloqués avant tout appel réseau), et message d'erreur précis du serveur qui atteint bien l'utilisateur. Complété (Phase 4) : spinner visible pendant le chargement et disparu après, bouton résistant à plusieurs envois successifs (verrouille le correctif du bug d'écrasement d'élément trouvé en construisant cette finition).
- **`tests/e2e/epuration-entete-notation-profil.spec.js`** (ex-`design-audit-fixes.spec.js`, renommé phase 6 de l'audit) — correctifs issus de l'audit design : Export/Import déplacés dans Profil et fonctionnels, badge "Mode détaillé" en double retiré sans casser le changement de mode, sous-titre "Contexte de visionnage", chevron qui pivote sur "Personnaliser les pondérations", texte "Noter" intégré au cercle (plus de libellé externe), zéro violation d'accessibilité sérieuse sur les deux vues affectées.
- **`tests/e2e/recherche-bouton-effacer.spec.js`** (ex-`ux-polish-round2.spec.js`, renommé phase 6 de l'audit) — bouton d'effacement fonctionnel sur les champs de recherche (formulaire de notation + historique, avec vérification que ça filtre bien la liste), zéro violation d'accessibilité sur le champ de recherche et la fenêtre modale avec verre dépoli.
- **`tests/e2e/notation-detaillee-a11y.spec.js`** (ex-`full-ux-audit.spec.js`, renommé phase 6 de l'audit) — zéro violation d'accessibilité sérieuse sur les 6 thèmes avec une vraie note en mode détaillé (révèle des éléments que les tests plus étroits ne couvraient pas), et vérifie qu'un champ `item.stars` manquant n'affiche jamais le mot "undefined" dans l'Historique.
- **`tests/e2e/tv-notation-saisons.spec.js`** (ex-`tv-shows-phase3.spec.js`, renommé phase 6 de l'audit) — notation de saison : libellés et descriptions adaptés pour les 2 critères reformulés, sauvegarde et préremplissage au retour sur une saison, note globale de série calculée automatiquement (moyenne des saisons notées, exclut les non notées), zéro violation d'accessibilité sur les 7 thèmes.
- **`tests/e2e/profil-kpi-films-series.spec.js`** (ex-`tv-shows-phase5.spec.js`, renommé phase 6 de l'audit) — statistiques du tableau de bord : bascule Films/Séries, comptage et moyenne par série (pas par saison), radar avec libellés adaptés ("Final", "Cohérence"), Top Réalisateurs caché en mode Séries, distribution des notes, zéro violation d'accessibilité sur les 7 thèmes.
- **`tests/e2e/tv-shows-continue-widget.spec.js`** — widget "En cours" (onglet Noter, mode Série) : affiche le bon prochain épisode non vu, synopsis dépliable, validation qui passe à l'épisode suivant, détection automatique de la saison suivante une fois une saison terminée, série sans suite qui disparaît proprement, widget absent sans série en cours ou en mode Film, zéro violation d'accessibilité sur les 7 thèmes. Inclut aussi une vérification de non-régression sur l'ombre du bouton Noter dans la barre de navigation (ne doit plus déborder sur les onglets voisins). Fusionné (phase 6 de l'audit, ex-`tv-shows-phase2.spec.js`) : le bandeau de fin de saison s'affiche en cochant le dernier épisode depuis le widget, se referme sans revenir seul, et décocher un épisode depuis la fiche série retire bien la progression.
- **`tests/e2e/tv-shows-history-parity.spec.js`** — parité Historique films/séries (1ère vague) : filtre par note branché sur les séries avec badge filtré correct, suppression d'une seule saison sans toucher aux autres, suppression de la dernière saison qui retire toute la série avec message adapté, zéro violation d'accessibilité sur les 7 thèmes. Fusionné (phase 6 de l'audit, ex-`tv-shows-phase4.spec.js`) : badge à deux compteurs, note globale de carte, réouverture d'une saison depuis la fiche détail (préremplissage vérifié), suppression d'une série avec confirmation.
- **`tests/e2e/tv-shows-genre-filter.spec.js`** — parité Historique films/séries (2e vague) : genre capturé directement à la sélection d'une série, récupération silencieuse en arrière-plan pour les séries déjà suivies avant ce correctif, filtre fonctionnel, zéro violation d'accessibilité sur les 7 thèmes.
- **`tests/e2e/tv-shows-swipe-gesture.spec.js`** — glissement sur les lignes de saison (Historique) : glisser à gauche puis confirmer supprime, glisser à droite puis confirmer rouvre pour noter, un glissement sous le seuil revient à sa place sans rien déclencher, le bouton visible fonctionne toujours en plus du geste, zéro violation d'accessibilité sur les 6 thèmes.
- **`tests/e2e/tv-shows-card-swipe.spec.js`** — glissement sur la carte de série entière (pas juste une saison), sans avoir à déplier : glisser à gauche puis confirmer supprime toute la série (réutilise la même fenêtre de confirmation que le bouton visible), un glissement trop court ne déclenche rien, aucun conflit avec le glissement des lignes de saison individuelles, zéro violation d'accessibilité sur les 6 thèmes.
- **`tests/e2e/nav-primary-shadow.spec.js`** — verrouille la correction de l'ombre du bouton "Noter" (flou et opacité plafonnés) pour éviter qu'elle ne re-dérive silencieusement vers une valeur trop large lors d'un futur ajustement.
- **`tests/tv-merge-logic.test.js`** — fusion cloud des séries (`mergeTvShows`) : ajout d'une série absente d'un côté, priorité à la note la plus récente quand la même saison existe des deux côtés, tombstone de série entière et de saison individuelle respectés, série sans plus aucune saison retirée du résultat.
- **`tests/e2e/tv-export-sync.spec.js`** — export manuel inclut vraiment les séries (plus seulement les films), import de l'ancien format (tableau simple) reste rétrocompatible, import du nouveau format fusionne films et séries sans écraser les données locales déjà présentes.
- **`tests/e2e/watchlist-a11y-fix.spec.js`** — correction du bouton imbriqué dans un `role="button"` sur les cartes de la watchlist (trouvé lors d'un audit complet, sans rapport avec les séries) : zéro violation d'accessibilité sur les 6 thèmes, ouvrir la fiche et les boutons Noter/Retirer fonctionnent toujours indépendamment.
- **`tests/e2e/historique-filtres-et-cibles-tactiles.spec.js`** (ex-`ux-design-audit-fixes.spec.js`, renommé phase 6 de l'audit) — cibles tactiles agrandies (étiquettes de contexte, filtres de tri, boutons pas-à-pas, bouton réglages) avec vérification de la zone tactile réelle par clic décalé, filtres de tri masqués quand il n'y a rien à trier (film et série), coquille "Twin Peaks" corrigée dans le placeholder du champ film, zéro violation d'accessibilité sur les 6 thèmes.
- **`tests/e2e/profil-etats-vides.spec.js`** (ex-`profile-empty-state-fixes.spec.js`, renommé phase 6 de l'audit) — points du Profil laissés de côté lors de l'audit précédent, traités ensuite : le radar ne réserve plus 160px vides à l'écran (se replie proprement, reprend sa taille dès que des notes détaillées existent), "Distribution des notes" (devenue "Activité mensuelle") affiche un message au lieu de barres à zéro, le bouton "Télécharger l'image" se désactive quand la carte est verrouillée et se réactive avec de vraies données, zéro violation d'accessibilité sur les 6 thèmes (profil vide). Fusionné (ex-`phase3-ui-fixes.spec.js`) : les états vides compacts du Profil et les états vides riches de l'Historique restent corrects après migration.
- **`tests/e2e/posters-tmdb-image.spec.js`** (ex-`design-tokens-phase1.spec.js`, renommé phase 6 de l'audit) — les affiches et photos se chargent correctement via la fonction `tmdbImage()` centralisée (recherche, fiche film, fiche série, casting), une affiche manquante ne casse rien plutôt que d'afficher "undefined" dans l'URL.
- **`tests/e2e/bascule-films-series-transitions.spec.js`** (ex-`phase2-ux-fixes.spec.js`, renommé phase 6 de l'audit) — l'espace vide de "Suggestions pour toi" (Découvrir) se réduit à une hauteur modeste au lieu de réserver 580px pour un simple message, restaure sa hauteur normale dès qu'une vraie suggestion existe ; la transition en fondu au changement d'onglet (Historique, Noter, Profil) laisse toujours le contenu final pleinement visible et fonctionnel, zéro violation d'accessibilité sur les 6 thèmes avant et après transition.
- **`tests/e2e/decouvrir-vide-a11y.spec.js`** (extrait de `phase3-ui-fixes.spec.js`, phase 6 de l'audit — le reste a fusionné dans `profil-etats-vides.spec.js`) — zéro violation d'accessibilité sur l'écran Découvrir vide (aucune donnée locale), sur les 6 thèmes.
- **Phase 5 (extraction de code)** — pas de nouveau fichier de test dédié : le découpage de `06-history.js` en 4 fichiers (`06a` à `06d`) a été validé par la suite existante dans son ensemble (régression complète sur plus de 100 tests E2E touchant l'Historique, le Profil, les statistiques séries, et la rétrospective Wrapped), plutôt que par de nouveaux tests — un découpage de code ne change aucun comportement observable, c'est justement le but.
- **`tests/e2e/balayage-final-viewports-themes.spec.js`** (ex-`phase6-final-verification.spec.js`, renommé phase 6 de l'audit) — balayage complet des 5 écrans principaux sur les 6 thèmes, en mobile ET en desktop (12 combinaisons), zéro violation d'accessibilité sérieuse partout. Le test sur la diapositive d'onboarding qui interceptait les clics a fusionné dans `onboarding.spec.js`.
- **`tests/e2e/tv-shows-detail-sheet.spec.js`** — fiche série détaillée : en-tête, notes externes, créateurs, progression par saison (toutes les saisons TMDb avec statut correct : notée/en cours/non suivie), note globale, clic sur une saison ouvre Noter avec la bonne sélection, bouton "Noter / Suivre" pour une série jamais suivie, zéro violation d'accessibilité sur les 6 thèmes.
- **`tests/e2e/tv-shows-detail-parity.spec.js`** — parité fiche film/fiche série suite à l'audit : casting en vrai carrousel horizontal cliquable, en-tête qui rétrécit au défilement, glissement vers le bas pour fermer, créateurs cliquables, "Changer l'affiche" (bouton conditionnel + sauvegarde), série jamais suivie sans le bouton, zéro violation d'accessibilité sur les 6 thèmes. Inclut aussi la grille d'épisodes complète, désormais exclusive à cette fiche : dépliage à la demande par saison, cocher/rattrapage, mise à jour en direct du statut, bouton "Noter cette saison" qui apparaît une fois complète.
- **`tests/e2e/tv-shows-continue-widget-redesign.spec.js`** — refonte du widget En cours : rond à cocher à droite (plus de bouton pleine largeur), retirer une carte sans toucher aux données (revient au rendu suivant), mettre en pause avec indicateur persistant, repli/dépliage avec préférence mémorisée, hauteur de carte stable malgré un titre d'épisode très long, zéro violation d'accessibilité sur les 6 thèmes.
- **`tests/e2e/tv-shows-search-opens-detail.spec.js`** — chercher une série dans Noter ouvre directement sa fiche détaillée (plus de puces de saison), pastille "Commencer la série" démarre à la Saison 1, capture du genre préservée, widget En cours alimenté, fiche mise à jour sur place. Fusionné (phase 6 de l'audit, ex-`tv-shows-phase1.spec.js`) : version avec bascule Film/Série complète (retour vers Film après consultation) et scan d'accessibilité sur le flux.
- **`tests/e2e/guess-toggle.spec.js`** — bascule "Devine le Film du Jour" dans Réglages : désactivée avant ou pendant une devinette révèle directement le film ; réactivée restaure la devinette si la partie du jour n'a pas encore été jouée.
- **`tests/e2e/guess-game.spec.js`** — le mini-jeu "Devine le Film du Jour" (affiche floutée) : état initial, le flou se réduit à chaque essai raté, indices aux bons paliers (année puis genre), titre français ou original acceptés (accents/casse ignorés), victoire avec le bon décompte d'essais, défaite après 5 essais avec remise à zéro de la série, état "déjà joué" persistant après rechargement. Étendu après fusion avec Film du Jour : rien n'est visible (ni anecdote, ni faits, ni plateformes) pendant la devinette ; tout se révèle une fois gagné ou perdu ; une seule carte affichée (plus de section séparée en double).
- **`tests/e2e/guess-suggestions.spec.js`** — auto-suggestion de titres pendant la devinette (même recherche TMDb que la watchlist/notation, mais texte seul, sans affiche, pour ne jamais spoiler) : suggestions affichées dès 2 caractères, clic remplit le champ sans soumettre, clic en dehors ferme la liste, choisir une suggestion puis valider fonctionne normalement.
- **`tests/e2e/film-du-jour-source.spec.js`** — vérifie le système de tirage : un jour normal utilise le tirage élargi (`dailyPick`, toute la base TMDb suffisamment connue, pas les tendances), le mercredi bascule sur les vraies sorties en salle françaises (`weeklyRelease`) avec le titre "Sortie de la semaine". Contient le test qui a révélé le vrai bug : un rechargement de page (chemin en cache) appelait une fonction (`setFilmDuJourTitle`) qui n'était jamais définie nulle part — corrigé.
- **`tests/e2e/wrapped-share.spec.js`** — vérifie deux fonctionnalités existantes mais jamais testées jusqu'ici : la carte de profil partageable et la Rétrospective annuelle façon Wrapped (5 slides, navigation, canvas final). Confirme que chaque canvas dessine du vrai contenu (pas vide) et que le téléchargement produit un PNG valide. A aussi révélé et corrigé un petit défaut : la carte d'entrée de la Rétrospective restait visible même avec un historique vide.
- **`tests/e2e/theme-signatures.spec.js`** — mis à jour pour les 7 thèmes actuels (Scuderia/Anderson retirés du test, Carnet et Moderne ajoutés).
- **`tests/e2e/visual-regression.spec.js`** — thème Scuderia remplacé par Méridien dans la boucle ; corrigé au passage un bug de timing (attente fixe de 300ms au lieu d'attendre la vraie disparition de l'écran de démarrage, causant un faux échec aléatoire).
- **`tests/e2e/person-detail-sheet.spec.js`** — filmographie limitée au rôle principal, films déjà vus grisés, navigation vers la fiche film au clic.
- **`tests/e2e/keyboard-accessibility.spec.js`** — activation par Entrée/Espace des cartes cliquables (tendances, casting, filmographie...), focus déplacé à l'ouverture d'une fiche, piégeage du focus dans une fiche ouverte.
- **`tests/e2e/surprise-me.spec.js`** — le bouton "Surprends-moi" ouvre la fiche du film pioché, et affiche un message (sans planter) si aucun résultat.
- **`tests/e2e/onboarding.spec.js`** — l'accueil ne s'affiche qu'à un vrai nouvel utilisateur (aucune donnée), se parcourt en plusieurs étapes, et ne revient plus une fois vu (que ce soit terminé ou passé). Fusionné (phase 6 de l'audit, ex-`phase6-final-verification.spec.js`) : une fois fermée, aucune diapositive ne doit plus intercepter de clics ailleurs sur la page (bug réel corrigé, voir CHANGELOG).
- **`tests/e2e/header-scroll-check.spec.js`** — après défilement d'une fiche film, le bouton de fermeture reste visible et rien ne dépasse au-dessus de l'en-tête.
- **`tests/e2e/trailer-click-to-load.spec.js`** — la bande-annonce affiche une vignette cliquable, l'iframe ne se charge qu'au clic.
- **`tests/e2e/watchlist-picker.spec.js`** — choisir une liste existante (même si ce n'est pas la liste active) ajoute bien le film dedans ; créer une nouvelle liste à la volée fonctionne aussi.
- **`tests/e2e/daily-quiz.spec.js`** — quiz du jour : bonne réponse (confirmation + série), mauvaise réponse (série remise à zéro). Écrit pour ton environnement (celui où j'ai développé avait une restriction réseau propre à son bac à sable empêchant une vérification E2E fiable pour ce fichier précis — la logique a été validée séparément en détail).
- **`tests/e2e/technicolor-theme.spec.js`** — le thème Technicolor se sélectionne et applique bien ses couleurs (fond, rouge), sauvegardé correctement dans les réglages.
- **`tests/duels.test.js`** — cœur mathématique ELO : symétrie stricte des gains/pertes, sensibilité à l'écart de cotes, bornes, conservation de la somme du système.
- **`tests/e2e/duels.spec.js`** — parcours complet des duels : cotes mises à jour symétriquement, passer un duel ne touche à rien, message clair avec moins de 2 films, podium avec médailles, deux films déjà affrontés ne se recroisent jamais (état « tous les duels joués » quand c'est épuisé), points ELO non affichés, rangs 4-10 sous accordéon fermé par défaut. Fusionné (phase 6 de l'audit, ex-`lots-cde.spec.js`) : le départage privilégie deux films de même note jamais affrontés.
- **`tests/e2e/badges-fold.spec.js`** — les badges du profil sont pliés par défaut (compteur x/y visible), et se déplient au clic.
- **`tests/e2e/historique-recherche-decennie.spec.js`** (extrait de `lots-cde.spec.js`, phase 6 de l'audit — le départage a fusionné dans `duels.spec.js`, le badge hors-ligne dans `offline-full.spec.js`) — chercher « 199 » dans l'historique filtre par décennie 1990.
- **`tests/e2e/theme-signatures.spec.js`** — boucle sur tous les thèmes du sélecteur (chacun s'applique et définit son fond) + sondes des touches signatures (noir : affiches en N&B et vignettage ; scuderia : bande rouge latérale ; anderson : double encadrement).
- **`tests/e2e/swipe-confirm.spec.js`** — via de vrais TouchEvents : swiper une carte de l'historique puis taper la zone révélée supprime bien le film (au lieu d'ouvrir sa fiche — le bug corrigé), et taper ailleurs sur la carte armée annule proprement.
- **`tests/e2e/theme-color-meta-et-polices.spec.js`** (ex-`premium-polish.spec.js`, renommé phase 6 de l'audit) — le meta theme-color suit le thème actif (barre de statut iOS assortie), les polices sont chargées depuis le head avec préconnexion.
- **`tests/e2e/error-states.spec.js`** — panne réseau sur la fiche film : l'état d'erreur dessiné apparaît (message + bouton), et « Réessayer » recharge la fiche complète une fois le réseau revenu.
- **`tests/e2e/poster-picker.spec.js`** — le sélecteur d'affiche : choisir une variante la persiste dans l'historique (URL w185), rafraîchit la fiche (w342) et ferme la modale ; le bouton n'apparaît pas pour un film hors collection. Vérifie aussi que chaque affiche s'affiche en entier (object-fit: contain, pas de rognage). Vérifie aussi que chaque case a une hauteur réelle exacte (2:3 en pixels calculés par JS, plus de cases tronquées). Deux tests de non-régression pour le bug signalé : le choix tient bon après fermeture/réouverture de la fiche (pas seulement avant), et fonctionne aussi pour un film seulement en watchlist (pas encore noté).
- **`tests/e2e/hist-uniform.spec.js`** — cartes d'historique à hauteur uniforme malgré des genres/acteurs très longs (lignes bornées avec ellipse) ; filtre genre plié par défaut avec le genre actif toujours visible, filtrage fonctionnel après dépliage. Verifie aussi le cas reel signale (tag "À la maison" sur une seule carte : memes hauteurs).
- **`tests/e2e/xss.spec.js`** — un titre de film piégé (balise img avec onerror, script dans la critique) s'affiche partout comme texte et ne s'exécute jamais — historique, toast coup de cœur.
- **`tests/e2e/targeted-render.spec.js`** — renderStats() (radar/timeline/heatmap/badges/décennies) est différé tant que l'onglet Profil n'est pas visible, et rattrapé dès qu'on y bascule ; aucun retard si on reste sur Profil.
- **`tests/e2e/drag-fluidity.spec.js`** — la transition CSS est bien désactivée (0s) pendant un glissement actif de l'historique, mesurée en plein geste, et restaurée au relâchement.
- **`tests/e2e/watchlist-swipe.spec.js`** — corrigé pour désactiver l'écran d'accueil avant d'agir (le test était intermittent sur un état vraiment vierge, indépendamment du reste de ce travail).
- **`tests/migrations.test.js`** — normalisation v2 des items d'historique : champs garantis (savedAt, values, title), époque neutre plutôt que « maintenant », idempotence (rejouer = aucun changement), pas de mutation de l'original.
- **`tests/e2e/migrations.spec.js`** — des données ancienne forme sont migrées au chargement (version posée à 2, sauvegarde pré-migration contenant l'état d'avant, données normalisées, app fonctionnelle) ; des données à jour ne relancent rien.
- **`tests/e2e/fiche-film-entete-opaque.spec.js`** (ex-`ux-polish.spec.js`, renommé phase 6 de l'audit) — l'en-tête de la fiche film garde toujours un fond opaque (teinté ou non).
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
Si tu modifies `styles.css`, il faut le build complet pour régénérer `styles.min.css` (`build:js` seul ne suffit pas, il ne touche qu'au JS) :
```bash
npm run build
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

### Hook `commit-msg` (recommandé)

`.githooks/commit-msg` refuse un message de commit de moins de 15 caractères
ou correspondant à un gabarit générique (`wip`, `fix`, `update`...) — corrige
le relâchement constaté sur une série de commits sans aucune information
exploitable (audit qualité, phase 6). Pas activé par défaut (Git n'active
jamais un hook automatiquement depuis un dossier commité, pour des raisons de
sécurité) : à activer une fois par clone avec :

```bash
git config core.hooksPath .githooks
```

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
