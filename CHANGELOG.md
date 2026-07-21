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
