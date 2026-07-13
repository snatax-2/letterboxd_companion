// Rate limiting simple, en mémoire, partagé par toutes les fonctions API du dossier.
//
// Principe : compte les requêtes par IP sur une fenêtre glissante de `windowMs`.
// Au-delà de `limit`, la requête est refusée (429) jusqu'à la fin de la fenêtre.
//
// Limite connue : ce compteur vit en mémoire de l'instance serverless. Si Vercel
// répartit le trafic sur plusieurs instances, chacune a son propre compteur — ce
// n'est donc pas une limite globale stricte à 100%. C'est néanmoins une protection
// réelle contre un script qui spam, une boucle infinie côté client, ou un usage
// abusif basique, sans avoir besoin d'un stockage externe partagé (Redis...).
//
// Le nom de fichier commence par "_" : Vercel ignore les fichiers/dossiers préfixés
// par un underscore dans /api, ce n'est donc pas exposé comme une route publique.

const buckets = new Map(); // clé: "nom:ip" -> { count, resetAt }

// Purge périodique pour éviter que la Map grossisse indéfiniment sur une instance
// de longue durée (beaucoup d'IP différentes au fil du temps).
let lastCleanup = Date.now();
function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // au plus une fois par minute
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ name: string, limit: number, windowMs: number, identifier?: string }} options
 *   `identifier` permet de limiter par autre chose que l'IP (ex: un code de sync,
 *   pour éviter qu'on essaie de deviner/spammer un code précis depuis plusieurs IP).
 *   Par défaut, limite par IP.
 * @returns {boolean} true si la requête est autorisée, false si la limite est dépassée
 *                     (dans ce cas, les en-têtes 429/Retry-After sont déjà positionnés,
 *                     il ne reste qu'à faire `return` dans le handler appelant).
 */
export function rateLimit(req, res, { name, limit, windowMs, identifier }) {
  cleanupIfNeeded();

  const id = identifier || getClientIp(req);
  const key = `${name}:${id}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;

  const remaining = Math.max(0, limit - bucket.count);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (bucket.count > limit) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return false;
  }
  return true;
}
