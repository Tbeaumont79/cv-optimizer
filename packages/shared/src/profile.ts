/**
 * Contrats partagés client ↔ serveur (Nitro) pour le PROFIL candidat.
 * Aligné sur le data model THI-120 §2 / THI-123 (tables users, profiles,
 * experiences, skills, education).
 *
 * Garde-fou produit : ces données déclarées sont la SEULE source de vérité du
 * futur moteur (THI-124). Jamais d'invention en aval.
 *
 * Forme transport (DTO) : dates en ISO-8601 (string) côté client ; le serveur
 * sérialise les `Date` Prisma avant de répondre. Les enregistrements soft-delete
 * (`deletedAt` non null) ne sont jamais exposés ici.
 */

/** Niveau de maîtrise déclaré d'une compétence (miroir de l'enum SQL SkillLevel). */
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'

export const SKILL_LEVELS: readonly SkillLevel[] = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
] as const

/** Expérience professionnelle déclarée. `endDate` null = poste en cours. */
export interface ExperienceDTO {
  id: string
  title: string
  company: string
  startDate: string | null
  endDate: string | null
  description: string | null
  /** Compétences mobilisées (libellés libres déclarés). */
  skillsUsed: string[]
  orderIndex: number
}

/** Compétence RÉELLE déclarée par le candidat. */
export interface SkillDTO {
  id: string
  label: string
  level: SkillLevel | null
  /** Années d'expérience déclarées. */
  years: number | null
  orderIndex: number
}

/** Formation / diplôme déclaré. */
export interface EducationDTO {
  id: string
  degree: string
  school: string
  startDate: string | null
  endDate: string | null
  description: string | null
  orderIndex: number
}

/** Profil candidat complet, tel que relu/édité dans l'UI. */
export interface ProfileDTO {
  id: string
  headline: string | null
  summary: string | null
  experiences: ExperienceDTO[]
  skills: SkillDTO[]
  education: EducationDTO[]
}
