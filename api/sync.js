// Synchronisation cloud : sauvegarde/restauration de l'historique + watchlist + réglages
// dans une table Supabase, identifiée par un "code de synchronisation" choisi par l'utilisateur
// (pas de vrai compte/authentification : app personnelle, un code = un jeu de données).
//
// ── MODÈLE DE SÉCURITÉ (revu) ─────────────────────────────────────────────
// Le code de synchronisation est un JETON PORTEUR : le connaître donne accès
// aux données, comme un lien de partage secret. Deux propriétés le rendent
// tenable, là où la version précédente n'en avait aucune :
//
// 1. IL N'EST PAS DEVINABLE. Un nouveau code doit faire au moins
//    MIN_NEW_CODE_LENGTH caractères — le client en génère un aléatoire de 26
//    caractères (~130 bits). Avant, 4 caractères suffisaient : n'importe qui
//    pouvait tester "films", "dario", "test" et lire — ou écraser —
//    l'historique complet de quelqu'un.
//
// 2. IL N'EST JAMAIS STOCKÉ EN CLAIR. La ligne Supabase est indexée par
//    sha256(code), pas par le code lui-même. Une fuite de la base ne donne
//    donc aucun code utilisable. Aucune migration SQL n'est nécessaire : la
//    colonne `sync_code` est déjà du texte, elle contient maintenant un hash.
//
// Le code voyage désormais dans l'en-tête X-Sync-Code plutôt que dans l'URL
// (les query strings finissent dans les journaux d'accès et les caches CDN).
// Le paramètre ?code= reste accepté en repli : un utilisateur dont le service
// worker sert encore une ancienne version de app.js continue de fonctionner.
//
// Codes hérités : une ligne créée avant ce changement est indexée par le code
// en clair. Elle reste lisible (repli explicite ci-dessous) et migre vers sa
// forme hachée à la première écriture, l'ancienne ligne étant alors supprimée
// — sinon un code faible comme "dario" continuerait d'exposer les données.
//
// Variables d'environnement nécessaires (à définir dans Vercel + .env local) :
//   SUPABASE_URL          -> ex: https://xxxxx.supabase.co
//   SUPABASE_SERVICE_KEY  -> clé "service_role" (Supabase > Settings > API)
//                            ⚠️ Ne JAMAIS exposer cette clé côté navigateur : elle
//                            contourne les policies RLS. Elle ne doit vivre que côté
//                            serveur, ce qui est le cas ici (fonction serverless).
//
// Table attendue (SQL à lancer une fois dans Supabase > SQL Editor) :
//   create table if not exists ludex_sync (
//     sync_code  text primary key,
//     payload    jsonb not null,
//     updated_at timestamptz not null default now()
//   );

import { createHash } from 'node:crypto';
import { rateLimit } from './_rateLimit.js';

const TABLE = 'ludex_sync';
const MAX_PAYLOAD_BYTES = 1_500_000;
const MAX_PAYLOAD_DEPTH = 12;
const MAX_PAYLOAD_NODES = 50_000;
const SUPABASE_TIMEOUT_MS = 8_000;
const ALLOWED_PAYLOAD_KEYS = new Set([
  'schemaVersion', 'exportedAt', 'history', 'historyTombstones',
  'tvShows', 'tvShowTombstones', 'tvSeasonTombstones',
  'watchlistsMeta', 'watchlists', 'watchlistTombstones', 'watchlistListTombstones',
  'tvWatchlistsMeta', 'tvWatchlists', 'tvWatchlistTombstones', 'tvWatchlistListTombstones',
  'settings', 'ownedProviders', 'analyses', 'duels', 'draft', 'preferences',
]);

// Longueur minimale d'un code NOUVEAU. Les codes déjà en base sont exemptés
// (voir plus bas) : imposer la règle rétroactivement couperait l'utilisateur
// de ses propres données, ce qui serait pire que le risque qu'on corrige.
const MIN_NEW_CODE_LENGTH = 16;

function isValidCode(code) {
  // Lettres, chiffres, tirets/underscores, 4 à 64 caractères : évite les codes
  // vides, absurdement longs, ou contenant des caractères à risque.
  return typeof code === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(code);
}

