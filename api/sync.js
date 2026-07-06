// Synchronisation cloud : sauvegarde/restauration de l'historique + watchlist + réglages
// dans une table Supabase, identifiée par un "code de synchronisation" choisi par l'utilisateur
// (pas de vrai compte/authentification : app personnelle, un code = un jeu de données).
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

const TABLE = 'ludex_sync';

function isValidCode(code) {
  // Lettres, chiffres, tirets/underscores, 4 à 64 caractères : évite les codes
  // vides, absurdement longs, ou contenant des caractères à risque.
  return typeof code === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(code);
}

export default async function handler(req, res) {
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

  try {
    if (req.method === 'GET') {
      const code = req.query.code;
      if (!isValidCode(code)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(400).json({ error: 'Code de synchronisation invalide.' });
      }

      const url = `${SUPABASE_URL}/rest/v1/${TABLE}?sync_code=eq.${encodeURIComponent(code)}&select=payload,updated_at`;
      const sbRes = await fetch(url, { headers });
      if (!sbRes.ok) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(502).json({ error: 'Erreur de lecture cloud.' });
      }
      const rows = await sbRes.json();
      res.setHeader('Cache-Control', 'no-store'); // toujours la donnée la plus fraîche
      if (!rows.length) {
        return res.status(200).json({ found: false });
      }
      return res.status(200).json({ found: true, payload: rows[0].payload, updatedAt: rows[0].updated_at });

    } else if (req.method === 'POST') {
      const code = req.query.code;
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

      const url = `${SUPABASE_URL}/rest/v1/${TABLE}`;
      const sbRes = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'resolution=merge-duplicates,return=minimal', // upsert sur la clé primaire sync_code
        },
        body: JSON.stringify({
          sync_code: code,
          payload: body,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!sbRes.ok) {
        const errText = await sbRes.text();
        console.error('Supabase upsert error:', errText);
        return res.status(502).json({ error: "Erreur d'écriture cloud." });
      }

      return res.status(200).json({ ok: true });

    } else {
      return res.status(405).json({ error: 'Méthode non autorisée.' });
    }
  } catch (error) {
    return res.status(500).json({ error: "Erreur lors de l'appel à la synchronisation cloud." });
  }
}
