# Changelog

Ce fichier documente les changements notables du projet, version par version.
Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
versionnage selon [Semantic Versioning](https://semver.org/lang/fr/)
(MAJOR.MINOR.PATCH — MAJOR = changement de schéma de données non
rétrocompatible, MINOR = nouvelle fonctionnalité, PATCH = correctif).

Ce fichier démarre à la version 1.1.0 : les versions antérieures n'ont pas été
tracées individuellement. Le [README](README.md) documente en détail chaque
fonctionnalité et son test associé pour qui veut l'historique complet.

## [Non publié]

### Corrigé
- **Phase 6 du plan d'exécution de l'audit expert — vérifications
  finales.** La phase la plus courte sur le papier, mais qui a débusqué
  le bug le plus subtil de tout ce travail.
  - **Un vrai bug d'interaction préexistant trouvé par le balayage
    final, invisible jusqu'ici** : une diapositive de la modale
    d'accueil (`.onboarding-slide.active`) recevait `pointer-events:
    auto` dès l'initialisation de la page — pas seulement à l'ouverture
    réelle de la modale, puisque la première diapositive est marquée
    "active" par défaut indépendamment de la classe `.open` du
    conteneur. Résultat : un élément totalement invisible (le
    conteneur parent a `opacity: 0` tant que la modale n'est pas
    ouverte) mais capable d'intercepter des clics ailleurs sur la
    page, à l'endroit précis où cette diapositive se trouve
    positionnée. Jamais détecté avant car cet endroit précis ne
    chevauchait aucun bouton testé jusqu'ici — la Phase 4 (largeur
    desktop) est ce qui a fait apparaître le chevauchement avec le
    bouton "Noter" de la barre de navigation, sur le thème Cinéphile en
    particulier. Corrigé en limitant `pointer-events: auto` à la
    diapositive active UNIQUEMENT quand la modale est réellement
    ouverte. Vérifié dans les deux sens : la modale reste inerte quand
    fermée, et le vrai parcours d'accueil pour un nouvel utilisateur
    fonctionne toujours normalement.
  - **2 vrais oublis de `loading="lazy"` trouvés et corrigés** (carte
    de série dans l'Historique, carte du widget "En cours") — des
    éléments de liste comparables à leurs équivalents films, qui eux
    l'avaient déjà. Une 3ᵉ image sans `loading="lazy"` (l'affiche à
    deviner du mini-jeu Découvrir) vérifiée et volontairement laissée
    telle quelle : c'est le contenu principal et immédiat de son
    écran, un cas d'exception légitime plutôt qu'un oubli.
  - **Taille du bundle vérifiée après les 5 phases précédentes** : 272
    Ko → 276 Ko de JS (+1,5 %), 128,5 Ko → 132 Ko de CSS (+3 %) — une
    croissance proportionnée à ce qui a été ajouté (8 icônes, une
    media query desktop, plusieurs fonctions partagées), pas un signe
    de duplication accidentelle.
  - **Balayage final** : les 5 écrans principaux × 6 thèmes × mobile et
    desktop (12 combinaisons), zéro violation d'accessibilité sérieuse
    partout, confirmé après correction du bug ci-dessus.

### Modifié
- **Phase 5 du plan d'exécution de l'audit expert — extraction de
  code.** Le point le plus mécanique du plan, mais avec le risque le
  plus élevé de casse silencieuse si mal fait.
  - **Tâche 5.1 (composant carte média partagé) volontairement
    abandonnée après vérification, pas ignorée** : le plan proposait une
    fonction `renderMediaCard()` partagée entre 4 endroits (carte film,
    carte série, carte Découvrir, résultat de recherche). En comparant
    réellement leur structure HTML avant de coder quoi que ce soit, ces
    4 cartes se sont révélées trop différentes pour une vraie
    abstraction commune (ligne riche avec critique dépliable vs agrégat
    de saisons vs carte pleine largeur façon Tinder vs simple ligne de
    résultat) — les forcer ensemble aurait créé plus de branches
    conditionnelles que ça n'en aurait simplifié, exactement ce que
    l'audit demandait d'éviter.
  - **`06-history.js` (1698 lignes, 6 responsabilités mêlées) scindé en
    4 fichiers** : `06a-history-list.js` (liste, recherche, tri,
    filtre), `06b-history-actions.js` (toast, feuille d'action),
    `06c-profile-stats.js` (statistiques, dashboard, `renderAll()`),
    `06d-profile-share-cards.js` (cartes à partager, dessin canvas,
    Wrapped). Découpage fait par tranches de lignes vérifiées une par
    une (pas par comptage d'accolades, peu fiable avec des littéraux de
    gabarit imbriqués), équilibre des accolades confirmé pour chaque
    morceau avant assemblage.
  - **Un vrai échec de test trouvé en régressant, pas ignoré** : 3 tests
    échouaient sur un défaut de contraste de l'écran de démarrage —
    tracé jusqu'à un délai d'attente de test à 500ms, inférieur à la
    durée minimale connue de 1200ms de cet écran. Un piège déjà
    rencontré et corrigé ailleurs dans ce projet ; celui-ci était resté
    non détecté jusqu'ici, probablement "chanceux" sur le timing exact
    jusqu'à ce que le découpage déplace légèrement l'ordre de
    concaténation. Corrigé dans le test, pas dans l'application.
  - **Tâche 5.3 (documenter la correspondance icône → usage)** :
    déjà faite pendant la Phase 3 sans que ce soit noté comme telle à
    l'époque — rien à ajouter.
  - Validé par régression complète sur plus de 100 tests E2E existants
    plutôt que par de nouveaux tests dédiés : un découpage de fichier ne
    change aucun comportement observable, c'est justement le but.

### Ajouté
- **Phase 4 du plan d'exécution de l'audit expert — responsive
  desktop.** Le point le plus lourd et le plus risqué du plan.
  - **Un vrai conflit trouvé avant de commencer, pas ignoré** : un
    commentaire dans le code a révélé qu'une mise en page desktop à deux
    colonnes existait avant, et avait été explicitement retirée à la
    demande de l'utilisateur ("un système d'onglets comme sur
    téléphone" plutôt que deux colonnes). Le plan original proposait
    justement de réintroduire ce type de scission — confirmé auprès de
    l'utilisateur avant de continuer plutôt que de défaire silencieusement
    un choix produit conscient. Décision retenue : garder le principe
    "un seul onglet à la fois", mais faire un usage réel de l'espace
    disponible *à l'intérieur* de chaque onglet plutôt que de scinder
    l'écran.
  - **Conteneur élargi à 1100px** à partir de 1024px (contre 800px
    avant, plafonné à toutes les tailles).
  - **Historique / À voir en disposition "masonry"** (colonnes CSS)
    plutôt qu'une grille classique — les cartes ont des hauteurs
    variables (avec ou sans critique écrite), une vraie grille aurait
    laissé des trous inégaux entre colonnes. Le glissement, qui
    fonctionne en coordonnées de pixels bruts, reste inchangé et
    fonctionnel dans cette disposition — vérifié explicitement.
  - **Découvrir** : puces de thème sur 3 colonnes.
  - **Profil** : le tableau de bord passe enfin réellement à 2 colonnes
    — la règle CSS existait déjà, elle manquait juste de place pour
    s'exprimer tant que le conteneur restait plafonné à 800px.
  - **Noter : largeur plafonnée à part**, trouvé en vérifiant
    visuellement plutôt que supposé correct — le formulaire complet
    s'étirait sur toute la largeur du conteneur élargi, rendant les
    curseurs inutilement longs à parcourir du regard sans gain de
    lisibilité. Recentré à une largeur raisonnable, indépendamment de
    l'élargissement des autres écrans.
  - **Mobile entièrement revérifié inchangé** après tous ces
    changements — 1 colonne, conteneur à 800px, comportement identique
    à avant, confirmé par test plutôt que supposé.

- **Phase 3 du plan d'exécution de l'audit expert — UI.**
  - **Icônes emoji remplacées par du SVG cohérent** (Découvrir, "Explorer
    par thème") — 8 nouvelles icônes ajoutées à la bibliothèque partagée,
    dans le même style trait fin que le reste de l'app. Trois variantes
    dessinées pour "Vengeance" avant de choisir la plus lisible (la
    première ressemblait trop à une épingle) — comparées visuellement
    dans une page de test isolée avant d'être câblées dans l'app.
  - **Composant pilule unifié** (`.ctx-tag`, `.filter-btn`, `.genre-chip`)
    — base commune factorisée pour les 3 pilules réellement similaires ;
    `.weight-badge` (une 4ᵉ pilule de l'app) volontairement laissée à
    part, car structurellement différente (non cliquable, police
    différente, pas de transition) — pas de fausse unification.
  - **Titres de section alignés sur le même token** — en vérifiant les 4
    classes de titre avant de les migrer, elles se sont révélées être de
    petites étiquettes en majuscules (0.70-0.75rem), pas de grands
    titres. **Écart assumé par rapport au plan écrit**, qui suggérait
    `--text-lg` (1.25rem) : appliqué tel quel, cela aurait cassé le style
    de petites majuscules déjà établi. Alignées sur `--text-xs`
    (0.72rem, déjà posé en Phase 1) à la place, qui correspondait déjà
    exactement à l'une des 4.
  - **Fonction `renderEmptyState()` partagée** — les 3 endroits qui
    utilisaient un texte stylé à la main (`Top Réalisateurs`,
    `Distribution des notes`) migrés vers cette fonction. Les états vides
    déjà riches et fonctionnels (Historique, À voir) non retouchés.

- **Phase 2 du plan d'exécution de l'audit expert — UX.**
  - **Espace vide de "Suggestions pour toi" (Découvrir)** — le
    conteneur réservait jusqu'à 580px pour afficher une seule phrase
    d'aide, poussant "Duels" hors d'écran sans raison. **Un vrai piège
    CSS trouvé en corrigeant** : `height: auto` semblait la solution
    évidente (même logique que le radar du Profil, déjà corrigé), mais
    ne fonctionne pas ici — `.discover-empty` est en `position:
    absolute; inset: 0`, et un enfant en position absolue ne contribue
    pas à la hauteur automatique de son parent. Vérifié concrètement :
    le conteneur tombait à 0px avec `auto`, le message devenait
    invisible malgré un `isVisible()` qui répondait pourtant vrai.
    Corrigé avec une hauteur fixe modeste (120px) à la place, avec un
    commentaire dans le code pour éviter qu'un futur passage ne
    retente `auto` et retombe dans le même piège.
  - **Transition en fondu au changement d'onglet** (Films/Séries dans
    Historique et Profil, Film/Série dans Noter) — un léger fondu
    plutôt qu'un changement instantané. Une fonction partagée
    (`fadeSwitchDisplay`) couvre les deux cas qui basculent entre deux
    éléments mutuellement exclusifs ; le cas du Profil, structurellement
    différent (un seul conteneur redessiné sur place, pas deux listes
    séparées), reçoit un traitement dédié plutôt que d'être forcé dans
    la même fonction.

- **Phase 1 du plan d'exécution de l'audit expert — fondations du
  système de design.** Rien de visible pour l'utilisateur dans cette
  phase (c'était volontaire, voir le plan) — le travail prépare les
  phases suivantes.
  - **Tokens d'espacement et typographiques** (`--space-1` à
    `--space-6`, `--text-xs` à `--text-2xl`) posés dans le bloc `:root`
    partagé — pas encore consommés par les composants existants, qui
    gardent leurs valeurs actuelles. **Écart assumé par rapport au plan
    écrit** : celui-ci suggérait de dupliquer ces tokens dans les 6
    blocs de thème (comme `--radius`/`--radius-sm`) ; en creusant, un
    bloc `:root` partagé existait déjà pour les tokens qui n'ont pas
    besoin de varier par thème (durées, ombres) — ces nouveaux tokens y
    ont été rattachés à la place, plus cohérent avec la convention déjà
    en place dans le code que ce que le plan décrivait au mot près.
  - **`--radius-pill`** introduit avec le même raisonnement, et les 23
    valeurs `20px`/`999px` codées en dur dans `styles.css` remplacées
    par ce token. Vérifié visuellement sur les 6 thèmes, Film Noir en
    particulier (angles francs partout ailleurs) : la pilule reste bien
    ronde, rien d'autre n'a changé.
  - **Fonction `tmdbImage(path, size)` centralisée** (`03-foundation.js`)
    remplaçant les constructions manuelles d'URL d'affiche TMDb. Un
    audit en avait compté ~33 ; la migration fichier par fichier en a
    trouvé 36 au passage (logos de plateformes de streaming non
    comptés initialement). Les 7 fichiers concernés migrés un par un,
    avec validation après chacun plutôt qu'en bloc.

### Corrigé
- **Profil : les points laissés de côté lors de l'audit UX/design
  précédent, traités sur demande explicite.**
  - **Radar "L'ADN de tes notes"** réservait 160px de hauteur même
    sans aucune note en mode Détaillé, avec juste une phrase au milieu
    d'un grand vide. Se replie maintenant à moins de 20px quand il n'y
    a rien à afficher, et retrouve sa taille normale dès que de vraies
    notes détaillées existent — vérifié dans les deux sens.
  - **"Distribution des notes"** affichait 10 lignes à zéro sans aucun
    message, alors que "Top Réalisateurs" juste à côté gérait très bien
    ce même cas avec une phrase d'aide — la même incohérence existait
    aussi côté séries. Un vrai message remplace maintenant les lignes
    vides, dans les deux zones.
  - **Bouton "Télécharger l'image"** restait actif alors que la carte
    affichait "Note quelques films pour la débloquer" — rien à
    télécharger, mais rien ne le signalait. Désactivé tant que la carte
    est verrouillée, avec une explication au survol.
  - **Précision apportée en creusant** : l'espace apparemment vide de
    la heatmap "Ton année de cinéma" n'était pas un défaut à corriger —
    une grille calendaire affiche normalement toutes ses cases même
    sans activité (comme sur GitHub ou Letterboxd) ; forcer un
    changement là aurait été artificiel plutôt qu'utile.
  - Résultat mesuré : l'écran Profil totalement vide passe de 8355px à
    7376px de hauteur (-979px), sans rien retirer d'utile.

- **Audit UX/design complet, sur demande explicite (hors Profil, exclu à
  la demande de l'utilisateur) :**
  - **Cibles tactiles trop petites** — un manque signalé il y a longtemps
    mais jamais traité jusqu'ici, confirmé avec de vraies mesures.
    Étiquettes de contexte (23px → 33px de hauteur), filtres de tri
    (24px → 34px), boutons pas-à-pas et bouton réglages (zone tactile
    invisible étendue, la même technique déjà éprouvée ailleurs dans
    l'app). Chaque correction vérifiée par un clic délibérément décalé
    de plusieurs pixels du bouton visuel, pas juste une mesure statique.
    - **Une bonne surprise en creusant** : le bouton Modifier/Supprimer
      de l'Historique, initialement signalé comme trop petit, avait en
      réalité déjà cette même zone tactile étendue en place — vérifié
      en cliquant à 8px du bouton visuel, la suppression s'est bien
      déclenchée. Rien touché sur cet élément pour ne pas casser ce qui
      fonctionnait déjà.
  - **Filtres de tri visibles même sans rien à trier** — Historique
    cache maintenant ses boutons "Récents/Mieux notés..." à vide, côté
    film et série, comme À voir le fait déjà pour ses propres contrôles.
  - **Coquille de contenu** : le champ de recherche film suggérait
    "Twin Peaks" comme exemple de film — une série, déjà utilisée comme
    exemple côté séries. Remplacé par un vrai exemple de film.
  - **Champ de date décalé visuellement** du reste de l'interface,
    pourtant très soignée par ailleurs — `color-scheme` ajouté à chaque
    thème pour que le sélecteur natif du navigateur s'accorde à
    l'ambiance claire ou sombre plutôt que de rester figé.
  - **Points volontairement laissés de côté**, propres au Profil (hors
    du périmètre demandé) : la longueur de l'écran vide (~8000px),
    l'espace vide du radar et de la heatmap sans données, l'incohérence
    entre sections sur la gestion des cas vides, et le bouton
    "Télécharger l'image" actif sans rien à télécharger.

- **Audit complet de l'application (données/accessibilité), sur demande
  explicite — 4 vrais problèmes trouvés et corrigés :**
  - 🔴 **Les séries étaient absentes de l'export manuel ET de la
    synchronisation cloud** — un vrai risque de perte de données (vider
    le navigateur ou changer d'appareil effaçait tout le suivi de
    séries, sans filet, alors que les films étaient protégés).
    L'export inclut maintenant les séries, avec un ancien format de
    sauvegarde qui reste lisible (rétrocompatibilité). La
    synchronisation cloud fusionne désormais aussi les séries entre
    appareils — à deux niveaux (série entière, puis saison individuelle
    de chacune), avec ses propres traces de suppression respectées
    séparément à chaque niveau, pour qu'une suppression sur un appareil
    ne réapparaisse pas au prochain passage d'un autre. Une fonction de
    fusion pure dédiée, testée avec 7 scénarios distincts.
  - 🟠 **Bouton imbriqué dans un `role="button"` sur les cartes de la
    watchlist** (onglet À voir) — le même défaut déjà corrigé deux fois
    ailleurs dans ce projet, mais jamais détecté ici. Restructuré sans
    toucher au geste de glissement existant ni au routage de clic déjà
    en place.
  - 🟡 **Code mort nettoyé** — une fonction JS jamais appelée, et une
    vingtaine de classes CSS jamais utilisées (dont plusieurs restes
    directs de l'ancienne grille d'épisodes retirée de Noter il y a
    deux livraisons).
  - **Une vraie régression trouvée en nettoyant, pas juste du
    ménage** : un correctif de contraste pour le thème Carnet pointait
    vers un nom de classe qui n'existait plus (`tv-continue-validate-btn`,
    renommé en `tv-continue-check-btn` lors de la refonte du widget) —
    il s'était donc arrêté silencieusement de s'appliquer. Confirmé
    mathématiquement (4.02:1, sous le seuil) avant de le rattacher au
    bon nom.
  - **Une fausse alerte écartée avant d'être signalée comme un bug** :
    en testant le bouton "Retirer" de la watchlist, une vérification
    semblait montrer que la suppression ne fonctionnait pas — creusé
    jusqu'à trouver que c'était le test lui-même qui vérifiait l'ancienne
    clé de stockage (`lbx_watchlist`), migrée depuis longtemps vers
    `lbx_watchlist_default` et jamais relue par l'app ensuite. La
    fonctionnalité elle-même fonctionne correctement — corrigé le test,
    pas l'application.

- **Ombre du bouton "Noter" — vraie correction cette fois.** Le
  correctif de la session précédente (flou réduit de 14px à 8px) n'a
  pas suffi — l'utilisateur a confirmé que le problème persistait.
  En zoomant sur les 6 thèmes, l'effet s'est révélé nettement plus
  sévère sur les thèmes à fond clair (Carnet en premier lieu) qu'estimé
  la première fois : une vraie tache sombre rectangulaire, pas juste un
  léger débordement. Le flou est réduit une seconde fois, plus
  significativement (8px → 4px), avec l'opacité aussi abaissée (0.35 →
  0.25) — confirmé par capture d'écran zoomée sur les 6 thèmes cette
  fois, pas un seul. Un test permanent verrouille maintenant le flou et
  l'opacité dans une plage raisonnable, pour qu'un futur ajustement ne
  puisse pas re-dériver silencieusement vers une valeur trop large sans
  qu'un test échoue.
  - **Un vrai bug de test préexistant trouvé au passage, sans rapport
    avec cette ombre** : un délai de 400ms avant une vérification
    d'accessibilité s'est révélé trop court face à la durée minimale
    volontaire de l'écran de démarrage (1200ms) — corrigé.

- **Glissement sur la carte de série entière (Historique)** — jusqu'ici
  le glissement n'existait que sur les lignes de saison, une fois la
  liste dépliée ; il fallait donc déplier avant de pouvoir supprimer.
  Glisser directement sur l'en-tête d'une carte de série (affiche +
  titre, sans rien déplier) révèle "Supprimer" et confirme la
  suppression de toute la série — réutilise la même fenêtre de
  confirmation que le bouton corbeille déjà visible, pas un second
  chemin de suppression séparé. Uniquement vers la gauche : contrairement
  à une saison, une série entière n'a pas d'action "Modifier" unique
  vers laquelle glisser à droite.
  - Contrôleur de glissement séparé de celui des saisons (comme pour le
    choix déjà fait entre films et séries) : n'agit que sur l'en-tête de
    la carte, jamais sur la liste de saisons dépliée juste en dessous,
    pour qu'aucun conflit ne soit possible entre les deux niveaux de
    glissement — vérifié explicitement.

### Modifié
- **Widget "En cours" : cartes redessinées, repli possible.** Rond à
  cocher sur la partie droite du cadre (remplace le bouton "Valider
  l'épisode" pleine largeur), petites icônes pause/retirer en coin,
  cadres légèrement plus espacés, hauteur stable quelle que soit la
  série (le titre d'épisode est plafonné à 2 lignes). **Retirer une
  carte** ne touche à aucune donnée — elle peut revenir au prochain
  rendu. **Mettre en pause** pose un indicateur persistant qui exclut
  la saison du widget jusqu'à reprise depuis sa fiche (repris là plutôt
  que depuis une carte qui ne serait plus affichée). Toute la section
  peut aussi se replier/déplier, préférence mémorisée d'une visite à
  l'autre.

- **Chercher une série dans Noter ouvre directement sa fiche détaillée**
  — les puces de choix de saison ont disparu de Noter, remplacées par la
  fiche complète (en-tête, casting, synopsis, progression par saison).
  Une pastille "Commencer la série" y apparaît pour toute série jamais
  suivie : elle démarre directement la Saison 1 (sans repasser par
  Noter), l'ajoute au widget "En cours", et recharge la fiche sur place
  pour montrer la progression qui vient de démarrer.

- **Ombre du bouton "Noter" de la barre de navigation resserrée** — le
  flou et l'opacité de l'ombre portée créaient un effet d'encadrement
  visible sur les deux onglets voisins ("À voir", "Découvrir").
  Confirmé par capture d'écran avant/après.

- **Refonte du suivi épisode par épisode : la grille complète déménage
  entièrement dans la fiche série, l'onglet Noter devient plus léger.**
  Choisir une saison dans Noter (recherche manuelle) ne montre plus la
  grille à cocher — trois cas selon l'état de la saison :
  - **Jamais touchée** → un menu "Commencer [Série] — [Saison] ?" ; la
    confirmation crée le suivi et ajoute le premier épisode au widget
    "En cours", sans rien afficher d'autre.
  - **Déjà en cours** (retrouvée par recherche, pas finie) → un message
    renvoie vers le widget "En cours" plutôt que d'ouvrir un second
    suivi redondant.
  - **Terminée** (par épisodes, ou déjà notée même si tous les épisodes
    n'ont pas été cochés un par un) → le formulaire de notation s'ouvre
    directement, préempli si une note existe déjà.
  Toute la validation épisode par épisode se fait désormais **uniquement**
  via le widget "En cours" (conservé tel quel) — ou via la nouvelle
  **grille complète dans la fiche série détaillée**, dépliable saison par
  saison, chargée à la demande au premier dépliage. Un bouton "Noter
  cette saison" y apparaît une fois tous les épisodes cochés.
  - **Un vrai bug trouvé et corrigé pendant le développement** : le
    widget "En cours" excluait les saisons à 0 épisode vu (il exigeait
    au moins 1 épisode déjà coché pour les considérer "en cours") — ce
    qui aurait rendu invisible toute saison qu'on vient tout juste de
    "Commencer", le scénario central de cette refonte.
  - **Un second vrai bug trouvé en régression** : rouvrir une saison
    déjà notée mais dont tous les épisodes n'étaient pas cochés (par
    exemple regardée en partie hors de l'app) ouvrait le mauvais état —
    la présence d'une note prime désormais sur le décompte d'épisodes.
  - **Une vraie erreur commise et corrigée avant qu'elle ne cause de
    dégâts** : en retirant l'ancienne grille de Noter, une suppression
    par plage de lignes trop large a emporté au passage 4 fonctions à
    conserver (dont la sauvegarde de note elle-même) — repéré par le
    lint qui aurait échoué, restauré immédiatement.
  - Le fichier de test `tv-shows-phase2.spec.js` (qui testait l'ancienne
    grille dans Noter) est retiré — son scénario n'existe plus à cet
    endroit ; sa couverture vit maintenant dans
    `tv-shows-search-opens-detail.spec.js` (la fiche ouverte directement)
    et `tv-shows-detail-parity.spec.js` (la grille dans la fiche).
  - Un second fichier de test devenu obsolète par ce même changement,
    `tv-shows-noter-flow.spec.js` (qui testait l'ancien menu "Commencer"
    câblé dans Noter lui-même, désormais inatteignable par toute action
    utilisateur réelle depuis que la recherche ouvre la fiche
    directement), a également été retiré — repéré et corrigé au fil
    d'une reprise de session, avec au passage un doublon de tests trouvé
    et nettoyé (`tv-shows-continue-widget-redesign.spec.js` couvrait déjà
    ce qui avait été réécrit par erreur dans un autre fichier).

### Corrigé
- **Parité fiche film / fiche série** — suite à un audit demandé
  explicitement, comparant les deux fiches fonction par fonction :
  - **Casting affiché à la verticale au lieu d'un carrousel** — un vrai
    bug, pas un choix : la fiche série utilisait `.mds-cast-card`, une
    classe qui n'existe nulle part dans le CSS. Remplacé par
    `.mds-cast-item` (le bon nom), avec le défilement automatique et le
    clic vers la fiche personne, comme pour les films.
  - **En-tête qui rétrécit au défilement** — jamais branchée pour la
    fiche série. En généralisant la fonction, un vrai risque de
    collision a aussi été corrigé au passage :
    `document.querySelector('.mds-header')` cherchait dans tout le
    document plutôt que dans la bonne fiche, un souci latent depuis que
    les deux fiches partagent cette même classe.
  - **Glissement vers le bas pour fermer** — branché (la fonction était
    déjà générique, aucune modification nécessaire).
  - **Créateurs cliquables** — ajoutés, ouvrent la fiche personne comme
    le réalisateur pour un film. Point de transparence noté : la fiche
    personne ne récupère que la filmographie films côté serveur, pas
    séries — un créateur connu surtout pour la télévision pourrait donc
    y sembler avoir peu de films, laissé tel quel pour l'instant.
  - **"Changer l'affiche"** — absent à la fois côté client et serveur.
    Nouveau point d'accès serveur (`tvImages`, miroir du système film),
    bouton conditionnel (visible si la série est déjà suivie, comme pour
    les films), sauvegarde directement sur `poster_path` (déjà le format
    utilisé côté séries, pas besoin d'une seconde représentation).
  - **Couleur d'accent de l'affiche** (thème Moderne) — absente de la
    fiche et des cartes d'historique série ; la règle CSS correspondante
    manquait aussi pour ces cartes, ajoutée en plus de l'appel JS.
  - **Un vrai défaut de contraste trouvé en testant, préexistant côté
    film aussi** (classe partagée `.mds-person-link`, jamais testée sur
    Moderne jusqu'ici) : `--orange` utilisé en couleur de texte directe —
    corrigé en préservant exactement le comportement d'origine (le
    soulignement ne devait apparaître qu'au survol, pas en permanence).

### Ajouté
- **Fiche série détaillée** — même structure et mécanique que la fiche
  film (squelette de chargement, sections qui apparaissent en cascade,
  notes externes IMDb/RT/Metacritic chargées en asynchrone), ouverte au
  tap sur une carte de série dans l'Historique. Nouveau fichier dédié
  (`src/19-tv-detail.js`), une nouvelle fiche `#tv-detail-sheet` plutôt
  que de réutiliser celle des films — même motif déjà établi pour la
  fiche personne. La quasi-totalité du style se réutilise sans rien
  dupliquer, les mêmes classes CSS étant génériques (pas spécifiques au
  film malgré leur nom historique).
  - **La vraie différence, comme demandé** : pas de "Ta note" unique —
    une section Progression avec la note globale calculée, puis le
    détail de **toutes les saisons connues via TMDb** (pas seulement
    celles déjà suivies localement), chacune avec son statut réel
    (notée / en cours / non suivie). Cliquer une saison non suivie
    l'ouvre directement dans Noter avec la bonne sélection — vérifié
    avec un vrai scénario à 3 saisons TMDb dont une seule notée et une
    jamais touchée.
  - Point serveur étendu (`append_to_response=credits,videos,
    external_ids` sur l'appel `tvId` déjà utilisé ailleurs) plutôt que
    d'ajouter un nouvel appel dédié.

- **Glissement sur les lignes de saison (Historique)** — glisser à
  gauche révèle "Supprimer", à droite "Modifier", un tap sur l'indice
  confirme, exactement comme pour les films. **Choix d'architecture
  assumé** : plutôt que de généraliser le système de glissement des
  films (500+ lignes, très affiné au fil de nombreuses sessions, de
  vrais bugs corrigés un par un — le risque de régression sur un
  système déjà fiable et testé était réel), un second contrôleur
  autonome a été écrit pour les séries, réutilisant les mêmes
  paramètres physiques déjà éprouvés (seuils, ratio de détection
  glissement/défilement) mais sans toucher au code film existant. Le
  bouton supprimer déjà visible reste disponible en plus du geste,
  pour ceux qui ne découvrent pas le glissement.
  - **Un vrai souci trouvé en testant la régression, pas une régression
    du glissement lui-même** : deux tests du système film ont échoué
    après ce changement — creusé, la cause était une fragilité
    préexistante dans un des tests (données injectées après le
    chargement de la page plutôt qu'avant, laissant la fenêtre
    d'accueil s'afficher par une course de temporisation qui passait
    par chance avant) — révélée par la légère augmentation de la
    taille de l'app, pas causée par le nouveau contrôleur. Corrigé à la
    source du test plutôt que dans le code de l'app.

### Retiré
- **Thème Méridien**, sur demande (non utilisé). Retiré entièrement :
  bloc de couleurs (jour + variante nuit), le mécanisme JS de bascule
  automatique jour/nuit basé sur l'heure réelle (deux fonctions
  dédiées), la carte de sélection dans le panneau de réglages, et
  l'aperçu de démarrage. Un repli propre a été ajouté pour quiconque
  avait ce thème déjà enregistré — retombe sur le thème par défaut
  plutôt que de laisser l'app sans styles cohérents. 10 fichiers de
  test mis à jour pour ne plus itérer dessus.
  - **Ça résout au passage le point laissé en suspens à la livraison
    précédente** : le défaut de contraste "mystère" trouvé sur Méridien
    était en réalité son mode nuit automatique qui s'activait pendant
    les tests selon l'heure réelle du système — pas un bug de rendu.
    Comprendre enfin la vraie cause, même si la question ne se pose
    plus avec le retrait du thème.
  - **Un vrai bug de test trouvé et corrigé au passage, sans rapport
    avec Méridien** : un délai de 100ms s'est révélé trop court pour
    que le filtre en niveaux de gris du thème Film Noir s'applique de
    façon fiable dans l'environnement de test — porté à 300ms.

### Ajouté
- **Historique — parité films/séries, 2e vague : filtre par genre.** TMDb
  renvoie déjà les genres dans la fiche d'une série (le même appel déjà
  utilisé pour la liste des saisons) — capturé directement au moment de
  la sélection, sans appel supplémentaire. Pour les séries déjà suivies
  avant ce correctif (donc sans genre stocké), une **récupération
  silencieuse en arrière-plan** les complète dès la première visite sur
  l'onglet Séries de l'Historique, sans bloquer l'affichage déjà rendu
  avec les données connues. Le composant de puces de genre (déjà utilisé
  pour les films) a été généralisé pour accepter n'importe quelle liste
  d'éléments plutôt que dupliqué.
  - **Un vrai bug confirmé visuellement, distinct du point non résolu de
    la livraison précédente** : en creusant plus loin cette fois (avec
    plus de temps), le défaut de contraste sur Méridien s'est révélé être
    un vrai problème visible — la barre de navigation s'affiche presque
    noire à certains endroits, alors que ce thème est conçu pour rester
    clair partout. Confirmé par capture d'écran réelle, pas juste un
    signalement d'outil. Cause exacte non identifiée dans le temps de
    cette livraison (le fond semi-transparent de la barre ne se comporte
    pas comme attendu sur ce thème précis) — à reprendre en priorité la
    prochaine fois, plutôt que le point plus vague noté précédemment.

