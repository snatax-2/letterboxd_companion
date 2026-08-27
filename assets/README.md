# Assets sources

## `ludex-icon-master.png`

Master officiel de l'icône LUDEX, 1254 × 1254, fourni par l'auteur du projet.

**Source de vérité pour l'identité visuelle de l'application.** Ne pas
redessiner, recadrer, recolorer ni redimensionner ce fichier : il sert
uniquement à régénérer les déclinaisons ci-dessous.

Tous les assets d'icône du dépôt en dérivent :

| Fichier                  | Taille    | Dérivation                                    |
| ------------------------ | --------- | --------------------------------------------- |
| `favicon.png`            | 32×32     | master redimensionné                          |
| `apple-touch-icon.png`   | 180×180   | master redimensionné                          |
| `icon-192.png`           | 192×192   | master redimensionné                          |
| `icon-256.png`           | 256×256   | master redimensionné — écran de démarrage     |
| `icon-512.png`           | 512×512   | master redimensionné                          |
| `icon-maskable-192.png`  | 192×192   | master à 80 %, centré sur noir                |
| `icon-maskable-512.png`  | 512×512   | master à 80 %, centré sur noir                |
| `og-image.png`           | 1200×630  | master à 86 % de la hauteur, centré sur noir  |

Les deux variantes *maskable* existent parce qu'Android applique un masque
qui rogne les bords : la zone de sécurité impose environ 10 % de marge de
chaque côté. Le master y est donc **mis à l'échelle**, jamais recadré —
l'illustration reste entière, seule une marge noire est ajoutée. Le noir de
remplissage est relevé sur les coins du master lui-même (`#000000`), donc la
jonction est invisible.

### Régénérer

Aucune dépendance n'est ajoutée au projet : le script s'exécute avec Pillow
installé à la demande (`pip install Pillow`), en dehors de `package.json`.

```python
from PIL import Image
src = Image.open('assets/ludex-icon-master.png').convert('RGB')
fond = src.getpixel((0, 0))  # noir du master

for nom, taille in [('favicon.png', 32), ('apple-touch-icon.png', 180),
                    ('icon-192.png', 192), ('icon-256.png', 256), ('icon-512.png', 512)]:
    src.resize((taille, taille), Image.LANCZOS).save(nom, 'PNG', optimize=True)

for taille in (192, 512):
    toile = Image.new('RGB', (taille, taille), fond)
    interne = round(taille * 0.80)
    toile.paste(src.resize((interne, interne), Image.LANCZOS),
                ((taille - interne) // 2,) * 2)
    toile.save(f'icon-maskable-{taille}.png', 'PNG', optimize=True)

L, H = 1200, 630
toile = Image.new('RGB', (L, H), fond)
interne = round(H * 0.86)
toile.paste(src.resize((interne, interne), Image.LANCZOS),
            ((L - interne) // 2, (H - interne) // 2))
toile.save('og-image.png', 'PNG', optimize=True)
```

Après régénération, relancer `node scripts/generate-sw-cache.js` : le
`CACHE_NAME` du service worker est un hash du contenu réel de ces fichiers,
donc les remplacer invalide automatiquement le cache des utilisateurs.

`tests/e2e/branding-icones.spec.js` vérifie que tout ce tableau reste vrai.
