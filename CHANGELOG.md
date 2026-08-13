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