- **Historique — parité films/séries, 1ère vague : filtre par note et
  suppression par saison.** Le clic sur une barre de l'histogramme
  (déjà partagé entre films et séries depuis la Phase 5) filtre
  maintenant vraiment la liste des séries affichées, avec un badge qui
  reflète le filtrage actif ("1 / 2 séries"). Suppression d'une seule
  saison (pas forcément toute la série) depuis la liste dépliée, avec un
  message de confirmation adapté si c'est la dernière saison suivie
  (retire alors toute la série).
  - **Un vrai bug trouvé et corrigé avant livraison** : `renderAll()` ne
    respectait pas la vue Historique active (toujours films), ce qui
    aurait cassé silencieusement le filtre par note côté séries. Une
    fonction de badge devenue redondante entre-temps (et activement
    risquée — elle écrasait le bon résultat calculé ailleurs) a été
    retirée proprement plutôt que rafistolée.
  - **Deux vrais défauts d'accessibilité trouvés en testant les 7
    thèmes** : un bouton supprimer imbriqué dans une ligne
    `role="button"` (invalide, présent sur les 7 thèmes) — corrigé en
    restructurant la ligne en deux vrais boutons indépendants plutôt
    qu'un élément imbriqué dans un autre. Et le bouton de confirmation
    utilisait par erreur le style "primaire" au lieu de "danger" pour
    une action destructive — une fois corrigé, ça a révélé que le style
    "danger" lui-même manquait de marge de contraste sur 3 thèmes
    (Carnet, Moderne, et Méridien plus particulièrement, où ni le texte
    blanc ni le noir n'offrait de vraie marge — la couleur rouge de ce
    thème a été légèrement assombrie pour donner une marge confortable
    au texte blanc).
  - **Un point trouvé mais non résolu, documenté honnêtement plutôt que
    caché** : un défaut de contraste distinct est apparu sur Méridien
    dans le widget "En cours", avec des valeurs de couleur qui ne
    correspondent à aucune teinte Méridien touchée aujourd'hui — pas
    élucidé dans le temps imparti pour cette livraison, à reprendre.

