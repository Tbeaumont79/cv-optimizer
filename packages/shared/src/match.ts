/**
 * Contrat du score de match profil ↔ offre (flux « Nouvelle candidature »).
 *
 * Le score sert de garde-fou ÉCONOMIQUE et de service honnête : il est calculé
 * AVANT la génération (peu de tokens) et, s'il est faible, on prévient
 * l'utilisateur qu'il risque un rejet avant de consommer un crédit.
 *
 * Reproductibilité (DoD QA) : les listes matched/missing sont calculées par le
 * CODE (déterministe, normalisation accents/casse) — le LLM ne fournit que le
 * score et ses raisons, bornés et revalidés ici.
 */
import type { AnalyzedOffer } from './offer'
import type { ProfileDTO } from './profile'

/** Rapport de match affiché à l'utilisateur avant génération. */
export interface MatchReport {
  /** Score 0–100 (entier, borné côté code). */
  score: number
  /** 2 à 4 raisons courtes, en français (ex. « Solide sur la gestion de projet »). */
  reasons: string[]
  /** Mots-clés de l'offre couverts par le profil (déterministe, code). */
  matchedKeywords: string[]
  /** Mots-clés de l'offre absents du profil (déterministe, code). */
  missingKeywords: string[]
}

/** Sous le seuil, on alerte avant de consommer un crédit (brief produit). */
export const LOW_MATCH_THRESHOLD = 40 as const
/** Au-dessus, le match est considéré solide (affichage vert). */
export const STRONG_MATCH_THRESHOLD = 70 as const

export type MatchVerdict = 'weak' | 'medium' | 'strong'

/** Verdict dérivé du score — pur, testé. */
export function matchVerdict(score: number): MatchVerdict {
  if (score < LOW_MATCH_THRESHOLD) return 'weak'
  if (score < STRONG_MATCH_THRESHOLD) return 'medium'
  return 'strong'
}

/** Borne le score LLM dans [0, 100] et l'arrondit à l'entier. Pur, testé. */
export function clampScore(raw: number): number {
  if (!Number.isFinite(raw)) return 0
  return Math.min(100, Math.max(0, Math.round(raw)))
}

/** Normalisation pour la comparaison de mots-clés : casse + accents + espaces. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Couverture déterministe des mots-clés de l'offre par le profil.
 * Un mot-clé est « couvert » s'il apparaît (normalisé) dans : libellés de
 * compétences, compétences mobilisées des expériences, intitulés/descriptions
 * d'expériences, headline ou résumé. Pur, testé.
 */
export function computeKeywordCoverage(
  offer: AnalyzedOffer,
  profile: ProfileDTO,
): { matched: string[]; missing: string[] } {
  const haystackParts: string[] = [profile.headline ?? '', profile.summary ?? '']
  for (const s of profile.skills) haystackParts.push(s.label)
  for (const e of profile.experiences) {
    haystackParts.push(e.title, e.company, e.description ?? '', ...e.skillsUsed)
  }
  for (const ed of profile.education) haystackParts.push(ed.degree, ed.school)
  const haystack = normalize(haystackParts.join(' \n '))

  // requiredSkills d'abord (plus signifiants), puis keywords, sans doublons.
  const candidates: string[] = []
  const seen = new Set<string>()
  for (const kw of [...offer.requiredSkills, ...offer.keywords]) {
    const key = normalize(kw)
    if (!key || seen.has(key)) continue
    seen.add(key)
    candidates.push(kw)
  }

  const matched: string[] = []
  const missing: string[] = []
  for (const kw of candidates) {
    if (haystack.includes(normalize(kw))) matched.push(kw)
    else missing.push(kw)
  }
  return { matched, missing }
}

/**
 * JSON Schema (structured outputs) imposé au LLM pour le scoring.
 * Le LLM ne produit QUE score + raisons — les mots-clés viennent du code.
 */
export const MATCH_SCORE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: { type: 'integer' },
    reasons: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'reasons'],
} as const

// ─── Contrats API du flux candidature ────────────────────────────────────────

export const CANDIDATURE_ANALYZE_PATH = '/api/candidature/analyze' as const
export const CANDIDATURE_GENERATE_PATH = '/api/candidature/generate' as const

/** POST /api/candidature/analyze — corps. */
export interface AnalyzeCandidatureRequest {
  /** Texte brut de l'offre collée. */
  offerText: string
}

/** POST /api/candidature/analyze — réponse. */
export interface AnalyzeCandidatureResponse {
  offer: AnalyzedOffer
  match: MatchReport
}

/** POST /api/candidature/generate — corps (l'offre analysée est renvoyée telle quelle). */
export interface GenerateCandidatureRequest {
  offer: AnalyzedOffer
}

/** POST /api/candidature/generate — réponse. */
export interface GenerateCandidatureResponse {
  cv: import('./cv').RenderableCv
}

/** Code d'erreur renvoyé (HTTP 403) quand le quota de générations est épuisé. */
export const QUOTA_EXCEEDED_CODE = 'quota_exceeded' as const
