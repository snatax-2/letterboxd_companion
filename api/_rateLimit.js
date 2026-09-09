// Rate limiting partagé par toutes les fonctions API du dossier.
//
// Principe : compte les requêtes par IP (ou par identifiant fourni) sur une
// fenêtre glissante de `windowMs`. Au-delà de `limit`, la requête est refusée
// (429) jusqu'à la fin de la fenêtre.
//
// ── POURQUOI UN COMPTEUR PARTAGÉ ────────────────────────────────────────────
// La version précédente comptait dans une Map en mémoire. En serverless, ça ne
// tient pas : Vercel répartit le trafic sur de nombreuses instances et les
// recycle en permanence, donc chaque démarrage à froid remettait les compteurs
// à zéro. Contre un script qui énumère des codes de synchronisation, la
// protection était proche de zéro — or c'est précisément le scénario qu'elle
// doit couvrir (voir api/sync.js).
//
// Upstash Redis (via l'intégration Vercel Marketplace) donne un compteur
// réellement partagé entre les instances.
// INCR y est atomique : deux requêtes simultanées ne peuvent pas lire la même
// valeur et l'écraser mutuellement.
//
// ── REPLI ───────────────────────────────────────────────────────────────────
// Si KV n'est pas configuré (développement local, déploiement sans store
// provisionné), on retombe sur le compteur en mémoire. Il est imparfait pour
// les raisons ci-dessus, mais vaut mieux que pas de limite du tout — et
// surtout, l'absence de KV ne doit JAMAIS empêcher l'API de répondre.
//
// Le nom de fichier commence par "_" : Vercel ignore les fichiers préfixés par
// un underscore dans /api, ce n'est donc pas exposé comme une route publique.

let redisClient = null;
let redisChecked = false;
let redisFallbackWarned = false;

export function resolveRedisConfig(env = process.env) {
  // Les anciens stores Vercel KV migrés conservent généralement les noms KV_*.
  // Les intégrations Upstash récentes injectent plutôt UPSTASH_REDIS_REST_*.
  // Accepter les deux évite une coupure lors du déploiement de la migration.
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function getRedis() {
  if (redisChecked) return redisClient;
  redisChecked = true;
  const config = resolveRedisConfig();
  if (!config) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis(config);
  } catch {
    // Paquet absent : on reste sur le repli mémoire plutôt que de planter.
    redisClient = null;
  }
  return redisClient;
}

// ─── Repli en mémoire (voir en-tête) ────────────────────────────────────────
const buckets = new Map(); // clé: "nom:id" -> { count, resetAt }

let lastCleanup = Date.now();
function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // au plus une fois par minute
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

function countInMemory(key, windowMs) {
  cleanupIfNeeded();
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;
  return { count: bucket.count, resetAt: bucket.resetAt };
}

async function countInRedis(redis, key, windowMs) {
  const ttlSeconds = Math.ceil(windowMs / 1000);
  const count = await redis.incr(key);
  if (count === 1) {
    // Première requête de la fenêtre : c'est elle qui pose l'expiration.
    await redis.expire(key, ttlSeconds);
  }
  const remainingTtl = await redis.ttl(key);
  const resetAt = Date.now() + (remainingTtl > 0 ? remainingTtl : ttlSeconds) * 1000;
  return { count, resetAt };
}

// L'en-tête x-forwarded-for est en partie sous le contrôle du client : il peut
// y préfixer une valeur de son choix, et l'ancienne implémentation prenait
// justement la PREMIÈRE — donc celle de l'attaquant, qui obtenait ainsi un
// compteur neuf à chaque requête. x-vercel-forwarded-for et x-real-ip sont
// posés par la plateforme et ne sont pas influençables.
function getClientIp(req) {
  const vercelIp = req.headers?.['x-vercel-forwarded-for'];
  if (typeof vercelIp === 'string' && vercelIp.trim()) return vercelIp.split(',')[0].trim();
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
  // Repli hors Vercel : on prend la DERNIÈRE valeur de x-forwarded-for, celle
  // ajoutée par le proxy le plus proche, plutôt que la première fournie par le client.
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    const parts = fwd.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ name: string, limit: number, windowMs: number, identifier?: string }} options
 *   `identifier` permet de limiter par autre chose que l'IP (ex: le hash d'un
 *   code de sync, pour empêcher de marteler un code précis depuis plusieurs IP).
 * @returns {Promise<boolean>} true si la requête est autorisée, false si la limite
 *   est dépassée (les en-têtes de quota et Retry-After sont alors déjà posés,
 *   il ne reste qu'à répondre 429 dans le handler appelant).
 */
export async function rateLimit(req, res, { name, limit, windowMs, identifier }) {
  const id = identifier || getClientIp(req);
  const key = `rl:${name}:${id}`;

  let bucket;
  let backend = 'memory';
  try {
    const redis = await getRedis();
    if (redis) {
      bucket = await countInRedis(redis, key, windowMs);
      backend = 'redis';
    } else {
      bucket = countInMemory(key, windowMs);
    }
  } catch (error) {
    // Redis injoignable : pour cette application personnelle, on privilégie la
    // disponibilité tout en signalant clairement le mode dégradé dans les logs
    // et les en-têtes. Le quota global redevient alors local à chaque instance.
    if (!redisFallbackWarned) {
      redisFallbackWarned = true;
      console.warn('Rate limit Redis indisponible, repli mémoire actif:', error instanceof Error ? error.message : 'erreur inconnue');
    }
    bucket = countInMemory(key, windowMs);
    backend = 'memory-fallback';
  }

  const remaining = Math.max(0, limit - bucket.count);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
  res.setHeader('X-RateLimit-Backend', backend);

  if (bucket.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    return false;
  }
  return true;
}