- **Widget "En cours" dans l'onglet Noter (mode Série uniquement)** — une
  carte verticale par série ayant un épisode à regarder, tout en haut,
  au-dessus de la recherche. Affiche à dimensions fixes, nom/durée/date
  du prochain épisode non vu, synopsis dépliable, bouton pour valider qui
  fait immédiatement apparaître l'épisode suivant à sa place. Une fois la
  dernière saison connue terminée, la saison suivante est **détectée
  automatiquement via TMDb** (pas stockée d'avance, seules les saisons
  déjà sélectionnées étant connues localement) — si elle existe, son
  premier épisode s'affiche ; sinon, la série disparaît simplement du
  widget. Vérifié de bout en bout avec un vrai scénario à deux saisons.
  - **Deux vrais défauts de contraste trouvés en testant les 7 thèmes,
    avant livraison** : le bouton "Valider l'épisode" (fond orange direct
    en texte sur Carnet — 13e occurrence du même piège déjà rencontré
    plusieurs fois, ajoutée au bloc de correctif consolidé plutôt que
    patchée isolément) et le lien "Synopsis" (`--blue`, juste sous le
    seuil sur Carnet) — corrigé à la racine en repassant sur une couleur
    de texte déjà éprouvée partout, plutôt qu'un correctif par thème.

