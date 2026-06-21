import type { EducationDTO, ExperienceDTO, LanguageDTO, ProfileDTO, SkillDTO } from '@cvo/shared'
import { normalizeDesign } from './cv-design-tokens'

/**
 * Sérialisation Profil (Prisma → DTO transport) et fragment de filtre soft-delete.
 * Fonctions PURES → testables sans base. Règle : on n'expose jamais une ligne
 * dont `deletedAt` est renseigné (RGPD, droit à l'effacement).
 */

/**
 * Fragment Prisma « non supprimé » à réutiliser dans tous les `where` de lecture.
 * Exemple : `prisma.profile.findFirst({ where: { userId, ...NOT_DELETED } })`.
 */
export const NOT_DELETED = { deletedAt: null } as const

/** Date Prisma (ou null) → ISO-8601 string (ou null) pour le transport. */
export function toIso(value: Date | null): string | null {
  return value === null ? null : value.toISOString()
}

/** Forme minimale d'une ligne porteuse de soft-delete (pour le typage des helpers). */
interface SoftDeletable {
  deletedAt: Date | null
}

/** Exclut les lignes soft-delete puis trie par `orderIndex` croissant. */
export function activeOrdered<T extends SoftDeletable & { orderIndex: number }>(rows: T[]): T[] {
  return rows.filter((r) => r.deletedAt === null).sort((a, b) => a.orderIndex - b.orderIndex)
}

// Formes Prisma minimales attendues en entrée (sous-ensemble des modèles).
interface ExperienceRow extends SoftDeletable {
  id: string
  title: string
  company: string
  startDate: Date | null
  endDate: Date | null
  description: string | null
  skillsUsed: string[]
  orderIndex: number
}
interface SkillRow extends SoftDeletable {
  id: string
  label: string
  level: SkillDTO['level']
  years: number | null
  orderIndex: number
}
interface EducationRow extends SoftDeletable {
  id: string
  degree: string
  school: string
  startDate: Date | null
  endDate: Date | null
  description: string | null
  orderIndex: number
}
interface LanguageRow extends SoftDeletable {
  id: string
  label: string
  level: LanguageDTO['level']
  orderIndex: number
}
interface ProfileRow {
  id: string
  fullName: string | null
  email: string | null
  phone: string | null
  location: string | null
  links: string[]
  keySkills: string[]
  headline: string | null
  summary: string | null
  experiences: ExperienceRow[]
  skills: SkillRow[]
  education: EducationRow[]
  languages: LanguageRow[]
  // Colonne Json Prisma — forme `CvDesign` (ou null). Validée à l'écriture.
  baseCvDesign?: unknown
}

function toExperienceDTO(e: ExperienceRow): ExperienceDTO {
  return {
    id: e.id,
    title: e.title,
    company: e.company,
    startDate: toIso(e.startDate),
    endDate: toIso(e.endDate),
    description: e.description,
    skillsUsed: e.skillsUsed,
    orderIndex: e.orderIndex,
  }
}

function toSkillDTO(s: SkillRow): SkillDTO {
  return { id: s.id, label: s.label, level: s.level, years: s.years, orderIndex: s.orderIndex }
}

function toLanguageDTO(l: LanguageRow): LanguageDTO {
  return { id: l.id, label: l.label, level: l.level, orderIndex: l.orderIndex }
}

function toEducationDTO(ed: EducationRow): EducationDTO {
  return {
    id: ed.id,
    degree: ed.degree,
    school: ed.school,
    startDate: toIso(ed.startDate),
    endDate: toIso(ed.endDate),
    description: ed.description,
    orderIndex: ed.orderIndex,
  }
}

/**
 * Mappe un profil Prisma (avec relations) vers le DTO transport : exclut les
 * enfants soft-delete et garantit l'ordre d'affichage.
 */
export function toProfileDTO(profile: ProfileRow): ProfileDTO {
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    links: profile.links,
    keySkills: profile.keySkills,
    headline: profile.headline,
    summary: profile.summary,
    experiences: activeOrdered(profile.experiences).map(toExperienceDTO),
    skills: activeOrdered(profile.skills).map(toSkillDTO),
    education: activeOrdered(profile.education).map(toEducationDTO),
    languages: activeOrdered(profile.languages).map(toLanguageDTO),
    baseCvDesign: profile.baseCvDesign ? normalizeDesign(profile.baseCvDesign) : null,
  }
}
