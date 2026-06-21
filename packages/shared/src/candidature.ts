/**
 * Contrats partagés — Candidature persistée (offre analysée + CV généré éditable
 * + suivi). Le CV devient durable et alimente la liste de suivi des candidatures.
 */
import type { AnalyzedOffer } from './offer.js'
import type { MatchReport } from './match.js'
import type { CvDesign, RenderableCv } from './cv.js'

/** Cycle de vie d'une candidature (miroir de l'enum SQL CandidatureStatus). */
export type CandidatureStatus = 'DRAFT' | 'SUBMITTED' | 'INTERVIEW' | 'REJECTED' | 'ACCEPTED'

export const CANDIDATURE_STATUSES: readonly CandidatureStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'INTERVIEW',
  'REJECTED',
  'ACCEPTED',
] as const

/** Libellés FR pour l'UI. */
export const CANDIDATURE_STATUS_LABELS: Record<CandidatureStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Postulé',
  INTERVIEW: 'Entretien',
  REJECTED: 'Refusé',
  ACCEPTED: 'Accepté',
}

/** Élément de liste (léger — pas de gros JSON). Pour la page de suivi. */
export interface CandidatureListItemDTO {
  id: string
  label: string
  status: CandidatureStatus
  matchScore: number
  createdAt: string // ISO-8601
  updatedAt: string
}

/** Candidature complète (pour l'éditeur). */
export interface CandidatureDTO extends CandidatureListItemDTO {
  offer: AnalyzedOffer
  match: MatchReport
  cv: RenderableCv
  /** Design par-candidature, ou null (→ fallback profil/défaut au rendu). */
  design: CvDesign | null
}

/** PATCH /api/candidatures/:id — champs modifiables (tous optionnels). */
export interface UpdateCandidatureRequest {
  cv?: RenderableCv
  design?: CvDesign | null
  status?: CandidatureStatus
  label?: string
}

export const CANDIDATURES_PATH = '/api/candidatures' as const