- **Module Séries — Phase 5 : statistiques.** Bascule Films/Séries sur le
  tableau de bord analytique (Profil) : comptage et moyenne **par série**
  (pas par saison, cohérent avec le reste du module), radar de l'ADN des
  notes avec les libellés adaptés (Final, Cohérence — pas Photo/Rythme),
  distribution des notes propre aux séries. "Top Réalisateurs" replié en
  mode Séries — aucune donnée de showrunner récupérée pour l'instant, pas
  d'affichage vide ou trompeur à la place. La heatmap et le graphique
  "Activité (6 derniers mois)" restent **uniques** dans les deux modes
  (décidé ensemble pour la heatmap ; étendu au graphique d'activité par
  cohérence avec ce même principe — à confirmer si besoin).
  - **Un vrai défaut de contraste préexistant trouvé en testant les 7
    thèmes, sans rapport avec le travail du jour** : le pourcentage
    "déjà vu" des classiques à explorer (`.curated-list-row-pct`)
    échouait sur 3 thèmes (Carnet, Moderne, Méridien) — exactement le
    même piège déjà rencontré deux fois dans ce projet (couleur d'accent
    utilisée directement comme texte). Corrigé avec une couleur de texte
    déjà éprouvée.

- **Module Séries — Phase 4 : Historique scindé Films/Séries.** Bascule
  façon Détaillé/Rapide (pas un filtre dans une liste mélangée — une carte
  de saison et une carte de film n'ont pas le même contenu à afficher).
  Comptage **par série**, pas par saison, comme convenu ("12 films ·
  7 séries") — le badge existant préserve au passage son comportement de
  compte filtré quand une recherche est active côté films, plutôt que
  d'être écrasé. Chaque carte de série affiche sa note globale calculée
  (moyenne des saisons notées), un décompte "X/Y saisons notées", et une
  liste dépliable des saisons individuelles. Cliquer une saison dans cette
  liste rouvre le formulaire de notation avec la note existante déjà
  préremplie, pour la modifier. Suppression d'une série avec confirmation
  (retire toutes ses saisons suivies/notées).
  - **Une vraie lacune trouvée et corrigée dans mon propre test avant
    livraison** : ma première vérification du préremplissage utilisait des
    données de test avec des critères vides, laissant passer un test qui
    ne vérifiait rien de réel (le curseur retombait silencieusement à sa
    valeur par défaut sans que l'assertion s'en aperçoive) — corrigé avec
    de vraies valeurs et une assertion qui vérifie la bonne valeur.

- **Module Séries — Phase 3 : notation de saison.** Réutilise les 7
  curseurs déjà existants pour les films (mêmes ID, même système de
  pondération et de mode Détaillé/Rapide) — seuls deux critères sont
  reformulés pour coller au format saison : "Photographie & Esthétique" →
  **Qualité du final**, "Rythme & Montage" → **Rythme & Cohérence de la
  saison**. De vraies descriptions par palier ont été écrites pour ces
  deux critères (pas un simple renommage du libellé en gardant le texte
  film, qui n'aurait eu aucun sens pour un final de saison). Le bouton
  "Noter cette saison" (Phase 2) fait maintenant défiler jusqu'au
  formulaire au lieu d'afficher un message d'attente. Revenir sur une
  saison déjà notée repeuple le formulaire avec la note existante ; une
  saison vierge repart à des valeurs neutres.
  - **Note globale de série calculée automatiquement** — jamais stockée,
    toujours recalculée comme la moyenne des saisons notées (une saison
    suivie mais pas encore notée n'entre pas dans le calcul), affichée
    directement dans l'onglet Noter dès qu'au moins une saison a une
    note. Nouvelle fonction pure `computeShowAverageScore`, avec ses
    propres tests unitaires.
  - **Deux vrais bugs trouvés et corrigés avant livraison, en testant
    moi-même de bout en bout** : une variable (`currentMediaType`)
    déclarée dans le mauvais fichier empêchait littéralement l'app de
    démarrer dans certains cas (erreur "Cannot access before
    initialization"), trouvée en inspectant la console du navigateur —
    déplacée dans un fichier qui charge plus tôt. Et un défaut de
    contraste sur 3 thèmes (Carnet, Moderne, Méridien) sur le nouvel
    affichage de note globale, causé par la couleur d'accent utilisée
    directement comme texte — un piège déjà rencontré plusieurs fois
    dans ce projet, corrigé avec une couleur de texte déjà éprouvée.

- **Module Séries — Phase 2 : suivi épisode par épisode.** Grille
  d'épisodes (TMDb `/tv/{id}/season/{n}`, nouveau point d'accès serveur)
  avec case à cocher animée (coche qui se dessine + léger rebond, en CSS
  pur, respecte `prefers-reduced-motion`), barre de progression en direct,
  et proposition de rattrapage si on coche un épisode en avance ("Marquer
  aussi les épisodes X à Y comme vus ?"). Un bandeau apparaît une fois
  tous les épisodes cochés ("Saison terminée — la noter ?") — son bouton
  affiche pour l'instant un message honnête plutôt qu'un formulaire, la
  notation de saison étant la Phase 3, pas encore construite. Stockage :
  `lbx_tv_shows`, une entrée par série avec ses saisons imbriquées.
  - **Deux vrais défauts trouvés et corrigés en testant moi-même, avant
    livraison** : le nom de saison stocké (`seasonName`) reprenait par
    erreur le titre combiné "Série — Saison X" affiché dans le bandeau,
    redondant avec le titre de la série déjà stocké séparément — corrigé
    pour ne garder que le nom propre de la saison. Et une confusion dans
    mes propres tests (pas dans le code) sur l'accord au singulier/pluriel
    de "épisode" à 0 — le code était juste, c'est le test qui avait la
    mauvaise attente.
- **Module Séries — Phase 1 : recherche et sélection de saison.** Bascule
  Film/Série dans l'onglet Noter (même mécanique que Détaillé/Rapide),
  recherche d'une série (TMDb `/search/tv`), choix d'une saison (TMDb
  `/tv/{id}` pour la liste des saisons), bandeau récapitulatif. S'arrête
  volontairement là — le suivi épisode par épisode et la notation de
  saison sont les Phases 2 et 3, pas encore construites, comme convenu
  point par point plutôt que tout d'un coup.
  - **Note de transparence** : le fichier source de cette phase et ses
    éléments HTML correspondants existaient déjà en tout début de cette
    session, sans origine claire retrouvée dans l'historique de la
    conversation malgré une recherche dans les transcriptions
    précédentes. Plutôt que de lui faire confiance ou de le jeter sans
    vérifier, testé indépendamment de bout en bout (bascule, recherche,
    sélection de saison, retour vers Film) avant de le considérer comme
    acquis — un vrai bug a été trouvé dans ce processus, mais dans le
    test que j'écrivais pour le vérifier (mauvais ordre d'enregistrement
    des routes simulées), pas dans le code lui-même.

### Corrigé
- **Largeurs inégales dans la barre de navigation, signalées par
  l'utilisateur** — confirmées visuellement (jusqu'à 88px pour
  "Historique" contre 46px pour "À voir", qui passait sur deux lignes).
  Cause : `flex: 1` sans `min-width: 0` — un enfant flex refuse par
  défaut de rétrécir sous la largeur de son propre contenu, laissant les
  libellés longs ("Historique", "Découvrir") imposer leur largeur. Même
  classe de bug déjà rencontrée deux fois dans cette app (carrousel
  Tendances, champ de recherche). Corrigé avec `min-width: 0` + taille de
  texte uniforme et réduite pour que rien ne passe à la ligne de façon
  incohérente — vérifié : les 4 onglets font maintenant exactement 69px
  chacun, sur les 7 thèmes.

- **Minification JS/CSS dans le pipeline de build** — jamais mesuré
  jusqu'ici, un audit performance complet (LCP/CLS mesurés en conditions
  réelles, CPU ×4 + réseau dégradé) a montré un LCP de 4.7s (seuil "bon" :
  2.5s) et 596 Ko de JS+CSS non minifiés. `app.js` : 410 Ko → 216 Ko
  (-47%), `styles.min.css` (nouveau) : 186 Ko → 122 Ko (-34%). `styles.css`
  reste la source éditée directement — `styles.min.css` est généré à part
  par `scripts/minify.js`, pour ne jamais risquer d'éditer du CSS minifié
  par erreur dans une session future. `app.js`, déjà un fichier généré
  (jamais édité à la main), est minifié en place. Pipeline de build
  réordonné : concaténation → lint (sur JS lisible) → minification → hash
  du service worker (sur les octets réellement servis).

### Corrigé
- **3 tests obsolètes trouvés en validant la minification, sans rapport
  avec elle** — révélés par une vérification plus large que d'habitude :
  `duels.spec.js` et une partie de `duels-reset.spec.js` naviguaient vers
  Profil pour tester l'arène de duels (déplacée vers Découvrir il y a
  longtemps) ou référençaient le concept "duel du jour" (retiré depuis un
  moment) ; `desktop-layout.spec.js` échouait à cause d'un clic intercepté
  par la fenêtre d'accueil, pas à cause de l'ancienne mise en page qu'il
  vérifie (qui reste bien réelle et actuelle). Une erreur de correction
  trouvée et rattrapée au passage : mon premier remplacement dans
  `duels.spec.js` était trop large et cassait par erreur 2 tests qui
  vérifient le classement (resté sur Profil, contrairement à l'arène).
- **Audit UX/design complet — 4 vrais défauts trouvés et corrigés,
  vérifiés dans le code réel plutôt que devinés** :
  1. **`--gold` trop clair sur 3 thèmes** (Carnet, Cinéphile, Méridien) —
     1.36 à 2.06:1 seulement contre leur fond, sous le minimum de 3:1
     requis même pour du grand texte. Touchait le gros score en chiffres
     et une quinzaine d'autres endroits (médailles de duel, badges,
     bordures au survol...). Assombri sur les trois, marge confortable
     partout désormais.
  2. **Carnet : le correctif précédent (bouton Noter) ne couvrait pas
     tout** — même défaut sur "Nouvelle critique" et l'onglet "Détaillé".
     Cause racine trouvée : `--solid-fill-text` doit servir à la fois un
     fond orange (a besoin de texte sombre) et un fond vert (a besoin de
     texte clair) — aucune valeur unique ne peut satisfaire les deux. Un
     bloc consolidé corrige maintenant les 12 éléments concernés d'un
     coup, sans toucher `--solid-fill-text` globalement (aurait cassé le
     cas vert).
  3. **Méridien : 3 défauts, dont un effet de bord que j'avais moi-même
     introduit** — en assombrissant `--blue` lors d'un correctif
     précédent, je n'avais pas vérifié que `--blue-fill-text` (resté
     noir) fonctionnait toujours contre ce nouveau fond plus sombre :
     2.91:1 sur le bouton Sauvegarder. Corrigé avec `--text-mid`
     (touchait toutes les étiquettes de contexte) et la couleur des
     étoiles au passage.
  4. **Cinéphile : un défaut marginal** (4.46:1 au lieu de 4.5:1) sur le
     badge "Impact affectif" — `--blue` légèrement assombri.