// Identifiant réellement stocké en base. Le code en clair ne quitte jamais
// cette fonction.
function storageKey(code) {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

// En-tête d'abord (le code n'apparaît alors ni dans les journaux d'accès ni
// dans les caches CDN), query string en repli pour les clients pas encore
// rechargés.
function readCode(req) {
  const fromHeader = req.headers?.['x-sync-code'];
  if (typeof fromHeader === 'string' && fromHeader.trim()) return fromHeader.trim();
  const fromQuery = req.query?.code; // `?.` : req.query n'est pas garanti hors Vercel
  return typeof fromQuery === 'string' ? fromQuery.trim() : undefined;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 'Corps de requête invalide.';
  const unknownKey = Object.keys(payload).find(key => !ALLOWED_PAYLOAD_KEYS.has(key));
  if (unknownKey) return `Champ de sauvegarde inconnu : ${unknownKey}.`;
  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) return 'Sauvegarde trop volumineuse.';

  let nodes = 0;
  const visit = (value, depth) => {
    nodes++;
    if (nodes > MAX_PAYLOAD_NODES || depth > MAX_PAYLOAD_DEPTH) return false;
    if (!value || typeof value !== 'object') return true;
    return Object.values(value).every(child => visit(child, depth + 1));
  };
  if (!visit(payload, 0)) return 'Sauvegarde trop complexe.';

  const arrayKeys = ['history', 'historyTombstones', 'tvShows', 'tvShowTombstones', 'tvSeasonTombstones',
    'watchlistsMeta', 'watchlistListTombstones', 'tvWatchlistsMeta', 'tvWatchlistListTombstones',
    'ownedProviders', 'analyses'];
  const wrongArray = arrayKeys.find(key => payload[key] !== undefined && !Array.isArray(payload[key]));
  if (wrongArray) return `Le champ ${wrongArray} doit être une liste.`;
  const objectKeys = ['watchlists', 'watchlistTombstones', 'tvWatchlists', 'tvWatchlistTombstones', 'settings', 'duels', 'draft', 'preferences'];
  const wrongObject = objectKeys.find(key => payload[key] !== undefined && payload[key] !== null &&
    (typeof payload[key] !== 'object' || Array.isArray(payload[key])));
  if (wrongObject) return `Le champ ${wrongObject} doit être un objet.`;
  return null;
}

function readRevisionHeader(req, name) {
  const value = req.headers?.[name];
  return typeof value === 'string' ? value.replace(/^W\//, '').replace(/^"|"$/g, '').trim() : '';
}

function fetchSupabase(url, options = {}) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
  });
}

