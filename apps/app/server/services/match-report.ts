/**
 * Score de match profil ↔ offre (flux « Nouvelle candidature »).
 *
 * Étape AVANT génération : peu de tokens (Sonnet, effort low), pour alerter
 * l'utilisateur si l'adéquation est faible avant de consommer un crédit.
 *
 * Répartition LLM / code (DoD QA, cf. @cvo/shared/match) :
 * - le LLM ne fournit QUE { score, reasons } — bornés et revalidés ici ;
 * - matched/missingKeywords sont calculés par le CODE (déterministe).
 */
import {
  MATCH_SCORE_SCHEMA,
  STRONG_MATCH_THRESHOLD,
  clampScore,
  computeKeywordCoverage,
  type AnalyzedOffer,
  type MatchReport,
  type ProfileDTO,
} from '@cvo/shared'
import { anthropicComplete, type LlmComplete } from '../utils/anthropic'

const SYSTEM = `Tu es un évaluateur HONNÊTE de l'adéquation entre un profil candidat et une offre d'emploi.
Tu reçois le profil RÉEL du candidat et l'offre analysée. Tu rends :
- "score" : un entier 0-100 mesurant l'adéquation réelle (0 = aucun rapport, 100 = correspondance parfaite) ;
- "reasons" : 2 à 4 raisons courtes en français, concrètes, citant les forces ET les manques du profil face à l'offre.
RÈGLES ABSOLUES : juge uniquement sur les éléments présents dans le profil. N'invente JAMAIS une compétence,
une expérience ou une formation absente du profil. Ne flatte pas : un profil hors sujet mérite un score bas.`

/** Bornes des raisons affichées (le schema LLM ne contraint pas la longueur). */
const MAX_REASONS = 4

/** Plafond appliqué quand le score LLM contredit une couverture mots-clés nulle. */
const NO_COVERAGE_SCORE_CAP = 60

/** Raison ajoutée quand le garde-fou de cohérence plafonne le score. */
const NO_COVERAGE_REASON =
  "Score plafonné : aucun mot-clé de l'offre n'a été retrouvé dans le profil."

export interface MatchReportDeps {
  complete: LlmComplete
}

/** Nettoie les raisons LLM : strings non vides, trim, au plus MAX_REASONS. Pur. */
function sanitizeReasons(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is string => typeof r === 'string')
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
    .slice(0, MAX_REASONS)
}

/**
 * Construit le rapport de match : score LLM borné + raisons nettoyées + couverture
 * de mots-clés déterministe. Garde-fou de cohérence : un score « fort »
 * (> STRONG_MATCH_THRESHOLD) sans AUCUN mot-clé couvert est invraisemblable —
 * on le plafonne à NO_COVERAGE_SCORE_CAP et on l'explique à l'utilisateur.
 */
export async function buildMatchReport(
  profile: ProfileDTO,
  offer: AnalyzedOffer,
  deps: MatchReportDeps = { complete: anthropicComplete },
): Promise<MatchReport> {
  const result = (await deps.complete({
    system: SYSTEM,
    user: JSON.stringify({ profilReel: profile, offreAnalysee: offer }),
    schema: MATCH_SCORE_SCHEMA as unknown as Record<string, unknown>,
    costLabel: 'match-score',
    effort: 'low',
    maxTokens: 1024,
  })) as { score?: unknown; reasons?: unknown }

  const { matched, missing } = computeKeywordCoverage(offer, profile)

  let score = clampScore(Number(result.score))
  let reasons = sanitizeReasons(result.reasons)

  if (score > STRONG_MATCH_THRESHOLD && matched.length === 0) {
    score = NO_COVERAGE_SCORE_CAP
    reasons = [...reasons.slice(0, MAX_REASONS - 1), NO_COVERAGE_REASON]
  }

  return { score, reasons, matchedKeywords: matched, missingKeywords: missing }
}
