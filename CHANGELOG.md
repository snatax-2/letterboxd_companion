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
