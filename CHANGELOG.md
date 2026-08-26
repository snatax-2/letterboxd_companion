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

Résumé condensé — le détail complet (raisonnement, bugs trouvés en
cours de route, captures de mesures) vit dans
[docs/journal-2026.md](docs/journal-2026.md).

### Ajouté
- **Phase 4 du plan d'exécution de l'audit expert — responsive desktop.** Le point le plus lourd et le plus risqué du plan.
- **Phase 3 du plan d'exécution de l'audit expert — UI.**
- **Phase 2 du plan d'exécution de l'audit expert — UX.**
- **Phase 1 du plan d'exécution de l'audit expert — fondations du système de design.** Rien de visible pour l'utilisateur dans cette phase (c'était volontaire, voir le plan) — le travail prépare les phases suivantes.
- **Fiche série détaillée**
- **Glissement sur les lignes de saison (Historique)** — glisser à gauche révèle "Supprimer", à droite "Modifier", un tap sur l'indice confirme, exactement comme pour les films.
- **Historique — parité films/séries, 2e vague : filtre par genre.**
- **Historique — parité films/séries, 1ère vague : filtre par note et suppression par saison.**
- **Widget "En cours" dans l'onglet Noter (mode Série uniquement)** — une carte verticale par série ayant un épisode à regarder, tout en haut, au-dessus de la recherche.
- **Module Séries — Phase 5 : statistiques.** Bascule Films/Séries sur le tableau de bord analytique (Profil).
- **Module Séries — Phase 4 : Historique scindé Films/Séries.** Bascule façon Détaillé/Rapide (pas un filtre dans une liste mélangée — une carte de saison et une carte de film n'ont pas le même contenu à afficher).
- **Module Séries — Phase 3 : notation de saison.**
- **Module Séries — Phase 2 : suivi épisode par épisode.**
- **Module Séries — Phase 1 : recherche et sélection de saison.**
- **Deuxième vague de finitions UX** (suite de l'audit design).
- **Correctifs issus d'un audit design complet**
- **Finitions visuelles du module Analyse de film (Phase 4)**
- **Module Analyse de film** (Phases 0 à 2 du document de référence) — un onglet Analyse sur chaque fiche film, à côté de la note.
- **Bouton "Noter" mis en avant**
- **Habillage visuel de l'anecdote**.
- **Accordéon "Chiffres clés"** (natif `<details>/<summary>`, gratuit en accessibilité clavier).
- **Indices progressifs enrichis** pour "Devine le Film du Jour".
- **Anecdotes réelles pour le Film du Jour**
- **Mini-jeu "Devine le Film du Jour"**

### Modifié
- **Phase 5 du plan d'exécution de l'audit expert — extraction de code.** Le point le plus mécanique du plan, mais avec le risque le plus élevé de casse silencieuse si mal fait.
- **Widget "En cours" : cartes redessinées, repli possible.**
- **Chercher une série dans Noter ouvre directement sa fiche détaillée** — les puces de choix de saison ont disparu de Noter, remplacées par la fiche complète (en-tête, casting, synopsis, progression par saison).
- **Ombre du bouton "Noter" de la barre de navigation resserrée** — le flou et l'opacité de l'ombre portée créaient un effet d'encadrement visible sur les deux onglets voisins ("À voir", "Découvrir").
- **Refonte du suivi épisode par épisode : la grille complète déménage entièrement dans la fiche série, l'onglet Noter devient plus léger.** Choisir une saison dans Noter (recherche manuelle) ne montre plus la grille à cocher — trois cas selon l'état de la saison.
- **Effet verre dépoli plus transparent**
- **Bouton "Noter" agrandi et recentré**
- **Bouton "Noter" recentré**
- **Carte "Par pays" : retour au même design en lignes que les décennies** (retour utilisateur.
- **Vercel Speed Insights** — méthode "site statique sans npm" (deux balises `<script>` dans `index.html`), pas le composant Next.js.
- **Notes IMDb/Rotten Tomatoes/Metacritic (OMDb)** sur la fiche film, uniquement quand elle est ouverte explicitement (jamais sur les grilles qui listent plein de films à la fois).
- **Bascules Réglages pour les 4 dernières fonctionnalités Découvrir**
- **"D'après tes goûts"** dans Découvrir (angle mort ciblé) — la dernière des cinq idées de découverte, et la plus longue à construire.
- **"Ce jour-là"** dans Découvrir, aux côtés du Film du jour — anniversaires de sortie.
- **Exploration par thème** dans Découvrir — mots-clés TMDb (indépendants des genres classiques.
- **Carte du monde du cinéma** dans "Classiques à explorer" (Profil) — troisième onglet accordéon, aux côtés des décennies et des studios.
- **Explorateur de studio** dans "Classiques à explorer" (Profil) — nouvel onglet accordéon aux côtés des décennies.
- **Contraste et icônes de la fiche Film du Jour** (retour utilisateur, capture à l'appui).
- **Anecdotes Wikipédia retirées** (retour utilisateur.
- **Auto-suggestion de titres pour "Devine le Film du Jour"**.
- **Refonte de l'affichage PC : système d'onglets unique** (comme sur mobile) plutôt que la grille à deux colonnes (Noter toujours à gauche + onglets internes à droite).
- **Fusion de "Film du jour" et "Devine le Film du Jour"** en une seule carte.
- **Carte "Par pays" repensée visuellement** (retour utilisateur.

### Corrigé
- **Phase 6 du plan d'exécution de l'audit expert — vérifications finales.** La phase la plus courte sur le papier, mais qui a débusqué le bug le plus subtil de tout ce travail.
- **Profil : les points laissés de côté lors de l'audit UX/design précédent, traités sur demande explicite.**
- **Audit UX/design complet, sur demande explicite (hors Profil, exclu à la demande de l'utilisateur) :**
- **Audit complet de l'application (données/accessibilité), sur demande explicite — 4 vrais problèmes trouvés et corrigés :**
- **Ombre du bouton "Noter" — vraie correction cette fois.** Le correctif de la session précédente (flou réduit de 14px à 8px) n'a pas suffi — l'utilisateur a confirmé que le problème persistait.
- **Glissement sur la carte de série entière (Historique)** — jusqu'ici le glissement n'existait que sur les lignes de saison, une fois la liste dépliée ; il fallait donc déplier avant de pouvoir supprimer.
- **Parité fiche film / fiche série** — suite à un audit demandé explicitement, comparant les deux fiches fonction par fonction.
- **Largeurs inégales dans la barre de navigation, signalées par l'utilisateur** — confirmées visuellement (jusqu'à 88px pour "Historique" contre 46px pour "À voir", qui passait sur deux lignes).
- **Minification JS/CSS dans le pipeline de build** — jamais mesuré jusqu'ici, un audit performance complet (LCP/CLS mesurés en conditions réelles, CPU ×4 + réseau dégradé) a montré un LCP de 4.7s (seuil "bon".
- **3 tests obsolètes trouvés en validant la minification, sans rapport avec elle** — révélés par une vérification plus large que d'habitude.
- **Audit UX/design complet — 4 vrais défauts trouvés et corrigés, vérifiés dans le code réel plutôt que devinés**.
- **`item.stars` sans protection dans l'Historique** — contrairement à la fiche film qui protège déjà ce même champ (`localMatch.stars || ''`), l'historique ne le faisait pas.
- **Vrai bug introduit par la dernière livraison, signalé par l'utilisateur**.
- **Vrai chevauchement latéral trouvé sur appareil réel, corrigé**
- **Vrai défaut de contraste trouvé en revérifiant les 7 thèmes après cet agrandissement**.
- **Vrai bug trouvé en retirant le badge "Mode détaillé" en double**.
- **Vrai bug trouvé en construisant les finitions Phase 4, avant même qu'il n'atteigne la livraison**.
- **`gemini-2.5-flash` remplacé par `gemini-flash-latest`**
- **Vrai bug trouvé en testant le module**.
- **Vrai bug préexistant trouvé en testant le nouveau bouton**.
- **Vrai bug trouvé suite à un signalement utilisateur, avec capture d'écran à l'appui**.
- **Vrai bug trouvé suite à un signalement utilisateur**.
- **Vrai bug trouvé en écrivant les tests des studios**.
- **Bascule "Devine le Film du Jour"**
- **Fiche saga** — quand un film appartient à une collection TMDb (ex.
- **Accordéon pour les listes par décennie** dans "Classiques à explorer" (retour utilisateur, capture à l'appui).
- **"Classiques à explorer"** dans Profil — deux natures de listes bien distinctes, jamais mélangées.
- **Synopsis en encart distinct**
- **Pastilles A/B/C/D et icônes ✓/✗** sur les réponses du Quiz du jour, pour un vrai esprit "quiz télé" et une lisibilité qui ne dépend pas seulement de la couleur.
- **Vrai bug trouvé en révisant l'affichage du Quiz**.
- **Carte anecdote peu lisible signalée par l'utilisateur** (capture d'écran à l'appui).
- **Bug majeur d'affichage PC**.
- **Vrai bug trouvé en diagnostiquant un signalement utilisateur** ("les anecdotes restent sur TMDb").
- **Vrai bug trouvé en vérifiant la réorganisation Découvrir/Profil des duels** (déjà en place depuis une session précédente).
- **Vrai bug trouvé suite à un retour utilisateur** ("les anecdotes semblent toujours basées sur TMDb").

### Retiré
- **Thème Méridien** , sur demande (non utilisé).

### Modifié — Refonte complète des thèmes
- **10 → 7 thèmes.**
- **Nouveau thème "Carnet de Voyage"** — fusion d'Anderson et Journal (pas de Cinéphile, qui reste intact séparément).
- **Méridien**.
- **Moderne** repensé autour du Bauhaus/modernisme architectural.

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