- **`item.stars` sans protection dans l'Historique** — contrairement à la
  fiche film qui protège déjà ce même champ (`localMatch.stars || ''`),
  l'historique ne le faisait pas : un vrai risque d'afficher littéralement
  "undefined" à l'écran sur d'anciennes données (import/export,
  migration). Corrigé avec la même protection.

### Modifié
- **Effet verre dépoli plus transparent** (barre de navigation, fenêtres
  modales, toast) — flou inchangé, opacité du fond réduite pour laisser
  davantage transparaître le contenu en dessous, sur demande.

### Corrigé
- **Vrai bug introduit par la dernière livraison, signalé par
  l'utilisateur** : le titre du film, la date et le cœur s'affichaient mal
  proportionnés sur mobile dans l'onglet Noter. Cause : le bouton
  d'effacement ajouté au champ de recherche l'a enveloppé dans
  `.search-input-wrap`, mais la règle mobile qui plaçait ce champ sur toute
  la largeur de la grille (`grid-column: 1 / -1`) ciblait encore
  `.search-input` directement — comme ce n'était plus un enfant direct de
  la grille, la règle ne s'appliquait plus, et le placement automatique de
  la grille étirait le bouton cœur sur toute la largeur, seul sur sa
  ligne. Corrigé en ciblant le bon élément.

### Ajouté
- **Deuxième vague de finitions UX** (suite de l'audit design) :
  - Bouton d'effacement ("×") sur les deux champs de recherche (formulaire
    de notation et Historique) — plus besoin de tout effacer au clavier
    pour relancer une recherche.
  - Verre dépoli étendu au fond des fenêtres modales (`backdrop-filter`,
    opacité réduite en même temps pour laisser le flou se voir) et au
    toast de confirmation — cohérence avec la barre de navigation.
  - Intensité du flou de la barre de navigation relevée (16px, était
    10px), sur demande, avec l'opacité du fond réajustée en conséquence.

### Corrigé
- **Vrai chevauchement latéral trouvé sur appareil réel, corrigé**
  (synchronisé depuis une modification faite directement en production) —
  la colonne "Noter" héritait de `flex:1` comme les 4 autres onglets, donc
  sa largeur dépendait du texte des voisins ("HISTORIQUE", "DÉCOUVRIR")
  qui imposaient leur propre largeur plancher. Sur certaines largeurs
  d'écran, ça réduisait la colonne à moins de 64px, et le cercle de 78px
  débordait sur les colonnes voisines, chevauchant leur texte. Corrigé
  avec une largeur de colonne fixe et garantie (`flex: 0 0 74px`) et un
  cercle légèrement réduit (68px), donnant une marge de sécurité de 3px de
  chaque côté indépendante du texte des voisins ou de la largeur d'écran.
  Même ajustement pour le losange de Moderne (48px).

### Modifié
- **Bouton "Noter" agrandi et recentré** (synchronisé depuis une
  modification faite directement en production) — le cercle passe de 54px
  à 78px et se centre désormais sur les deux axes de la barre
  (`top/left: 50%` + `translate(-50%,-50%)`) plutôt qu'ancré au bord
  supérieur, débordant élégamment au-dessus ET en dessous de la barre.
  Même logique pour le losange de Moderne (56px, centré).

### Corrigé
- **Vrai défaut de contraste trouvé en revérifiant les 7 thèmes après cet
  agrandissement** : sur Carnet, le blanc habituel (`--solid-fill-text`)
  contre son orange spécifique (`#B8695E`, "Rose Poudré") ne offre que
  4.02:1, sous le seuil de 4.5:1 à la taille de police réduite du badge.
  Corrigé par une surcharge ciblée (noir, 5.22:1) sur ce badge précis,
  plutôt qu'un changement de `--solid-fill-text` global qui est utilisé
  largement ailleurs dans l'app et n'aurait pas été vérifié à cette
  échelle.

### Ajouté
- **Correctifs issus d'un audit design complet** — passé en revue point par
  point avant de coder (certains étaient déjà réglés, un contredisait un
  choix qu'on venait de faire ensemble, signalé avant d'y toucher) :
  - Zone de sécurité en haut (`env(safe-area-inset-top)`) pour l'en-tête,
    manquante jusqu'ici — celle du bas et de la barre d'onglets étaient
    déjà correctement gérées.
  - Export/Import déplacés de l'en-tête principal vers une nouvelle carte
    "Données" en tête de Profil, pour aérer l'écran principal.
  - Sous-titre "Contexte de visionnage" au-dessus des étiquettes
    Cinéma/Re-visionnage/etc.
  - Flou verre dépoli (`backdrop-filter`) sur la barre de navigation
    mobile flottante, pour que le contenu glisse proprement en dessous.
  - Chevron sur "Personnaliser les pondérations", qui pivote à
    l'ouverture/fermeture, pour signaler que c'est cliquable.
  - Bouton "Nouvelle critique" avec un remplissage plein (accent orange)
    plutôt qu'un simple contour, pour mieux marquer cette action clé.
  - Bouton "Noter" repensé sur demande explicite : le libellé vit
    maintenant DANS le cercle/losange (icône + texte réduit empilés),
    remplaçant le libellé externe — l'idée initiale de l'audit (retirer le
    texte) a été affinée ensemble plutôt qu'appliquée telle quelle.
- **Finitions visuelles du module Analyse de film (Phase 4)** — état de
  chargement avec icône tournante (réutilise l'animation déjà en place sur
  le bouton de rechargement des suggestions, pas une nouvelle inventée),
  encadré d'erreur avec icône et bordure colorée plutôt qu'un simple texte
  rouge, et une vraie transition d'entrée pour chaque nouvelle analyse
  envoyée (réutilise l'animation déjà utilisée pour l'apparition des
  sections de la fiche film).
