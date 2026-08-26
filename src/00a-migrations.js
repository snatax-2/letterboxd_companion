// ═══════════════════════════════════════════
//  MIGRATIONS DE SCHÉMA
// ═══════════════════════════════════════════
// Les données vivent dans localStorage sans serveur pour les faire évoluer :
// quand la FORME d'un item change (nouveau champ obligatoire, renommage...),
// les données déjà en place chez l'utilisateur doivent être mises à niveau au
// chargement, sinon le code qui suppose la nouvelle forme casse.
//
// Principes de sécurité, dans l'ordre d'importance :
// 1. NON DESTRUCTIF EN CAS D'ÉCHEC : si une migration lève une erreur, on
//    s'arrête, on ne sauvegarde rien de partiel, et la version stockée reste
//    celle de la dernière migration réussie — l'app tourne avec les données
//    telles quelles plutôt que de risquer de les corrompre.
// 2. SAUVEGARDE PRÉ-MIGRATION : avant toute chaîne de migrations, une copie de
//    l'historique (la donnée critique) est posée dans une clé dédiée, écrasée
//    à chaque nouvelle chaîne — un filet de dernier recours.
// 3. MIGRATIONS IDEMPOTENTES : chaque étape peut être rejouée sans effet
//    (propriété vérifiée par les tests) — protège contre les doubles exécutions.
//
// Ce fichier est nommé 00a-* pour s'exécuter AVANT tout code qui lit les
// données (concaténation alphabétique du build). Les clés sont en littéraux
// ici (pas STORE_KEY) : les const des fichiers suivants n'existent pas encore
// à cet instant de l'exécution (zone morte temporelle).

(function runSchemaMigrations() {
  const VERSION_KEY = 'lbx_schema_version';
  const HISTORY_KEY = 'lbx_v2'; // = STORE_KEY de 03-foundation.js
  const BACKUP_KEY = 'lbx_pre_migration_backup';

  // Chaque migration : { to: <version cible>, up: () => void }.
  // Elles s'exécutent en séquence depuis la version stockée.
  const MIGRATIONS = [
    {
      to: 2,
      up: () => {
        // v2 : normalise chaque item d'historique (savedAt, values, title
        // garantis) — voir normalizeHistoryItemV2 dans 03b-pure-logic.js.
        // Ce fichier s'exécute avant 03b : la fonction est disponible quand
        // même car les DÉCLARATIONS de fonctions du script concaténé sont
        // hissées avant toute exécution.
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return;
        const history = JSON.parse(raw);
        if (!Array.isArray(history)) return;
        const migrated = history.map(normalizeHistoryItemV2);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(migrated));
      },
    },
  ];

  const CURRENT_VERSION = MIGRATIONS.length > 0 ? MIGRATIONS[MIGRATIONS.length - 1].to : 1;

  let stored;
  try { stored = parseInt(localStorage.getItem(VERSION_KEY), 10); } catch { stored = NaN; }
  if (isNaN(stored)) stored = 1; // données d'avant le versioning = baseline v1

  if (stored >= CURRENT_VERSION) return; // à jour, rien à faire

  // Filet de dernier recours : copie de l'historique avant la chaîne
  try {
    const current = localStorage.getItem(HISTORY_KEY);
    if (current) {
      localStorage.setItem(BACKUP_KEY, JSON.stringify({ fromVersion: stored, at: new Date().toISOString(), history: current }));
    }
  } catch { /* le quota peut refuser la copie : la migration reste tentée */ }

  for (const migration of MIGRATIONS) {
    if (migration.to <= stored) continue;
    try {
      migration.up();
      stored = migration.to;
      localStorage.setItem(VERSION_KEY, String(stored));
    } catch (e) {
      // Échec : on s'arrête là, version inchangée depuis la dernière réussite,
      // données intactes. L'app fonctionne avec l'ancien schéma.
      console.error(`Migration vers v${migration.to} échouée (données intactes) :`, e);
      break;
    }
  }
})();
