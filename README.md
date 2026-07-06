# Ludex Rating Companion

App de notation de films (recherche TMDb, fiche film, watchlist, providers de streaming BE) — front-end statique + une fonction serverless Vercel qui fait office de proxy vers l'API TMDb.

## Structure du projet

```
ludex/
├── index.html            → structure de la page
├── styles.css             → tous les styles et thèmes
├── app.js                  → ⚠️ FICHIER GÉNÉRÉ, ne pas éditer directement (voir src/)
├── src/                    → code source réel de app.js, découpé par thème
│   ├── 00-pwa.js             → enregistrement du service worker
│   ├── 01-navigation.js       → onglets desktop & mobile
│   ├── 02-theme.js            → thèmes & réglages
│   ├── 03-foundation.js       → config, helpers, state, stockage local
│   ├── 04-search.js           → recherche TMDb & auto-complétion
│   ├── 05-rating-form.js      → formulaire de notation (score, tags, sauvegarde...)
│   ├── 06-history.js          → historique, dashboard, stats, tri
│   ├── 07-data-io.js          → export / import
│   ├── 08-watchlist.js        → watchlist & recommandations
│   ├── 09-modal-init.js       → modale de confirmation & initialisation
│   └── 10-cloud-sync.js       → synchronisation cloud (sauvegarde/restauration)
├── scripts/
│   ├── build-app-js.js      → concatène src/*.js dans l'ordre pour produire app.js
│   └── generate-sw-cache.js → calcule le hash de version pour sw.js
├── sw.js                   → service worker (PWA, hors-ligne)
├── manifest.json            → manifeste PWA (icônes, nom, couleurs)
├── favicon.png, icon-192.png, icon-512.png, apple-touch-icon.png
├── api/
│   └── search.js          → fonction serverless Vercel (proxy TMDb + cache)
├── package.json
├── vercel.json
├── .gitignore
└── .env.example           → variable d'environnement nécessaire (TMDB_KEY)
```

### Pourquoi `app.js` est généré

Le fichier faisait à l'origine ~1750 lignes en un seul bloc. Le code est maintenant réparti dans `src/`, mais le navigateur charge toujours un seul fichier classique `app.js` (pas de modules ES, aucun risque de casser l'ordre d'exécution existant). Le script `scripts/build-app-js.js` recolle les fichiers de `src/` bout à bout, dans l'ordre de leur préfixe numérique (`00-`, `01-`, `02-`...), pour reproduire exactement le même comportement qu'avant le découpage.

**Règle à retenir : ne jamais éditer `app.js` directement**, il serait écrasé au prochain build. Édite le fichier concerné dans `src/`, puis régénère avec :
```bash
npm run build:js
```

Vercel régénère aussi `app.js` automatiquement à chaque déploiement (`npm run build`, voir `vercel.json`).

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

## Synchronisation cloud (Supabase)

Permet de sauvegarder historique + watchlist + réglages en ligne (pour ne jamais les perdre) et de les retrouver sur un autre appareil via un "code de synchronisation" que tu choisis toi-même.

1. Crée un compte gratuit sur https://supabase.com et un nouveau projet.
2. Dans le projet, va dans **SQL Editor** → **New query**, colle ceci, puis **Run** :
   ```sql
   create table if not exists ludex_sync (
     sync_code  text primary key,
     payload    jsonb not null,
     updated_at timestamptz not null default now()
   );
   ```
3. Va dans **Settings → API**. Note deux valeurs :
   - **Project URL** (ex: `https://xxxxxxxxxxxx.supabase.co`)
   - **service_role key** (⚠️ pas la clé "anon" — la clé "service_role", à garder secrète)
4. Ajoute-les à ton `.env` local :
   ```
   SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. Ajoute les **mêmes** variables dans Vercel : `Project Settings → Environment Variables` (Production + Preview + Development).
6. Dans l'app, ouvre les réglages (⚙️) → section "Synchronisation cloud" → choisis un code (ex: un mot de passe que toi seul connais) → **Sauvegarder maintenant**.
7. Sur un autre appareil/navigateur, ouvre les réglages, entre le **même code**, clique **Restaurer depuis le cloud**.

La clé `service_role` ne quitte jamais le serveur (elle est utilisée uniquement dans `api/sync.js`, jamais envoyée au navigateur) — c'est cette fonction serverless qui fait l'intermédiaire entre l'app et Supabase.

## 2. Tester en local

Le projet a une fonction serverless (`/api/search.js`), donc un simple `Live Server` sur `index.html` ne suffira pas pour les appels API. Utilise la CLI Vercel :

```bash
npm i -g vercel
vercel dev
```

Cela lance un serveur local qui simule l'environnement Vercel (fichiers statiques + `/api`). Ouvre l'URL affichée (en général `http://localhost:3000`).

⚠️ **`vercel dev` ne relance pas automatiquement le build** (`npm run build`) à chaque modification. Si tu modifies un fichier dans `src/`, régénère `app.js` toi-même avant de tester :
```bash
npm run build:js
```

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

## Points à vérifier

- Le endpoint `/api/search` gère 5 cas via des query params (`query`, `id`, `providers`, `img`, `recommendations`), avec mise en cache CDN adaptée à chaque type de donnée.
- `app.js` est généré depuis `src/` à chaque build — voir la section "Structure du projet" plus haut si tu ajoutes du code.
