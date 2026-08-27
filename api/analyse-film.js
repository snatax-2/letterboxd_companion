// ═══════════════════════════════════════════
//  MODULE ANALYSE DE FILM — endpoint Gemini
// ═══════════════════════════════════════════
// Reçoit le texte écrit par l'utilisateur (analyse technique + thématique),
// l'envoie à Gemini avec un prompt de mentor, renvoie un retour structuré
// en JSON. Clé API jamais exposée côté client — uniquement lue ici, côté
// serveur, comme TMDB_KEY dans api/search.js.
//
// Modèle : gemini-flash-latest — gemini-2.5-flash (mon choix initial,
// pourtant listé comme disponible sur la page de tarification au moment
// où j'ai vérifié) s'est révélé inaccessible aux nouveaux comptes/projets
// Google ("no longer available to new users", erreur 404 rencontrée en
// usage réel). L'alias "-latest" pointe automatiquement vers le modèle
// Flash courant, plus robuste qu'un nom de version figé qui peut devenir
// obsolète sans préavis.
import { rateLimit } from './_rateLimit.js';

const MAX_TITLE_LENGTH = 200;
const MAX_ANALYSIS_LENGTH = 5_000;
const MAX_TOTAL_INPUT_LENGTH = 8_000;
const GEMINI_TIMEOUT_MS = 15_000;

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

  // Limite volontairement prudente : le palier gratuit de Gemini a un
  // quota journalier (le montant exact varie selon le modèle et n'a pas
  // été revérifié depuis le changement de modèle) — mieux vaut une limite
  // basse ici (protection contre une boucle accidentelle côté client) que
  // de griller le quota du jour sur un bug.
  if (!(await rateLimit(req, res, { name: 'analyse-film', limit: 30, windowMs: 3600_000 }))) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({ error: 'Trop de requêtes, réessaie dans un instant.' });
  }
  if (!(await rateLimit(req, res, { name: 'analyse-film-global', limit: 100, windowMs: 86_400_000, identifier: 'global' }))) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({ error: "Quota quotidien d'analyse atteint — réessaie demain." });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(503).json({ error: "L'analyse par IA n'est pas encore configurée (clé Gemini manquante)." });
  }

  const titre = typeof req.body?.titre === 'string' ? req.body.titre.trim() : '';
  const technique = typeof req.body?.technique === 'string' ? req.body.technique.trim() : '';
  const theme = typeof req.body?.theme === 'string' ? req.body.theme.trim() : '';
  if (!titre || (!technique && !theme)) {
    return res.status(400).json({ error: 'Titre et au moins un des deux champs (technique ou thématique) sont requis.' });
  }
  if (titre.length > MAX_TITLE_LENGTH || technique.length > MAX_ANALYSIS_LENGTH || theme.length > MAX_ANALYSIS_LENGTH ||
      technique.length + theme.length > MAX_TOTAL_INPUT_LENGTH) {
    return res.status(400).json({ error: 'Analyse trop longue. Limite chaque champ à 5 000 caractères (8 000 au total).' });
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
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 900, temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      }
    );

    if (!r.ok) {
      // 429 de Gemini lui-même (quota journalier épuisé) : message clair
      // plutôt qu'une erreur générique, l'utilisateur doit comprendre que
      // ce n'est pas un bug mais une vraie limite atteinte.
      if (r.status === 429) {
        return res.status(429).json({ error: "Quota Gemini du jour épuisé — réessaie demain (le palier gratuit se réinitialise chaque jour)." });
      }
      console.error(`Gemini upstream error: HTTP ${r.status}`);
      return res.status(502).json({ error: "Le service d'analyse est temporairement indisponible. Réessaie dans un instant." });
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

    const normalizeList = value => Array.isArray(value)
      ? value.filter(item => typeof item === 'string').map(item => item.trim().slice(0, 600)).filter(Boolean).slice(0, 3)
      : [];
    const normalized = {
      synthese: typeof retour?.synthese === 'string' ? retour.synthese.trim().slice(0, 1_000) : '',
      pointsForts: normalizeList(retour?.pointsForts),
      anglesMorts: normalizeList(retour?.anglesMorts),
      questions: normalizeList(retour?.questions),
    };
    if (!normalized.synthese || !normalized.pointsForts.length || !normalized.anglesMorts.length || !normalized.questions.length) {
      return res.status(502).json({ error: "Réponse incomplète du service d'analyse. Réessaie." });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ retour: normalized });
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      return res.status(504).json({ error: "Le service d'analyse met trop de temps à répondre. Réessaie." });
    }
    return res.status(502).json({ error: "Impossible de contacter le service d'analyse. Réessaie dans un instant." });
  }
}
