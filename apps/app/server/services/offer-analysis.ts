/**
 * Pipeline THI-124 §1 — Analyse de l'offre collée.
 *
 * Entrée : texte brut de l'offre. Sortie : `AnalyzedOffer` structurée (titre,
 * compétences requises, mots-clés, séniorité). Cette sortie ne sert que de
 * consignes de tri au moteur de matching — jamais de source de contenu CV.
 */
import { ANALYZED_OFFER_SCHEMA, type AnalyzedOffer } from '@cvo/shared'
import { anthropicComplete, LlmError, type LlmComplete } from '../utils/anthropic'

const SYSTEM = `Tu analyses une offre d'emploi et tu en extrais un résumé structuré.
Reste STRICTEMENT fidèle au texte de l'offre : n'invente aucune compétence ni mot-clé absent.
Normalise l'intitulé du poste. Déduis la séniorité (junior|mid|senior|lead) seulement si l'offre la précise, sinon null.`

/** Borne de garde : on n'envoie pas un texte d'offre démesuré au modèle. */
const MAX_OFFER_CHARS = 20_000

export interface AnalyzeOfferDeps {
  complete: LlmComplete
}

/**
 * Analyse une offre collée. `deps.complete` est injecté (réel en prod, faux en test).
 */
export async function analyzeOffer(
  rawOffer: string,
  deps: AnalyzeOfferDeps = { complete: anthropicComplete },
): Promise<AnalyzedOffer> {
  const text = rawOffer.trim()
  if (!text) throw new LlmError('Offre vide : rien à analyser')

  const result = (await deps.complete({
    system: SYSTEM,
    user: text.slice(0, MAX_OFFER_CHARS),
    schema: ANALYZED_OFFER_SCHEMA as unknown as Record<string, unknown>,
    costLabel: 'offer-analysis',
    effort: 'low',
    maxTokens: 1024,
  })) as AnalyzedOffer

  return {
    title: result.title,
    requiredSkills: result.requiredSkills ?? [],
    keywords: result.keywords ?? [],
    seniority: result.seniority ?? null,
  }
}