- **Module Analyse de film** (Phases 0 à 2 du document de référence) — un
  onglet Analyse sur chaque fiche film, à côté de la note. Deux champs
  libres (technique, thématique), envoyés à un mentor IA (Gemini, modèle
  `gemini-flash-latest`) qui renvoie un retour structuré en quatre
  parties : synthèse, points forts, angles morts, questions pour
  approfondir — toujours ancré dans le texte écrit, jamais générique.
  Chaque analyse est conservée (stockage local, comme le reste de Ludex —
  décidé ensemble : pas de vraie base de données serveur, Analyse et
  ProgressionUtilisateur sont des données personnelles comme les autres).
  Nécessite une clé `GEMINI_API_KEY` gratuite (aistudio.google.com) à
  ajouter sur Vercel — repli explicite si absente, message clair plutôt
  qu'une erreur muette.
  - Le système de connaissances (glossaire, notions à débloquer — Phase 5
    du document) est volontairement repoussé à plus tard, une fois ce
    socle vécu un moment — décision prise ensemble en amont.
  - La synchronisation cloud n'inclut pas encore ces nouvelles données
    (à ajouter dans un second temps).

### Corrigé
- **Vrai bug trouvé en retirant le badge "Mode détaillé" en double** :
  une ligne JS non protégée (`document.getElementById('mode-badge')...`)
  référençait encore cet élément — la retirer sans corriger le JS aurait
  fait planter le changement de mode. Trouvé en vérifiant les références
  avant de toucher au HTML, pas après.
- **Vrai bug trouvé en construisant les finitions Phase 4, avant même
  qu'il n'atteigne la livraison** : remettre le texte du bouton à son état
  de repos après un envoi (`submitBtn.textContent = ...`) aurait effacé
  l'icône du spinner nouvellement ajoutée — exactement le même type de bug
  que celui trouvé plus tôt sur le badge de série (`setFilmDuJourTitle`) :
  écraser tout un conteneur au lieu de cibler le bon élément enfant.
  Corrigé avant livraison, verrouillé par un nouveau test qui simule
  plusieurs envois successifs.
