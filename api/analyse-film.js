// ═══════════════════════════════════════════
//  MODULE ANALYSE DE FILM — endpoint Gemini
// ═══════════════════════════════════════════
// Reçoit le texte écrit par l'utilisateur (analyse technique + thématique),
// l'envoie à Gemini avec un prompt de mentor, renvoie un retour structuré
// en JSON. Clé API jamais exposée côté client — uniquement lue ici, côté
// serveur, comme TMDB_KEY dans api/search.js.
//
// Modèle : gemini-2.5-flash — vérifié encore disponible gratuitement et pas
// sur la liste des modèles mis à la retraite (contrairement à Gemini 2.0
// Flash, arrêté le 1er juin 2026). Des générations plus récentes existent
// (Gemini 3.x) mais 2.5 Flash reste un choix valide, pas obsolète.
import { rateLimit } from './_rateLimit.js';

const SYSTEM_INSTRUCTION = `Tu es un mentor en analyse filmique, exigeant mais bienveillant. L'utilisateur t'envoie sa propre analyse d'un film (technique et/ou thématique) — ton rôle est de l'aider à progresser, pas de faire l'analyse à sa place.

Réponds UNIQUEMENT avec un objet JSON valide de cette forme exacte, sans texte avant ni après :
{
  "synthese": "une ou deux phrases résumant le niveau d'analyse atteint",
  "pointsForts": ["point fort 1", "point fort 2"],
  "anglesMorts": ["angle mort 1", "angle mort 2"],
  "questions": ["question 1 pour approfondir", "question 2"]
}

Règles impératives :
- Toujours ancré dans le texte précis que l'utilisateur a écrit — jamais de retour générique qui pourrait s'appliquer à n'importe quelle analyse.
- Si un champ (technique ou thématique) est vide ou très court, ne l'ignore pas silencieusement : mentionne-le dans anglesMorts plutôt que de faire comme s'il n'existait pas.
- pointsForts et anglesMorts : 2 à 3 éléments chacun, concis (une phrase par élément).
- questions : 1 à 3 questions ouvertes, pensées pour faire réfléchir, pas de simples questions fermées.
- Toujours en français.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Limite volontairement prudente : le palier gratuit de Gemini tourne
  // autour de 250 requêtes/jour au total pour ce modèle — mieux vaut une
  // limite basse ici (protection contre une boucle accidentelle côté
  // client) que de griller le quota du jour sur un bug.
  if (!rateLimit(req, res, { name: 'analyse-film', limit: 30, windowMs: 3600_000 })) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({ error: 'Trop de requêtes, réessaie dans un instant.' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(503).json({ error: "L'analyse par IA n'est pas encore configurée (clé Gemini manquante)." });
  }

  const { titre, technique, theme } = req.body || {};
  if (!titre || (!technique && !theme)) {
    return res.status(400).json({ error: 'Titre et au moins un des deux champs (technique ou thématique) sont requis.' });
  }

  const userContent = `Film : ${titre}\n\nAnalyse technique (cadrage, lumière, montage, son, mise en scène) :\n${technique || '(non renseigné)'}\n\nAnalyse thématique (sujet apparent vs réel, comment la forme sert le fond) :\n${theme || '(non renseigné)'}`;

  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': GEMINI_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ parts: [{ text: userContent }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!r.ok) {
      // 429 de Gemini lui-même (quota journalier épuisé) : message clair
      // plutôt qu'une erreur générique, l'utilisateur doit comprendre que
      // ce n'est pas un bug mais une vraie limite atteinte.
      if (r.status === 429) {
        return res.status(429).json({ error: "Quota Gemini du jour épuisé — réessaie demain (le palier gratuit se réinitialise chaque jour)." });
      }
      // Diagnostic TEMPORAIRE : remonte le détail exact renvoyé par Gemini
      // (statut + message) plutôt qu'un message générique qui masquait la
      // vraie cause — nécessaire pour diagnostiquer à distance sans accès
      // aux journaux de la fonction sur Vercel. À simplifier une fois la
      // cause réelle identifiée et corrigée.
      let detail = '';
      try {
        const errBody = await r.json();
        detail = errBody?.error?.message || JSON.stringify(errBody).slice(0, 300);
      } catch {
        detail = await r.text().catch(() => '').then(t => t.slice(0, 300));
      }
      return res.status(502).json({ error: `Gemini a renvoyé une erreur (${r.status}) : ${detail || 'détail indisponible'}` });
    }

    const data = await r.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(502).json({ error: 'Réponse vide de Gemini. Réessaie.' });
    }

    let retour;
    try {
      retour = JSON.parse(rawText);
    } catch {
      // responseMimeType:"application/json" force normalement un JSON valide,
      // mais un modèle reste un modèle — filet de sécurité si jamais.
      return res.status(502).json({ error: "Réponse de Gemini dans un format inattendu. Réessaie." });
    }

    return res.status(200).json({ retour });
  } catch {
    return res.status(502).json({ error: 'Impossible de contacter Gemini. Vérifie ta connexion et réessaie.' });
  }
}

