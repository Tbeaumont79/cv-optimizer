/**
 * Sérialisation Candidature (Prisma → DTO transport). Fonctions pures → testables
 * sans base. Dates en ISO ; design re-normalisé ; gros JSON castés vers les types
 * partagés. Les lignes soft-delete ne sont jamais exposées (filtre dans le where).
 */
import type {
  AnalyzedOffer,
  CandidatureDTO,
  CandidatureListItemDTO,
  CandidatureStatus,
  MatchReport,
  RenderableCv,
} from '@cvo/shared'
import { toIso } from './profile-serialize'
import { normalizeDesign } from './cv-design-tokens'

/** Forme Prisma minimale (sous-ensemble du modèle Candidature). */
export interface CandidatureRow {
  id: string
  label: string
  status: CandidatureStatus
  matchScore: number
  offerSnapshot: unknown
  matchReport: unknown
  generatedCv: unknown
  design: unknown
  createdAt: Date
  updatedAt: Date
}

/** Vue liste (légère) — pas besoin des gros JSON. */
export function toCandidatureListItemDTO(
  row: Pick<CandidatureRow, 'id' | 'label' | 'status' | 'matchScore' | 'createdAt' | 'updatedAt'>,
): CandidatureListItemDTO {
  return {
    id: row.id,
    label: row.label,
    status: row.status,
    matchScore: row.matchScore,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  }
}

/** Vue complète (éditeur). */
export function toCandidatureDTO(row: CandidatureRow): CandidatureDTO {
  return {
    ...toCandidatureListItemDTO(row),
    offer: row.offerSnapshot as AnalyzedOffer,
    match: row.matchReport as MatchReport,
    cv: row.generatedCv as RenderableCv,
    design: row.design ? normalizeDesign(row.design) : null,
  }
}