export default async function handler(req, res) {
  // Limite par IP : usage normal = 1 sauvegarde auto/45s + quelques clics manuels,
  // donc 30/min est très large pour un utilisateur légitime.
  if (!(await rateLimit(req, res, { name: 'sync-ip', limit: 30, windowMs: 60_000 }))) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({ error: 'Trop de requêtes, réessaie dans un instant.' });
  }

  const code = readCode(req);

  // Limite par code de synchronisation (indépendamment de l'IP) : empêche de
  // marteler/deviner un code précis en le testant rapidement depuis plusieurs IP.
  // Défense secondaire seulement — le compteur vit en mémoire d'instance et ne
  // résiste pas à un serverless réparti (voir _rateLimit.js). C'est l'entropie
  // du code qui protège réellement, pas cette limite.
  if (typeof code === 'string' && code) {
    if (!(await rateLimit(req, res, { name: 'sync-code', limit: 20, windowMs: 60_000, identifier: storageKey(code) }))) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(429).json({ error: 'Trop de requêtes pour ce code, réessaie dans un instant.' });
    }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: 'Synchronisation cloud non configurée côté serveur.' });
  }

  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  // Récupère la ligne d'un code, sous sa forme hachée d'abord, puis sous sa
  // forme héritée (code en clair). Retourne aussi SOUS QUELLE FORME elle a été
  // trouvée, pour que l'écriture sache s'il y a une ligne héritée à nettoyer.
  async function fetchRow(rawCode) {
    const hashed = storageKey(rawCode);
    for (const [key, legacy] of [[hashed, false], [rawCode, true]]) {
      const url = `${SUPABASE_URL}/rest/v1/${TABLE}?sync_code=eq.${encodeURIComponent(key)}&select=payload,updated_at`;
      const sbRes = await fetchSupabase(url, { headers });
      if (!sbRes.ok) throw new Error('read failed');
      const rows = await sbRes.json();
      if (rows.length) return { row: rows[0], legacy };
    }
    return { row: null, legacy: false };
  }

  try {
    if (req.method === 'GET') {
      if (!isValidCode(code)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(400).json({ error: 'Code de synchronisation invalide.' });
      }

      let found;
      try {
        found = await fetchRow(code);
      } catch {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(502).json({ error: 'Erreur de lecture cloud.' });
      }

      res.setHeader('Cache-Control', 'no-store'); // toujours la donnée la plus fraîche
      if (!found.row) {
        return res.status(200).json({ found: false });
      }
      return res.status(200).json({ found: true, payload: found.row.payload, updatedAt: found.row.updated_at });

    } else if (req.method === 'POST') {
      if (!isValidCode(code)) {
        return res.status(400).json({ error: 'Code de synchronisation invalide.' });
      }

      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = null; }
      }
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Corps de requête invalide.' });
      }
      const payloadError = validatePayload(body);
      if (payloadError) return res.status(400).json({ error: payloadError });

      let existing;
      try {
        existing = await fetchRow(code);
      } catch {
        return res.status(502).json({ error: 'Erreur de lecture cloud.' });
      }

      // Un code qui n'existe nulle part est un code NEUF : c'est le seul moment
      // où on peut exiger une vraie longueur sans couper personne de ses données.
      if (!existing.row && code.length < MIN_NEW_CODE_LENGTH) {
        return res.status(400).json({
          error: `Ce code est trop court pour être sûr (${MIN_NEW_CODE_LENGTH} caractères minimum). Utilise le bouton "Générer un code sûr" dans Réglages.`,
        });
      }

      const hashed = storageKey(code);
      const expectedRevision = readRevisionHeader(req, 'if-match');
      const createOnly = readRevisionHeader(req, 'if-none-match') === '*';
      // Un ancien onglet/PWA ne sait pas conserver les événements v2 des
      // séries. Il doit se mettre à jour, pas réécrire une sauvegarde migrée.
      if (Number(existing.row?.payload?.schemaVersion) >= 3 && Number(body.schemaVersion || 0) < Number(existing.row.payload.schemaVersion)) {
        return res.status(426).json({ error: 'Mets Ludex à jour sur cet appareil avant de synchroniser : cette sauvegarde utilise le nouveau suivi des séries.' });
      }
      if (existing.row && !existing.legacy && !expectedRevision && !createOnly) {
        return res.status(428).json({ error: 'Relis la sauvegarde cloud avant de la modifier.' });
      }
      if (existing.row && (createOnly || (expectedRevision && expectedRevision !== existing.row.updated_at))) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(409).json({
          error: 'La sauvegarde cloud a changé sur un autre appareil.',
          payload: existing.row.payload,
          revision: existing.row.updated_at,
        });
      }

      // Deux écritures dans la même milliseconde doivent changer la révision.
      const updatedAt = new Date(Math.max(Date.now(), (Date.parse(existing.row?.updated_at) || 0) + 1)).toISOString();
      const useAtomicUpdate = !!(existing.row && !existing.legacy && expectedRevision);
      const targetUrl = useAtomicUpdate
        ? `${SUPABASE_URL}/rest/v1/${TABLE}?sync_code=eq.${encodeURIComponent(hashed)}&updated_at=eq.${encodeURIComponent(expectedRevision)}&select=updated_at`
        : `${SUPABASE_URL}/rest/v1/${TABLE}`;
      let sbRes;
      try {
        sbRes = await fetchSupabase(targetUrl, {
          method: useAtomicUpdate ? 'PATCH' : 'POST',
          headers: {
            ...headers,
            Prefer: 'return=representation',
          },
          body: JSON.stringify(useAtomicUpdate
            ? { payload: body, updated_at: updatedAt }
            : { sync_code: hashed, payload: body, updated_at: updatedAt }),
        });
      } catch {
        return res.status(502).json({ error: "Erreur d'écriture cloud." });
      }

      if (!sbRes.ok) {
        // Deux créations simultanées : l'insert perdant relit/fusionne au
        // prochain essai. Un upsert aurait écrasé le gagnant silencieusement.
        if (sbRes.status === 409) {
          const latest = await fetchRow(code);
          return res.status(409).json({ error: 'La sauvegarde cloud a changé sur un autre appareil.', payload: latest.row?.payload || null, revision: latest.row?.updated_at || null });
        }
        const errText = await sbRes.text();
        console.error('Supabase upsert error:', errText);
        return res.status(502).json({ error: "Erreur d'écriture cloud." });
      }
      let writtenRows = null;
      try { writtenRows = await sbRes.json(); } catch { /* traité comme une absence de confirmation ci-dessous */ }
      if (!Array.isArray(writtenRows)) {
        return res.status(502).json({ error: 'Écriture cloud non confirmée. Réessaie pour vérifier la sauvegarde.' });
      }
      if (useAtomicUpdate && Array.isArray(writtenRows) && writtenRows.length === 0) {
        const latest = await fetchRow(code);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(409).json({
          error: 'La sauvegarde cloud a changé sur un autre appareil.',
          payload: latest.row?.payload || null,
          revision: latest.row?.updated_at || null,
        });
      }

      // La ligne héritée (indexée par le code en clair) vient d'être recopiée
      // sous sa forme hachée : on la supprime. La laisser signifierait qu'un
      // code faible comme "dario" continue d'exposer les données — c'est
      // exactement ce que ce changement corrige. Un échec ici ne doit pas faire
      // échouer la synchro elle-même : les données sont déjà sauvegardées.
      if (existing.legacy) {
        try {
          const cleanupRes = await fetchSupabase(`${SUPABASE_URL}/rest/v1/${TABLE}?sync_code=eq.${encodeURIComponent(code)}`, {
            method: 'DELETE',
            headers: { ...headers, Prefer: 'return=minimal' },
          });
          if (!cleanupRes.ok) console.error('Nettoyage de la ligne héritée impossible.');
        } catch (err) {
          console.error('Nettoyage de la ligne héritée impossible :', err);
        }
      }

      return res.status(200).json({ ok: true, revision: updatedAt });

    } else {
      return res.status(405).json({ error: 'Méthode non autorisée.' });
    }
  } catch (error) {
    return res.status(500).json({ error: "Erreur lors de l'appel à la synchronisation cloud." });
  }
}