- **`gemini-2.5-flash` remplacé par `gemini-flash-latest`** — trouvé
  inaccessible aux nouveaux comptes/projets Google en usage réel ("no
  longer available to new users", erreur 404), malgré une vérification
  préalable sur la page de tarification officielle qui le listait comme
  disponible. Correctif identifié et déployé par l'utilisateur directement,
  reporté ici pour rester synchronisé. L'alias "-latest" pointe
  automatiquement vers le modèle Flash courant, plus robuste qu'un nom de
  version figé.
- **Vrai bug trouvé en testant le module** : le message d'erreur précis du
  serveur (ex: "clé Gemini manquante") n'atteignait jamais l'utilisateur —
  remplacé silencieusement par un "vérifie ta connexion" générique et
  souvent faux. Cause : `readApiJson` lève déjà une exception avec le
  message du serveur sur une réponse non-OK, rendant mon second contrôle
  `if (!res.ok)` inatteignable — le message se perdait dans le bloc catch
  générique. Corrigé en réutilisant `describeApiFailure`, déjà conçue dans
  l'app pour ce cas exact, plutôt que d'inventer mon propre message.

### Modifié
- **Bouton "Noter" recentré** dans la barre de navigation (retour
  utilisateur, capture d'écran à l'appui) — réordonné pour avoir 2 onglets
  de chaque côté (Historique, À voir, Noter, Découvrir, Profil) plutôt
  qu'en première position. Aucune logique JS ne dépendait de l'ordre des
  boutons (uniquement du positionnement CSS `:first-child`/`:last-child`,
  qui s'adapte automatiquement), donc un simple réordonnancement du HTML.

### Ajouté
- **Bouton "Noter" mis en avant** dans la barre de navigation mobile (fait
  sur demande utilisateur, capture d'écran de référence à l'appui) — un
  badge qui dépasse au-dessus de la barre, pour l'action centrale de l'app.
  Mobile uniquement (la barre du haut sur PC reste plate, pas la place de
  déborder vers le haut). Le principe s'applique à tous les thèmes, mais la
  forme s'adapte à l'esprit de chacun : cercle par défaut, losange pour
  Moderne (cohérent avec son curseur en losange déjà en place, qui bannit
  déjà les formes rondes ailleurs dans ce thème).

### Corrigé
- **Vrai bug préexistant trouvé en testant le nouveau bouton** : le
  libellé de l'onglet actif sur Méridien n'avait que 2.54:1 de contraste
  contre le fond blanc de la barre de navigation (`--blue`, mappé sur le
  même laiton que l'accent), sous le seuil de 4.5:1 — jamais détecté avant
  faute d'avoir scanné spécifiquement cette zone en état actif. Assombri,
  sans toucher aux autres couleurs d'accent du thème.
- **Vrai bug trouvé suite à un signalement utilisateur, avec capture
  d'écran à l'appui** : les notes IMDb/RT/Metacritic (OMDb) se
  chevauchaient avec le bouton "Changer l'affiche" et le réalisateur en
  descendant dans la fiche film. Cause exacte : l'en-tête de la fiche a un
  mode "compact" déclenché au défilement (l'affiche rétrécit, certains
  éléments se cachent pour garder un en-tête minimal) — les notes OMDb,
  ajoutées après coup, n'avaient jamais été intégrées à cette logique et
  restaient affichées en pleine taille, rendant l'en-tête "sticky" bien
  plus haut que prévu et le faisant déborder par-dessus le contenu en
  dessous. Corrigé en les masquant en mode compact, comme la note TMDb. Le bouton "Changer l'affiche" masqué là aussi (retour utilisateur : plus simple que de le remplacer par une icône).
  Reproduction difficile (probablement liée aux réglages d'accessibilité
  du téléphone) — trouvé en simulant le vrai déclencheur (défilement à
  l'intérieur de la fiche) plutôt qu'en essayant de reproduire pixel pour
  pixel la capture d'écran.

- **Vrai bug trouvé suite à un signalement utilisateur** : balayer la bande
  "Ce jour-là" changeait d'onglet au lieu de la faire défiler. Le geste
  global de swipe-entre-onglets (`01-navigation.js`) a une liste de zones
  exclues (carrousels, cartes...) pour ne pas interférer avec leurs propres
  gestes tactiles — `.on-this-day-strip` en avait été oublié. Trouvé au
  passage et corrigé deux autres cas du même problème, jamais signalés mais
  bien réels : le sélecteur de listes dans Watchlist et la heatmap
  d'activité dans Profil.

### Modifié
- **Carte "Par pays" : retour au même design en lignes que les décennies**
  (retour utilisateur : la carte stylisée avec pastilles positionnées ne
  convenait pas) — abandon complet du système de carte, remplacé par des
  lignes classiques dans un accordéon, identique aux décennies/studios.

- **Vercel Speed Insights** — méthode "site statique sans npm" (deux
  balises `<script>` dans `index.html`), pas le composant Next.js : Ludex
  est du JS classique concaténé, sans framework côté client.
- **Notes IMDb/Rotten Tomatoes/Metacritic (OMDb)** sur la fiche film,
  uniquement quand elle est ouverte explicitement (jamais sur les grilles
  qui listent plein de films à la fois). Récupère l'identifiant IMDb
  directement depuis TMDb (`external_ids`), pas de résolution par titre
  fragile. Nécessite une clé `OMDB_KEY` gratuite (1000 requêtes/jour) à
  ajouter sur Vercel — repli silencieux si absente, la fiche reste
  utilisable sans ces notes.
- **Bascules Réglages pour les 4 dernières fonctionnalités Découvrir**
  (Ce jour-là, Explorer par thème, D'après tes goûts, raccourci Classiques
  à explorer) — désormais toutes les sections de Découvrir sont
  activables/désactivables individuellement.

- **"D'après tes goûts"** dans Découvrir (angle mort ciblé) — la dernière
  des cinq idées de découverte, et la plus longue à construire : transforme
  le % de filmographie déjà affiché sur la fiche personne (une donnée
  passive) en incitation concrète ("Tu adores X, 9.0/10 en moyenne sur 3
  films — il te reste 2 films à découvrir"). Le vrai défi technique :
  l'historique stocke le réalisateur en texte simple, pas en identifiant
  TMDb — résolution film par film en tâche de fond (par lots, comme la
  liste "Tous les temps"), mise en cache définitivement une fois faite,
  priorisée sur les films les MIEUX notés d'abord. Minimum 2 films notés
  du même réalisateur pour compter (une seule note ne dit pas grand-chose
  sur un "créateur préféré"), top 3 par note moyenne. Section entièrement
  masquée si l'historique est trop court ou les recoupements insuffisants.
  Réutilise directement la logique de filmographie déjà construite pour la
  fiche personne (buildPersonFilmography/computeSeenPercentage), sans la
  dupliquer.

- **"Ce jour-là"** dans Découvrir, aux côtés du Film du jour — anniversaires
  de sortie. Limité aux anniversaires RONDS (10/20/30/40/50 ans) plutôt que
  de vérifier chaque année : TMDb ne permet pas de filtrer "sorti un 7 août,
  toutes années confondues" en un seul appel (leurs filtres de date
  fonctionnent par plage continue, pas par jour répété chaque année) — une
  requête par palier plutôt que des dizaines. Cas particulier du 29 février
  géré (années cibles non bissextiles ignorées, plutôt qu'un débordement
  silencieux sur le 1er mars). Section entièrement masquée si aucun
  anniversaire notable n'est trouvé ce jour-là, plutôt qu'un encart vide.

- **Exploration par thème** dans Découvrir — mots-clés TMDb (indépendants
  des genres classiques : un genre dit "c'est un thriller", un mot-clé dit
  "c'est un film de braquage"), 8 thèmes choisis à la main plutôt qu'une
  recherche en texte libre (risque réel de recherches sans résultat) :
  Braquage, Boucle temporelle, Vengeance, Passage à l'âge adulte, Survie,
  Road trip, Maison hantée, Dystopie — identifiants TMDb vérifiés un par un.
  Contrairement aux décennies/studios/pays (Profil, un vrai "canon" à
  suivre), vit dans Découvrir sans barre de complétion ni ajout en masse :
  un outil de navigation/suggestion, pas une collection à cocher.

- **Carte du monde du cinéma** dans "Classiques à explorer" (Profil) —
  troisième onglet accordéon, aux côtés des décennies et des studios : 8
  pays à forte identité cinématographique (Japon, Corée du Sud, Hong Kong,
  Inde, Iran, Italie, Danemark, Mexique). Volontairement **pas** une carte
  géographiquement précise (vraies frontières) — un fond abstrait façon
  grille + des pastilles pays largement dimensionnées, positionnées
  approximativement à la bonne région du monde plutôt qu'avec une précision
  géographique réelle. Choix assumé après discussion : une carte précise
  aurait rendu des pays comme la Corée du Sud minuscules et difficiles à
  viser au doigt sur un écran de téléphone. Vérifié : chaque pastille
  dépasse la cible tactile minimale de 44px (WCAG 2.5.5).

- **Explorateur de studio** dans "Classiques à explorer" (Profil) — nouvel
  onglet accordéon aux côtés des décennies : A24, Studio Ghibli, Pixar,
  Blumhouse, Marvel Studios. Sélection restreinte à des studios à identité
  créative forte et catalogue resserré (pas les grands studios généralistes
  type Universal/Warner, qui n'ont pas de vraie identité de "collection à
  compléter") — identifiants TMDb vérifiés un par un avant implémentation.
  Catalogue quasi complet plutôt qu'un "top" filtré par note (esprit
  "complète la collection", pas "les meilleurs de ce studio") : ordre
  chronologique, seuil de votes plus bas que les décennies (20, pas 500)
  pour ne pas exclure de vrais films sous prétexte qu'ils sont moins connus.

### Corrigé
- **Vrai bug trouvé en écrivant les tests des studios** : les listes par
  décennie et les catalogues de studio affichaient l'année vide dans la
  grille — les résultats bruts de l'API TMDb (`release_date`, une date
  complète) n'étaient jamais convertis en année seule avant l'affichage.
  Cache local des décennies invalidé (nouvelle clé) pour que le correctif
  s'applique dès le prochain chargement, sans attendre l'expiration
  naturelle du cache (jusqu'à 30 jours sinon).

- **Bascule "Devine le Film du Jour"** dans Réglages — désactivée, le Film
  du jour s'affiche directement révélé (comme s'il n'y avait pas d'affiche
  à deviner), sans jamais toucher aux séries/parties déjà en cours : elles
  restent gelées, jamais effacées. Désactiver pendant une devinette en
  cours révèle immédiatement le film ; réactiver restaure la devinette si
  la partie du jour n'a pas encore été jouée.
- **Fiche saga** — quand un film appartient à une collection TMDb (ex: une
  franchise), une bande compacte des autres films de la saga apparaît en
  bas de sa fiche, avec un lien pour ouvrir la fiche saga complète : même
  mise en page que la fiche réalisateur (grille, % déjà vu, ajout des
  manquants à la watchlist) — les deux réutilisent désormais le même rendu
  partagé.
- **Accordéon pour les listes par décennie** dans "Classiques à explorer"
  (retour utilisateur, capture à l'appui) : la carte affichait les 12
  listes dépliées d'un coup, bien trop longue à faire défiler. "Tous les
  temps" reste toujours visible, les 11 décennies partent dans un
  accordéon natif replié par défaut.

- **"Classiques à explorer"** dans Profil — deux natures de listes bien
  distinctes, jamais mélangées :
  - **Tous les temps** : compilée à la main sur le classement Sight & Sound
    2022 (British Film Institute, référence la plus citée du milieu
    critique, ~1 600 votants, publié tous les 10 ans).
  - **Une liste par décennie** (des années 1920 à aujourd'hui) : tri
    algorithmique transparent sur TMDb (note moyenne, minimum 500 votes pour
    éviter qu'un film obscur à 3 votes ne fausse le classement) — annoncé
    comme tel dans l'app, pas présenté comme un vrai palmarès critique.
  - Pourcentage déjà vu par liste (même mécanisme que pour un
    réalisateur/acteur), grille détaillée avec films vus/manquants
    distingués visuellement, et un bouton pour ajouter tous les manquants
    d'un coup à la watchlist active.
  - Raccourci direct depuis Découvrir, sans dupliquer la fonctionnalité à
    deux endroits.
  - La résolution des ~100 titres de la liste "Tous les temps" vers leurs
    identifiants TMDb se fait en tâche de fond, par lots (respecte la limite
    de débit du proxy), une seule fois — mise en cache définitivement
    ensuite.

- **Synopsis en encart distinct** dans la fiche révélée du Film du Jour —
  même traitement visuel que l'ancienne carte anecdote (bande colorée à
  gauche, icône), avec troncage à 4 lignes et bouton "Lire la suite" pour
  les synopsis longs, afin de garder une hauteur de carte stable d'un film à
  l'autre.
- **Pastilles A/B/C/D et icônes ✓/✗** sur les réponses du Quiz du jour, pour
  un vrai esprit "quiz télé" et une lisibilité qui ne dépend pas seulement
  de la couleur.

### Corrigé
- **Vrai bug trouvé en révisant l'affichage du Quiz** : les couleurs
  bonne/mauvaise réponse étaient codées en dur (`rgba(90,160,90,...)` /
  `rgba(180,70,70,...)`) et ne s'adaptaient à aucun des 7 thèmes de l'app —
  contrairement à tout le reste de l'interface. Corrigé avec les couleurs du
  thème actif.

### Modifié
- **Contraste et icônes de la fiche Film du Jour** (retour utilisateur, capture
  à l'appui) : la ligne réalisateur/note se confondait visuellement avec le
  synopsis. Ajout d'icônes cohérentes avec le reste de l'app (clap de cinéma,
  déjà utilisé comme repli d'affiche ; étoile, déjà utilisée pour les notes)
  et passage en texte plus contrasté (`text-hi`, gras) pour bien distinguer
  les informations structurées du synopsis en prose. Icônes marquées
  décoratives (`aria-hidden`) puisque le texte adjacent porte déjà toute
  l'information.

### Modifié
- **Anecdotes Wikipédia retirées** (retour utilisateur : "n'apporte pas de
  réelle plus-value"). Remplacées par une présentation simple et toujours
  fiable du film — synopsis, réalisateur, note TMDb — sans dépendre de
  l'existence d'une page Wikipédia adaptée. Suppression complète de bout en
  bout : point d'accès serveur, module d'extraction, accordéon "Chiffres
  clés", tests dédiés.
- **Auto-suggestion de titres pour "Devine le Film du Jour"** : en tapant,
  une liste de titres correspondants apparaît (même recherche TMDb que la
  watchlist et la notation), mais en texte seul — sans affiche — pour ne
  jamais spoiler la bonne réponse pendant la devinette.

### Modifié
- **Refonte de l'affichage PC : système d'onglets unique** (comme sur
  mobile) plutôt que la grille à deux colonnes (Noter toujours à gauche +
  onglets internes à droite). Les 5 onglets (Noter, Historique, À voir,
  Découvrir, Profil) vivent désormais dans une seule barre, positionnée en
  haut sur PC et ancrée en bas sur mobile (inchangé) — un seul onglet visible
  à la fois, à toutes les tailles d'écran. Simplifie au passage la logique
  JS de navigation (plus besoin de réagir différemment au redimensionnement
  selon la largeur, la bascule est désormais universelle).
- Mise en page centrée sur une largeur de lecture confortable (800px) plutôt
  que la grille à deux colonnes précédente (1100px).

### Corrigé
- **Carte anecdote peu lisible signalée par l'utilisateur** (capture d'écran
  à l'appui) : la carte reposait sur un contraste bordure/fond qui
  s'effondre sur un thème à faible contraste volontaire (Méridien : fond de
  carte à peine différent du fond de page, 1.11:1 mesuré). Remplacé par une
  bande colorée à gauche (motif "citation en avant" classique), qui reste
  visible même à contraste modeste puisqu'elle se perçoit par sa teinte
  pleine plutôt qu'un contraste texte-sur-fond. Icône passée à `text-hi`
  (contraste garanti sur tous les thèmes, était à 2:1 avec l'ancienne
  couleur d'accent atténuée). Lien de source Wikipédia assombri (était sous
  le seuil sur Méridien).
- Au passage, trouvé et corrigé un défaut de contraste préexistant sur le
  thème Cinéphile (`--text-mid` à 4.1:1, jamais testé sur cet écran avant),
  sans rapport avec la refonte de la carte anecdote.
- Vérifié sur les 7 thèmes : zéro violation d'accessibilité restante sur la
  carte anecdote.

### Corrigé
- **Bug majeur d'affichage PC** : la colonne de droite (Watchlist/Découvrir/
  Profil) débordait à plus de 2000px de large sur un écran large, cassant
  toute la mise en page à deux colonnes. Cause : le carrousel "Tendances du
  moment" (pensé pour défiler horizontalement au doigt sur mobile) est un
  élément flex avec `overflow-x: auto` mais sans `min-width: 0` — sans ça, un
  enfant flex refuse par défaut de se réduire sous la largeur de SON contenu
  (tous les films tendances à la suite, sans retour à la ligne), forçant
  toute la colonne à s'élargir pour l'accueillir. Invisible sur mobile (une
  seule colonne, jamais remarqué) mais cassait entièrement l'affichage PC.
  Corrigé, et la même protection appliquée par prudence aux 3 autres
  carrousels horizontaux du même type (sélecteur de listes watchlist, heatmap
  d'activité annuelle, carrousel du casting dans la fiche film) qui avaient
  le même risque, même si non encore observés en défaut.

### Ajouté
- **Habillage visuel de l'anecdote** : encart distinct (fond teinté), icône
  ampoule dédiée, grand guillemet décoratif, léger fondu d'apparition à la
  révélation — remplace l'ancien texte en italique flottant sans cadre.
- **Accordéon "Chiffres clés"** (natif `<details>/<summary>`, gratuit en
  accessibilité clavier) : les faits TMDb (budget, tagline, réalisateur/
  acteur, note, durée) y sont désormais rangés plutôt que mélangés à
  l'anecdote — replié par défaut si une anecdote Wikipédia existe, ouvert
  automatiquement sinon.
- **Indices progressifs enrichis** pour "Devine le Film du Jour" : un nouvel
  indice à chaque essai raté — année (1er), réalisateur (2e), acteur
  principal (3e), second acteur (4e) — volontairement différents des
  "Chiffres clés" pour ne pas répéter la même info deux fois une fois le jeu
  terminé.

### Ajouté
- Bouton "Vider le cache du Film du jour" dans Réglages — force une nouvelle
  recherche d'anecdote sans attendre le lendemain (le tirage du jour lui-même
  reste stable par conception, seule l'anecdote est retentée).

### Corrigé
- **Vrai bug trouvé en diagnostiquant un signalement utilisateur** ("les
  anecdotes restent sur TMDb") : quand la recherche Wikipédia échouait une
  première fois (pour n'importe quelle raison — bug déjà corrigé, coupure
  réseau ponctuelle...), le résultat `null` restait en cache pour toute la
  journée, empêchant tout nouvel essai avant le lendemain. Diagnostiqué en
  testant le point d'accès en conditions réelles sur le déploiement Vercel de
  l'utilisateur (le film "L'Odyssée" (2026) confirmait que le serveur
  fonctionnait bien — c'est le cache client qui restait bloqué sur un ancien
  échec). Corrigé : un résultat trouvé reste en cache toute la journée comme
  avant, mais un échec est désormais retenté à chaque ouverture de l'app.
- Texte de description obsolète dans Réglages ("l'arène de duels dans le
  Profil et le duel du jour dans Découvrir") — ne correspondait plus à la
  réorganisation Découvrir/Profil des duels.

### Corrigé
- **Vrai bug trouvé en vérifiant la réorganisation Découvrir/Profil des
  duels** (déjà en place depuis une session précédente) : la bascule
  "Duels" dans Réglages ne masquait plus vraiment l'arène dans Découvrir —
  elle référençait un élément (`daily-duel-wrap`) et une fonction
  (`renderDailyDuel`) qui n'existaient plus depuis que l'arène avait été
  déplacée depuis Profil. Un ancien test donnait un faux positif en vérifiant
  ce même élément fantôme (`toBeHidden()` réussit aussi pour un élément
  absent du DOM). Corrigé pour cibler les vrais éléments actuels
  (`duel-arena-wrap`, `renderDuel`), et le test corrigé pour vérifier le bon
  élément.

### Corrigé
- Ordre de priorité des sections Wikipédia affiné : "Tournage" et "Genèse"
  (sous-sections riches en anecdotes concrètes) passent désormais avant
  "Production" (leur section parente, souvent une simple phrase
  d'introduction). Vérifié contre la vraie structure d'un article réel via
  recherche web (le sandbox n'a pas d'accès réseau direct à Wikipédia) :
  confirmé que "Le Parrain (film)" est bien le format de titre utilisé, et
  que Genèse/Tournage sont des sous-sections de Production contenant la
  matière la plus riche (casting, improvisations, anecdotes de plateau).
- **Vrai bug trouvé suite à un retour utilisateur** ("les anecdotes semblent
  toujours basées sur TMDb") : la recherche Wikipédia envoyait le titre
  ORIGINAL du film en priorité dès qu'il différait du titre français — or les
  articles Wikipédia FR sont titrés avec la sortie française ("Le Parrain",
  pas "The Godfather"). Tout film au titre traduit échouait donc
  silencieusement sa recherche et retombait sur les faits TMDb. Corrigé :
  titre français toujours essayé en premier, l'original seulement en dernier
  recours si rien n'est trouvé.

### Modifié
- **Fusion de "Film du jour" et "Devine le Film du Jour"** en une seule
  carte : les deux affichaient le même film séparément, ce qui n'avait pas de
  sens. Désormais, un seul parcours — l'affiche floutée à deviner d'abord,
  puis la fiche complète (titre, anecdote Wikipédia ou faits TMDb, plateformes
  de streaming) se révèle une fois la partie gagnée ou perdue. Sans affiche
  disponible, la fiche s'affiche directement (deviner n'aurait pas de sens).

### Corrigé
- Un bug trouvé pendant cette fusion : la fonction qui bascule le titre entre
  "Film du jour"/"Sortie de la semaine" écrivait son texte à même le
  conteneur qui héberge aussi le badge de série du jeu — chaque
  victoire/défaite effaçait silencieusement ce badge. Corrigé en isolant le
  texte du titre dans son propre élément, indépendant du badge.
- `setFilmDuJourTitle` était appelée pour basculer le titre entre "Film du
  jour" et "Sortie de la semaine", mais n'était définie nulle part — plantait
  silencieusement (erreur JS non interceptée) à chaque chargement du Film du
  Jour depuis le cache, c'est-à-dire presque tout le temps sauf le tout
  premier accès de la journée/semaine. Fonction ajoutée, et le calcul/la
  sauvegarde de l'indicateur "semaine" corrigés (n'existaient que sur le
  chemin déjà mis en cache, jamais au premier chargement).
- Commentaire de code corrigé (mentionnait un "numéro de semaine ISO" jamais
  réellement utilisé — la graine est en fait le nombre de jours depuis
  epoch, ce qui reste correct mais ne correspondait pas à ce qui était écrit).

### Ajouté
- **Anecdotes réelles pour le Film du Jour**, via Wikipédia FR (section
  "Anecdotes"/"Production"/"Genèse"/"Tournage") — remplace les faits générés
  depuis les données TMDb (budget, tagline...) quand une vraie anecdote est
  trouvée ; repli propre sur les anciens faits sinon. Attribution et lien
  Wikipédia toujours affichés (licence CC-BY-SA).
- **Mini-jeu "Devine le Film du Jour"** — affiche floutée à deviner (esprit
  *Framed*), 5 essais, flou qui se réduit à chaque échec, indices (année puis
  genre) aux paliers 3 et 5, titre français ou original accepté, série
  (streak) suivie séparément du Quiz et des Duels.

### Corrigé
- Un lien réel (source Wikipédia) ajouté dans la carte "Film du jour"
  cassait l'accessibilité (même défaut d'imbrication ARIA que sur
  l'historique, avec la même absence d'activation clavier) — corrigé en
  scopant le rôle de bouton clavier à l'affiche seule, qui elle ne contient
  jamais de contrôle interactif.
- Un décompte d'essais à zéro sur une victoire au premier coup dans le
  nouveau jeu ("Trouvé en 0 essai") — trouvé en écrivant les tests E2E.

### Modifié — Refonte complète des thèmes
- **10 → 7 thèmes.** Scuderia, Wes Anderson, Cinéma Classique et Journal de
  Bord retirés (redondants entre eux ou trop proches d'un autre thème
  conservé) ; Default, Technicolor, Film Noir et Cinéphile 70s inchangés.
- **Nouveau thème "Carnet de Voyage"** — fusion d'Anderson et Journal (pas de
  Cinéphile, qui reste intact séparément) : palette rose poudré/sauge propre,
  police machine à écrire pour les titres + police proportionnelle lisible
  pour le corps de texte (corrige un vrai risque de lisibilité de l'ancien
  Journal, qui utilisait du monospace partout), écriture manuscrite conservée
  pour les critiques personnelles.
- **Méridien** : couleurs plus vivantes (accent laiton plus riche, rouge/vert
  moins désaturés), une ombre subtile réintroduite — retour utilisateur : le
  thème paraissait trop "dur". Concept jour/nuit inchangé.
- **Moderne** repensé autour du Bauhaus/modernisme architectural : bleu/or
  plus affirmés, grille façon papier d'architecte, curseur en losange. Corrige
  aussi un bug préexistant (le vert était fusionné avec le bleu, aucune
  teinte propre).
- Toutes les nouvelles couleurs vérifiées par un audit de contraste
  automatisé (axe-core) — zéro violation sérieuse/critique sur les 3 thèmes
  modifiés, corrigé par calcul WCAG précis plutôt que par ajustement à l'oeil.
- Au passage : correction d'un bug de contraste préexistant sur les boutons de
  tri actifs (texte et fond utilisaient la même couleur, sans lien avec les
  thèmes retirés).

### Corrigé
- La carte d'entrée de la Rétrospective annuelle ("Wrapped") restait visible
  même sans aucun film noté.
- Un choix d'affiche ne « tenait » que jusqu'à la fermeture de la fiche film :
  le rendu revenait systématiquement chercher l'affiche par défaut de TMDb à
  chaque réouverture au lieu de consulter le choix sauvegardé. Corrigé pour
  les films dans l'historique ET dans une watchlist (pas encore notés).

### Ajouté
- Vérification hors-ligne de bout en bout : le service worker met bien en
  cache le shell de l'app (HTML/CSS/JS/images vues), chaque onglet reste
  utilisable sans réseau, et les actions locales (noter, modifier, supprimer)
  fonctionnent intégralement — confirmé par un vrai test hors-ligne (pas une
  simulation d'échec réseau ponctuel), pas juste une supposition.

### Modifié
- **Carte "Par pays" repensée visuellement** (retour utilisateur : "pas ouf
  dans l'état actuel") — fond dégradé sobre à la place de la grille façon
  papier millimétré, et épingles de carte classiques (goutte pointue,
  drapeau) toutes à la même taille, remplaçant les pastilles à largeur
  variable qui donnaient un rendu inégal.

## [1.1.0] — 2026-07-20

### Ajouté
- CHANGELOG.md et versionnage sémantique (ce fichier).
- Régression visuelle automatisée (captures d'écran Playwright, 2 vues × 4
  thèmes) — voir le README pour les limites et le workflow de mise à jour.
- Accessibilité automatisée : suite de tests axe-core sur les 5 onglets, 2
  thèmes, la fiche film/personne et une modale — zéro violation
  sérieuse/critique.
- Activation clavier (Entrée/Espace) pour ouvrir une fiche film depuis
  l'historique — inexistante jusqu'ici.
- Fonctionnalités activables/désactivables depuis Réglages (Duels, Quiz du
  jour, Carrousel tendances, Recommandations Découvrir).
- Réinitialisation des duels depuis Réglages (avec confirmation).
- Journal d'erreurs local : capture les erreurs JS imprévues, consultable et
  copiable depuis Réglages, sans télémétrie.
- Choix de l'affiche par film parmi les variantes TMDb, persisté dans
  l'historique et les watchlists.
- Minification JS/CSS au déploiement Vercel (~49 % / ~36 % de réduction une
  fois compressé), sans toucher au code source lisible du dépôt.
- Versioning du schéma de données : migrations séquentielles sûres (sauvegarde
  préalable, échec non destructif, idempotence).
- ESLint intégré au build et à la CI (attrape les doublons de fonctions/clés).

### Corrigé
- La synchronisation cloud et les appels à l'API TMDb (recherche, watchlist,
  sélecteur d'affiches) affichaient « vérifie ta connexion » pour toute
  erreur, y compris les pannes serveur — ils distinguent désormais coupure
  réseau réelle, erreur API précise et échec générique.
- Le sélecteur d'affiches ne remplissait pas correctement sa case (plusieurs
  itérations : ratio, puis hauteur calculée en pixels par JS plutôt qu'en CSS,
  la seule méthode fiable dans ce contexte grille + bouton + image).
- Cartes de l'historique à hauteur inégale selon la présence d'un tag de
  contexte.
- Audit XSS complet (33 interpolations traitées, `showToast` réécrit au puits).
- Nombreux correctifs de fluidité tactile (transition non désactivée pendant
  un glissement actif, délais de fermeture désynchronisés de l'animation
  réelle).

## [1.0.0] et antérieures

État de référence non tracé individuellement : historique, watchlist, notation
multi-critères, duels ELO, thèmes (dont Technicolor), synchro cloud, import
Letterboxd, découverte TMDb, PWA installable. Voir le README pour le détail.
