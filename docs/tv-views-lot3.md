# Séries — lot 3 : rafraîchissement des projections

Base : `db685bc`, branche `codex/audit-remediation-personal`.
Le doublon local `db6e4b7` a été écarté par rebase après vérification de
l'identité des deux arbres Git. Aucun changement de `main`, aucune écriture
dans le cloud personnel. Travail local, non commité et non déployé.

## Périmètre implémenté

Le widget En cours, la fiche ouverte, l'historique Séries et le Profil sont
invalidés après une écriture réussie dans l'état local v2. Cela couvre les
gestes directs, notes, pause/reprise, suppressions, imports et fusions cloud
sans demander à chaque appelant de connaître tous les écrans à rafraîchir.

- `persistTvState` compare les états normalisés et émet `ludex:tv-changed`
  uniquement après un commit réussi et réellement différent. Les refus de
  stockage n'émettent pas de faux succès et une migration sans changement
  visible ne provoque pas de reconstruction superflue.
- `19b-tv-views.js` regroupe les invalidations dans une tâche différée.
  Les versions de rendu sont invalidées immédiatement pour ignorer une
  ancienne réponse réseau. Une erreur dans une projection n'annule pas le
  commit déjà enregistré et n'empêche pas les autres projections.
- Les événements `storage` relisent l'état actuel, pas leur payload
  éventuellement périmé. En v2, les écritures des anciennes projections sont
  ignorées. Aucun POST cloud n'est déclenché par ce mécanisme.
- Retour sur un onglet, restauration de page et reconnexion réseau demandent
  une actualisation. La politique de cache du lot 2 reste applicable.
- Un catalogue nouvellement reçu actualise les projections concernées,
  les compteurs, les nouvelles pastilles et la checklist. Il ne crée pas de
  suivi personnel. Un catalogue d'une autre série ne bloque pas la fiche ouverte.

## Conservation des interactions

- La fiche n'est plus rouverte à chaque pause/reprise ou suppression partielle.
  Sa saison active, ses boutons de coche, le focus et le scroll sont conservés.
- Notes, moyenne, boutons d'action, affiche personnalisée et progression sont
  actualisés en place. Le formulaire de notation n'est pas rechargé : une
  synchronisation ne remplace pas le brouillon que l'utilisateur est en train
  d'écrire. La gestion complète des brouillons reste au lot 4.
- Une suppression provenant d'ailleurs laisse la fiche catalogue consultable,
  sans ancienne note, coche, ni action de notation invalide. Une suppression
  explicite de la dernière saison depuis sa fiche la ferme comme auparavant.
- Les cartes du widget sont conservées par identifiant de série. Un synopsis
  ouvert reste ouvert tant qu'il s'agit du même épisode ; il est replié quand
  l'épisode change. Le repli global du widget n'est pas modifié.
- Un contrôle disparu ne transfère pas le focus au bouton de validation du
  nouvel épisode. Cela évite qu'une seconde pression sur Espace le coche.
- L'historique conserve scroll et focus sémantique pendant sa reconstruction.
  Un enrichissement Séries tardif n'écrit plus dans le résumé ou les filtres Films.
- Le Profil visible est recalculé ; sinon il est marqué à actualiser à sa
  prochaine ouverture. Son activité mensuelle est aussi actualisée côté Séries.
  Les anciennes réponses de durée et animations de compteur sont invalidées.

Ni CSS, ni critères, ni pondérations, ni règle de moyenne ne sont modifiés.
Le statut de production dans l'en-tête et le statut personnel dans la
progression conservent leurs emplacements distincts.

## S12 — Dernière activité : choix confirmé et implémenté

Le 31 août 2026, l'utilisateur a choisi « Épisodes vu ou note » pour Récents.
`tvLatestActivity` fournit désormais une date unique au tri et aux groupes
mensuels : la plus récente parmi les dates choisies pour les notes présentes
et les dates de coche des épisodes encore vus. Une série apparaît une seule
fois ; les séries non notées datables partagent réellement la grille mensuelle
et son calcul Pinterest avec les séries notées.

- La commande commune de coche enregistre `watchedAt`, date réelle du geste,
  dans l'événement de l'épisode. `updatedAt` reste uniquement l'horloge logique
  d'arbitrage ; même une horloge technique future ne fausse pas Récents.
- Une coche identique est sans effet ; une décoche retire ce visionnage du
  calcul. Cocher de nouveau enregistre la nouvelle date.
- La date choisie dans le formulaire de note reste la référence : modifier
  une vieille note sans changer sa date ne la transforme pas en note du jour.
- Un démarrage sans épisode vu, une pause, une affiche, un coup de cœur ou
  une synchronisation seuls ne constituent pas une activité pour ce tri.
- Normalisation et import ne datent pas artificiellement les anciens épisodes.
  Le champ facultatif est conservé par export/import et fusion, avec arbitrage
  déterministe si deux copies du même événement ont la même horloge.
- Les anciennes données sans date métier fiable restent à la fin, quel que
  soit leur statut de notation. Elles rejoindront un mois dès une activité
  datable. Un ancien client ne sachant pas enregistrer `watchedAt` ne permet
  pas de dater rétroactivement ses nouvelles coches.
- Les timestamps sont regroupés dans le mois du fuseau local ; une date de
  note sans heure reste un jour civil. Les dates invalides ne participent pas
  au tri ; un événement importé au format invalide est refusé sans perte.
- La moyenne d'un groupe exclut les séries non notées, tandis que son compte
  les inclut. La vedette « Dernière série notée » conserve son sens initial.

Aucun changement du moteur Pinterest, des styles, filtres ou autres tris.
S12 est résolu ; le lot 3 est implémenté en local, sous réserve des essais réels
sur iPhone et cloud de test mentionnés ci-dessous.

## Vérifications

Le 31 août 2026 :

- `TZ=Europe/Brussels npm test` : 313 tests réussis, dont 19 nouvelles
  régressions pour le lot 3 (5 ciblent la dernière activité).
- Les 5 tests d'activité passent aussi avec les fuseaux UTC et America/New_York,
  notamment le changement de mois autour de minuit local.
- Build, lint et chargement complet : réussis.
- Budgets après S12 : JavaScript gzip 87,1 KiB / 90 ; cœur total gzip
  130,9 KiB / 150.
- Tests Chromium mobile : 26 parcours réussis après S12, dont les 2 nouveaux
  parcours activité sombre/clair, avec accessibilité et captures inspectées.
- La nouvelle suite couvre des événements `storage` réels avec deux onglets,
  une fusion cloud simulée, notes/décoches/suppression, le brouillon, le repli,
  le synopsis et le focus. Les tests existants couvrent import/export,
  intégrité, suivi et parité de l'historique.
- Trois anciens scénarios de suppression sont adaptés au comportement déjà
  validé : ouvrir une pastille avant de chercher son bouton de suppression.
- Chromium, absent initialement, a été installé. La vérification suit les
  guides Vercel via Playwright, le CLI agent-browser étant indisponible.

Les API sont simulées et les données synthétiques. Aucun essai sur un
véritable iPhone/Safari ni écriture sur le cloud personnel n'est effectué.
Le calcul/cache des durées métier et la séparation complète des brouillons
sont complétés dans le lot 4, documenté dans `tv-rating-lot4.md`.
Le test historique de semaine ISO dépend du fuseau du
processus : le passage est documenté pour Europe/Brussels, pas pour tous les fuseaux.
