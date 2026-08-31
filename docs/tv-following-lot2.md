# Séries — lot 2 : moteur commun de suivi

Branche : `codex/audit-remediation-personal`. Ce lot prolonge
[l'intégrité des données du lot 1](tv-integrity-lot1.md).
Il ne refond pas le design, la disposition Pinterest, les notes indépendantes
des saisons, leurs pondérations ni les films. Aucune migration SQL et aucune
écriture dans la sauvegarde cloud personnelle n'ont été exécutées.

## Règles partagées

| Élément | Règle |
| --- | --- |
| Progression totale | Épisodes vus / épisodes connus de toutes les saisons régulières, y compris non commencées. Saison 0 exclue. Les doublons et numéros invalides ne gonflent pas le résultat. |
| Bleu électrique | Au moins un épisode diffusé reste à regarder. Une note existante ne change pas cet état. |
| Or — À jour | Tous les épisodes disponibles sont vus, mais la série peut avoir des épisodes futurs : la barre n'est donc pas nécessairement à 100 %. |
| Or — Terminée | Tous les épisodes connus sont vus et le catalogue indique une série arrêtée ou annulée. Le badge de production de l'en-tête reste distinct. |
| À vérifier | Catalogue incomplet, dates manquantes ou périmées sans suite vérifiable : ne pas prétendre que la série est terminée. La progression connue est conservée. |
| Prochain épisode | Premier épisode diffusé manquant, par saison puis numéro ; sinon futur, sinon date inconnue. Une ancienne lacune prime sur une saison plus avancée. Aucun calcul « dernière saison + 1 ». |
| Compteur En cours | Une série suivie, non suspendue/masquée, avec une suite disponible, future ou incertaine. Le compteur provient du moteur, pas des cartes DOM. Une future diffusion continue de compter comme auparavant. |
| Dernier épisode | Quand le catalogue est connu et qu'il ne reste aucune suite, la série sort du widget sans effacer ses saisons ni ses notes. |
| Pause / retrait du widget | Champs persistants au niveau série. Reprise / réaffichage depuis le bouton existant de la fiche. Ne supprime ni la série ni la note. |
| Première notation | Saison entièrement vue d'après son total connu. Les notes déjà présentes restent rééditables ; leur moyenne ne dépend que des saisons notées. |

Les saisons présentes seulement dans les anciennes données locales restent
comptées, mais rendent le résultat incertain si elles ne figurent plus dans le
catalogue. L'ancien `catalogEpisodeTotal` n'est qu'un repli lorsque le catalogue
global manque ; il n'est plus écrit lors du rendu de l'historique.

## Organisation

- `src/17c-tv-progress.js` : calculs purs de disponibilité, progression par saison,
  progression globale, statut, pause et prochain épisode. Aucun réseau ni écriture.
- `src/17d-tv-catalogue.js` : catalogue partagé, requêtes dédupliquées et commandes
  communes `setTvEpisodesWatched` / `setTvFollowingState`.
- `src/18-tv-shows.js` : widget, compteurs, affiches d'historique et seuil de
  notation branchés sur ces calculs.
- `src/19-tv-detail.js` : même calcul dans la fiche, ses pastilles, la checklist
  et le bloc « À regarder » ; réponses rattachées à la bonne ouverture de fiche.

Les trois chemins de validation (widget, checklist, « À regarder ») rejoignent
la même transaction du lot 1. La cible est capturée avant les attentes réseau ;
une suppression ou un redémarrage intervenu entre-temps est détecté.
Une saison absente n'est créée que lors d'une action explicite, jamais pour
afficher la suite. La simple consultation n'écrit pas dans l'état personnel.

Les futurs épisodes et ceux sans date fiable ne sont pas cochables. Le rattrapage
en groupe filtre lui aussi les épisodes non diffusés. Une décoche ne nécessite
pas de réseau. Le jour de diffusion est évalué dans la date locale de l'appareil ;
il ne s'agit pas d'une vérification horaire de disponibilité sur chaque plateforme.

## Cache et pannes

Le cache `lbx_tv_catalogue_v1_<id>` est local, jetable, séparé du suivi et exclu
du cloud et de l'export personnel. Fraîcheur : six heures, nouvelle tentative
après erreur : une minute, bouton de réessai explicite pour passer ce délai.
Les requêtes identiques simultanées sont partagées. Les saisons utiles sont
chargées par groupes de trois par série, pas par une limite globale inter-séries.

Si une fiche actualisée annonce un nombre différent d'épisodes, la liste de
la saison est invalidée puis rechargée. Une réponse réseau invalide ou un cache
malformé n'écrase pas les données personnelles. En cas de panne, la dernière
réponse connue reste disponible ; sans réponse exploitable, la série conserve
sa place dans le compteur avec un état à vérifier. Un refus de quota pour le
cache n'empêche pas son usage en mémoire.

Un cache frais peut naturellement ignorer une modification récente de TMDb
jusqu'à la prochaine actualisation. Il ne garantit pas une disponibilité réelle
à la minute ni l'exhaustivité des métadonnées du fournisseur.

## Vérifications

Vérifié le 31 août 2026, sur données synthétiques et API simulées :

- `npm test` : **294 tests réussis**, dont calculs purs, pannes réseau,
  invalidation du cache, réponses inversées, disponibilité, pause/reprise,
  compteur après le dernier épisode et notes préservées.
- Chromium mobile, scénarios `tv-following-engine`, `tv-integrity` et
  `tv-export-sync` : **10 parcours réussis**, incluant la consultation hors ligne,
  la validation croisée widget/fiche/historique, le refus de stockage et les
  écritures concurrentes de deux onglets.
- Capture de la fiche contrôlée : note globale conservée, compteur 3/4,
  statut À jour, pastille sélectionnée maintenue et épisode futur verrouillé.
- Build, lint, contrôle de chargement, budgets et `git diff --check` réussis.
  Cœur compressé : environ 129,0 KiB / 150 KiB.

Le contrôle mobile suit les consignes de vérification Vercel, avec la suite
Playwright du dépôt en remplacement du CLI agent-browser indisponible ici.
Il ne constitue pas un essai sur un véritable iPhone/Safari ni sur le cloud réel.

## Suite et mise en service

Le lot 3 doit encore systématiser les abonnements aux changements locaux,
inter-onglets et cloud pour rafraîchir tous les écrans, ainsi que l'intégration
des séries non notées dans la même grille sans modifier sa composition Pinterest.
Le présent lot raccorde déjà les gestes directs de suivi à la fiche et au widget,
mais ne remplace pas cette orchestration globale. Les brouillons, métadonnées
complémentaires et essais sur appareils réels restent dans les lots suivants.

Aucun commit, push ou déploiement n'a été effectué pendant ce lot. Avant mise
en service, appliquer les sauvegardes et précautions client/API du lot 1.
Ces tests réduisent les risques ; ils ne garantissent pas « zéro erreur ».
