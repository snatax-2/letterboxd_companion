# Identité LUDEX — phase P8

`ludex-icon-source.png` est le visuel approuvé : L ivoire à empattements,
encadré d'une pellicule noire texturée. Ne pas le régénérer lors d'un build.

Les six PNG à la racine sont des exports de cette source. Pour les refaire :

```sh
node scripts/generate-app-icons.js
```

Ce script facultatif utilise ImageMagick (`convert`). Les fichiers produits
sont versionnés ; le déploiement normal n'a pas besoin d'ImageMagick.

- Favicon : 64 × 64.
- Apple Touch Icon : 180 × 180, opaque, sans coins découpés.
- Icônes ordinaires : 192 × 192 et 512 × 512.
- Icônes adaptables Android : mêmes tailles, source réduite à 72 % sur fond
  opaque afin de préserver le cadre dans la zone sûre circulaire de rayon 40 %.

Les références utilisent `?v=ludex-l1`. Lors d'un futur changement de visuel,
mettre à jour cette version dans `index.html`, `manifest.json` et `sw.js`.
`scripts/generate-sw-cache.js` inclut chaque export dans le hash du cache.
La source haute résolution n'est pas précachée ni téléchargée au démarrage.

## Recette P9 restant à effectuer après publication

- Ouvrir la branche de prévisualisation sur iPhone et vérifier le favicon,
  l'écran de démarrage et l'icône proposée par « Sur l'écran d'accueil ».
- Vérifier une installation Android, notamment les masques rond et carré.
- Recharger hors ligne après une première ouverture connectée.
- Contrôler les installations existantes : leur icône peut rester gérée
  par le système indépendamment de la mise à jour du service worker.
- Ne pas effacer les données locales ni désinstaller une installation
  personnelle sans avoir vérifié la sauvegarde des notes et du suivi.

Référence zone sûre : https://web.dev/articles/maskable-icon
