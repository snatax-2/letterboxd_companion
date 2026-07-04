# Ludex Rating Companion

App de notation de films (recherche TMDb, fiche film, watchlist, providers de streaming BE) — front-end statique + une fonction serverless Vercel qui fait office de proxy vers l'API TMDb.

## Structure du projet

```
ludex/
├── index.html          → structure de la page (avant : tout était dans un seul fichier)
├── styles.css           → tous les styles et thèmes (extraits du <style> inline)
├── app.js                → toute la logique front (extraite du <script> inline)
├── favicon.png           → à ajouter (référencé par index.html, absent de l'upload d'origine)
├── api/
│   └── search.js         → fonction serverless Vercel (proxy TMDb + cache image)
├── package.json
├── .gitignore
└── .env.example          → variable d'environnement nécessaire (TMDB_KEY)
```

Le fichier original faisait 2800+ lignes en un seul `.html` (CSS + JS + markup mélangés). Séparer en 3 fichiers permet :
- l'autocomplétion / linting correct dans VS Code (un `.html` de 130 Ko empêche souvent l'extension CSS/JS de bien fonctionner) ;
- un diff Git lisible (modifier une couleur ne touche plus à 2800 lignes de JS) ;
- un chargement mis en cache par le navigateur (`styles.css`/`app.js` sont mis en cache séparément du HTML).

## 1. Mise en place dans VS Code

1. Installer [VS Code](https://code.visualstudio.com/) et l'extension **Vercel** (optionnel) + **ESLint**/**Live Server** si besoin.
2. Ouvrir le dossier `ludex/` dans VS Code (`File > Open Folder`).
3. Récupérer une clé API TMDb sur https://www.themoviedb.org/settings/api si ce n'est pas déjà fait.
4. Copier `.env.example` en `.env` et renseigner ta clé :
   ```
   cp .env.example .env
   ```
   puis éditer `.env` :
   ```
   TMDB_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## 2. Tester en local

Le projet a une fonction serverless (`/api/search.js`), donc un simple `Live Server` sur `index.html` ne suffira pas pour les appels API. Utilise la CLI Vercel :

```bash
npm i -g vercel
vercel dev
```

Cela lance un serveur local qui simule l'environnement Vercel (fichiers statiques + `/api`). Ouvre l'URL affichée (en général `http://localhost:3000`).

## 3. Passage sur GitHub

Depuis le terminal intégré de VS Code, à la racine de `ludex/` :

```bash
git init
git add .
git commit -m "Initial commit: structure Ludex Rating Companion"
```

Puis crée un dépôt vide sur https://github.com/new (sans README ni .gitignore, pour éviter les conflits), et lie-le :

```bash
git branch -M main
git remote add origin https://github.com/<ton-utilisateur>/<nom-du-repo>.git
git push -u origin main
```

`.env` est ignoré par Git (voir `.gitignore`) : ta clé API ne partira jamais sur GitHub.

## 4. Déploiement sur Vercel

1. Va sur https://vercel.com/new et importe le dépôt GitHub que tu viens de créer.
2. Vercel détecte automatiquement :
   - les fichiers statiques à la racine (`index.html`, `styles.css`, `app.js`) ;
   - `api/search.js` comme fonction serverless (Node.js).
3. **Avant de déployer**, ajoute la variable d'environnement dans l'écran de configuration du projet (ou après, dans `Settings > Environment Variables`) :
   - Nom : `TMDB_KEY`
   - Valeur : ta clé TMDb
   - Environnements : Production, Preview, Development
4. Clique sur **Deploy**.

Chaque nouveau `git push` sur `main` redéploiera automatiquement en production ; chaque push sur une autre branche/PR génère un déploiement de preview isolé.

## Points à vérifier après la migration

- Ajouter le fichier `favicon.png` à la racine (il était référencé mais absent de l'upload).
- Le endpoint `/api/search` gère 5 cas via des query params (`query`, `id`, `providers`, `img`, `recommendations`) — inchangé par rapport à l'original, aucune modif de logique métier n'a été faite, seulement la structuration des fichiers.
