/**
 * Contrat de l'analyse d'offre (THI-124, pipeline §1). Architecture §4a.
 *
 * L'offre collée par l'utilisateur est analysée par Claude (sortie structurée)
 * pour produire ce résumé. ⚠️ Garde-fou produit : ce résumé sert UNIQUEMENT de
 * **consignes de tri/reformulation** au moteur de matching — il n'est JAMAIS une
 * source de contenu du CV. Le contenu vient exclusivement du profil réel
 * (`ProfileDTO`), et chaque élément rendu porte sa `provenance` (voir `cv.ts`).
 */

/** Séniorité déduite de l'offre. `null` si l'offre ne la précise pas. */
export type OfferSeniority = 'junior' | 'mid' | 'senior' | 'lead'

export const OFFER_SENIORITIES: readonly OfferSeniority[] = [
  'junior',
  'mid',
  'senior',
  'lead',
] as const

/** Résumé structuré d'une offre d'emploi (sortie LLM, étape 1 du pipeline). */
export interface AnalyzedOffer {
  /** Intitulé du poste, normalisé (ex. « Développeur Front-end Vue.js »). */
  title: string
  /** Compétences explicitement requises ou souhaitées par l'offre. */
  requiredSkills: string[]
  /** Mots-clés saillants (techno, domaine, soft skills) pour la priorisation. */
  keywords: string[]
  /** Séniorité attendue, ou `null` si non précisée. */
  seniority: OfferSeniority | null
}

/**
 * JSON Schema (structured outputs) imposé à Claude pour l'analyse d'offre.
 * `additionalProperties: false` partout : on rejette toute clé hallucinée.
 */
export const ANALYZED_OFFER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    requiredSkills: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'array', items: { type: 'string' } },
    seniority: { type: ['string', 'null'], enum: [...OFFER_SENIORITIES, null] },
  },
  required: ['title', 'requiredSkills', 'keywords', 'seniority'],
} as const
