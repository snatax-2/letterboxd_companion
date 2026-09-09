# Séries — lot 1 : intégrité et migration

Branche : `codex/audit-remediation-personal`. Aucun changement de design,
aucune migration SQL, aucune écriture dans la sauvegarde cloud réelle pendant
le développement. Ce lot ne termine pas l'ensemble de l'audit.

## Contrat de données

| Élément | Rôle |
| --- | --- |
| `lbx_tv_state_v2` | État local faisant foi : séries, tombstones de séries et de saisons dans une seule écriture atomique. |
| `lbx_tv_shows` et anciennes clés de tombstones | Projections de compatibilité ; jamais relues comme source après migration. |
| `_sync.version = 2` | Métadonnées techniques par série/saison, indépendantes du design. |
| `_sync.fields` | Date technique de modification par champ : une note ne remplace pas la progression. |
| `_sync.episodes` | État vu/non vu horodaté par épisode ; conserve explicitement les décochements. |
| `_sync.createdAt` | Début d'une nouvelle génération lors d'un ajout ou d'une reprise après suppression. |
| `_sync.legacyDate` | Ancienne date de note, gelée à la normalisation pour le seul repli historique des suppressions. Ce n'est pas une date technique inventée. |
| Snapshot `schemaVersion = 3` | Protège la sauvegarde cloud contre les écritures des anciens clients qui perdraient ces métadonnées. |

Les écrans continuent de lire `seasons`, `watchedEpisodes`, `rating`, etc.
La note globale reste calculée à partir des seules saisons notées.
Les compteurs, pastilles, couleurs et disposition Pinterest ne sont pas redessinés.

## Écriture et fusion

- Une seule file locale, étendue aux onglets par Web Locks lorsque disponible.
- Le mutateur recharge l'état au début de sa transaction. La fusion cloud est
  calculée à cet endroit, puis attend l'enregistrement avant d'afficher le résultat.
- Les changements de suivi, note, pause, affiche et autres champs sont fusionnés
  indépendamment. Les épisodes distincts modifiés simultanément sont conservés.
- Égalité d'horodatage sur un épisode : « non vu » gagne ; sur un autre champ,
  comparaison déterministe de la valeur. L'ordre local/distant ne tranche plus.
- Les tombstones séries ne sont plus purgés après 90 jours. Ils accompagnent
  atomiquement la suppression. Une reprise explicite a une génération plus récente.
- Le hash de synchronisation accuse réception du snapshot effectivement envoyé.
  Une modification pendant le POST, ou un élément local ajouté lors d'une
  restauration, reste à envoyer.
- Les POST sont sérialisés. Les conflits 409 sont relus/refusionnés, avec trois
  tentatives au maximum. Le serveur utilise une révision conditionnelle pour les
  mises à jour et un insert non écrasant pour les créations concurrentes.
- Une ancienne version reçoit 426 au lieu d'écraser un snapshot migré.
  Une écriture sur une sauvegarde existante sans révision reçoit 428.

## Formulaire et premier suivi

- Changer de série ou créer une nouvelle critique invalide l'ancienne saison.
- Une sauvegarde en attente capture série, saison et données du formulaire avant
  de rejoindre la file ; elle ne lit plus une sélection globale qui a changé.
- Les accès « Noter cette saison » utilisent le même chemin de réouverture.
- Une première coche dans une série non suivie crée réellement sa série et sa saison.
  Si le stockage refuse l'écriture, aucune coche ni confirmation fictive n'est affichée.
- Les nouvelles notes détaillées conservent leurs pondérations. Une ancienne note
  dont les poids sont inconnus conserve son score tant que les curseurs/poids ne
  changent pas : modifier seulement le commentaire ou la date ne la recalcule pas.
- Le dessin décoratif des étoiles ne capte plus les clics destinés à la demi-étoile
  voisine (`pointer-events: none`) ; dimensions, forme et couleurs inchangées.

## Migration et retour arrière

La migration est paresseuse : première transaction locale, import ou fusion cloud.
La simple lecture ne modifie pas les données. Avant le premier commit v2, les
valeurs brutes des trois anciennes clés sont copiées sous
`lbx_recovery_tv_before_v2_<hash>`. Cette copie est incluse dans l'export manuel
(`recovery`), jamais envoyée au cloud. Si la copie échoue, la migration s'arrête.
Elle est idempotente. Un état v2 illisible est conservé et bloque les écritures :
aucun retour silencieux à une projection v1 éventuellement périmée.

Avant un déploiement sur les données réelles :

1. Exporter et vérifier une sauvegarde complète de chaque appareil encore non synchronisé.
2. Tester sur une copie et un code cloud de test distinct ; ne pas réutiliser le code personnel.
3. Déployer ensemble le client et l'API, puis recharger tous les appareils/onglets.
4. Vérifier une coche, une décoche, une note de S2 préservant S1 et un aller-retour cloud.

Un retour à l'ancien code seul ne suffit pas : il ne comprend pas l'état v2 et
ses écritures cloud sont volontairement refusées. En cas de rollback, arrêter
d'abord la synchronisation, conserver un export de l'état courant ET de la copie
pré-migration, puis choisir explicitement quelle sauvegarde restaurer. Ne jamais
supprimer les clés v2 ni forcer un downgrade de snapshot pour « débloquer » l'app.

## Vérifications et limites

Régressions dans `tests/tv-integrity.test.js`, `tests/sync-auth.test.js` et
`tests/e2e/tv-integrity.spec.js`. Les tests emploient uniquement des données
synthétiques et des API simulées ; ils ne valident pas une écriture sur la base réelle.

Résultats du 31 août 2026 :

- `npm test` : 271 tests réussis, aucun échec.
- Scénarios `tv-integrity` et `tv-export-sync` sur Chromium mobile : 7 réussis,
  dont une écriture concurrente depuis deux onglets et un refus de stockage.
- `npm run build` : compilation, lint et génération du cache réussis.
- `node scripts/check-load.js` et `git diff --check` : réussis.
- `npm run quality:budgets` : réussi ; cœur compressé de 126,4 KiB pour un budget
  de 150 KiB.
- Capture mobile de la fiche vérifiée : note conservée, progression globale et
  pastilles des deux saisons présentes, sans modification de leur disposition.

Ces résultats ne remplacent pas les essais sur iPhone/Safari ni l'aller-retour
avec un environnement cloud de test avant déploiement.

Restent les lots 2 à 5 de l'audit : moteur commun de catalogue/prochain épisode,
pause/reprise et disponibilité, rafraîchissement cohérent des écrans, réponses
réseau périmées, brouillons film/série séparés, puis validation complète sur
appareils réels. Sans Web Locks, la file ne couvre qu'un onglet ; ne pas considérer
le cas multi-onglets d'un ancien navigateur comme garanti. Les ambiguïtés de
chronologie des anciennes sauvegardes sans horodatage ne sont pas récupérables
avec certitude. Le repli conserve les épisodes positifs et tranche les anciennes
notes par date, puis de façon déterministe ; la sauvegarde originale reste disponible.

Aucune garantie absolue de « zéro bug » n'est formulée.
