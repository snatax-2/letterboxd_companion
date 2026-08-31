# Séries — lot 4 : notation et parcours annexes

31 août 2026. Branche `codex/audit-remediation-personal`, base publiée `db685bc`.
Le lot 3 et le présent lot 4 sont locaux : aucun commit, déploiement, changement
de `main`, écriture Supabase ou essai sur des données personnelles.

## S14 — Formulaire et brouillons

- Un brouillon par cible série/saison, dans des clés locales indépendantes
  `lbx_tv_rating_draft_<showId>:<seasonNumber>`. Le brouillon film historique
  `lbx_draft` reste distinct. Les passages Films/Séries et entre saisons ne
  mélangent plus critique, mode, date ou pondérations.
- Le dernier formulaire Série se retrouve à la prochaine bascule vers Séries,
  y compris après rechargement. La cible doit toujours exister ; un brouillon
  d'une ancienne génération de suivi ne s'applique pas à une reprise nouvelle.
- Les restaurations de formulaire n'écrivent pas de brouillon intermédiaire.
  Les poids et la date sont sauvegardés au geste, pas seulement à la navigation.
- La sauvegarde capture les entrées et leur cible avant d'attendre la file.
  Une saisie ultérieure reste dans son brouillon, même si l'utilisateur change
  de saison pendant l'écriture.
- Une note modifiée ailleurs depuis l'ouverture est refusée à la sauvegarde
  locale, sans écrasement ni perte du brouillon. Pour repartir de la note
  actuelle, l'utilisateur peut effacer explicitement son brouillon via
  « Nouvelle critique », puis rouvrir la saison.
- « Nouvelle critique » ne supprime que le brouillon de la cible active.
  Après sauvegarde, une marque vide empêche un ancien brouillon cloud de
  réapparaître automatiquement sur ce navigateur.
- Les brouillons Séries sont inclus dans `draft.tvDrafts` de l'export et du
  snapshot cloud existants. À l'import, les cibles absentes sont restaurées ;
  une cible locale a priorité. Il ne s'agit pas d'une édition collaborative
  temps réel d'un même brouillon. Les vieux clients ne savent pas en créer.
- Tous les accès « Noter cette saison » passent par `reopenTvSeason`, qui
  ferme la fiche et recharge la bonne date. Une saison incomplète jamais
  notée est refusée aussi par la commande d'écriture ; une note déjà présente
  reste éditable indépendamment des décoches de suivi.
- Les poids historiques inconnus ne sont pas inventés. Sans modification
  des critères/poids, le score ancien est conservé, y compris après changement
  de date ou de critique. Les nouveaux calculs conservent leurs pondérations.
- Copier le texte d'une critique Série utilise désormais la série, la saison,
  sa date et ses critères, sans titre, réalisateur ou tags provenant du film.

## S15 — À voir, import et affiches

- « Commencer à suivre » depuis À voir ouvre la fiche de la série identifiée.
  Consulter ou abandonner ne retire plus la série. Le suivi doit être créé par
  un geste explicite dans la fiche ; le retrait de À voir reste une action
  explicite distincte, disponible dans l'interface existante.
- L'ancien import conserve désormais les métadonnées complètes d'une nouvelle
  série : coup de cœur, pause, masquage, affiche, etc. Sa règle annoncée
  « doublons ignorés » est conservée pour les saisons déjà présentes. L'import
  de sauvegarde complète conserve le moteur de fusion du lot 1.
- Les imports Séries sont validés avant les écritures : identifiants et
  saisons valides, épisodes positifs, notes/critères/poids numériques bornés,
  clés dangereuses et versions futures refusées. Un import Série malformé
  ne commence donc pas par modifier l'historique Films.
- Le choix explicite d'affiche est conservé dans `posterOverride` ; la
  projection `poster_path` reste compatible avec les écrans existants. Une
  métadonnée catalogue distante ne remplace pas cette personnalisation.
- Le sélecteur attend la persistance avant d'afficher un succès. Un échec de
  quota ou une série supprimée ne change pas prématurément l'affiche visible.
  Une ancienne réponse du sélecteur ne remplace pas les variantes d'une autre
  cible ouverte entre-temps.

## S16 — Durées

- Les durées utilisent le catalogue partagé et conservent les anciennes
  valeurs connues si la requête échoue ou si une réponse omet une durée.
- Le total connu est affiché pendant le rafraîchissement, sans repasser
  artificiellement à zéro. Un résultat incomplet utilise « ≥ » ou « À vérifier »
  et précise le nombre d'épisodes sans durée dans le texte existant.
- Un cache périmé conservé est signalé « durées à vérifier ». Une écriture
  tardive ne remplace pas un cache plus récent déjà obtenu ailleurs.
- Seuls les épisodes effectivement vus sont additionnés. Aucun runtime absent
  n'est inventé ; aucun suivi, note ou date de visionnage n'est modifié.

## Vérifications

- `TZ=Europe/Brussels npm test` : **324 tests réussis**, dont 11 nouvelles
  régressions lot 4 (brouillons, écritures concurrentes, import, affiche, durée,
  copie de critique et réponses de sélecteur inversées).
- Build, lint, chargement complet : réussis.
- Budgets inchangés : JavaScript gzip **89,6 / 90 KiB**, cœur **133,4 / 150 KiB**.
  La marge JS devient faible ; prévoir un découpage du chargement avant de
  grossir sensiblement l'application, pas une hausse silencieuse du budget.
- Les 4 nouveaux parcours Chromium mobile passent : brouillons après reload,
  À voir → fiche → suivi, persistance d'affiche, Profil hors ligne. Capture du
  formulaire inspectée ; aucun style n'a été modifié.
- Passe élargie : **42 parcours Chromium mobile réussis**, y compris les
  scénarios des lots précédents, notation Films/Séries, Profil et accessibilité.
- Le test historique de restauration des poids a été adapté pour modifier
  les poids du **film**, puis rouvrir la saison : une modification non sauvée
  de la saison elle-même est désormais un brouillon à conserver, pas à effacer.

Les guides de vérification Vercel ont orienté les parcours UI → stockage →
projection. Ils sont exécutés via Playwright, avec API simulées et données
fictives. Il ne s'agit pas d'une validation iPhone/Safari, PWA installée ou
cloud réel. Aucun changement de critères, pondérations de référence, moyenne
de saisons, grille Pinterest, navigation ou animations approuvées.

## Limites et lot suivant

- Lot 5 : recette réelle sur iPhone, deux appareils et cloud de test, hors ligne,
  reprise PWA et vérification des sauvegardes avant toute migration réelle.
- Les anciens brouillons partagés qui ne précisent pas série/saison ne peuvent
  pas être réattribués avec certitude : leur contenu original est conservé.
- Les anciennes personnalisations d'affiche restent conservées, mais ne peuvent
  être identifiées rétroactivement comme « choix utilisateur » avec certitude.
- Le cloud conserve sa cadence et son déclenchement existants ; ce lot ne
  transforme pas la synchronisation en service temps réel. Le rafraîchissement
  des écrans après réception relève du lot 3.
- L'import multi-collections n'est pas une transaction atomique unique couvrant
  toutes les clés Films/Séries/listes ; la validation préalable évite les formats
  Séries invalides, pas tous les scénarios de quota à mi-import.
- La suite générale reste documentée pour Europe/Brussels ; la dépendance d'un
  ancien test ISO-week au fuseau n'a pas été masquée par un changement de métier.
