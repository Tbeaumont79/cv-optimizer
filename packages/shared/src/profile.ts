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

import type { CvDesign } from './cv.js'

/** Niveau de maîtrise déclaré d'une compétence (miroir de l'enum SQL SkillLevel). */
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'

export const SKILL_LEVELS: readonly SkillLevel[] = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
] as const

/** Niveau de maîtrise d'une langue (miroir de l'enum SQL LanguageLevel) — CEFR + natif. */
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIVE'

export const LANGUAGE_LEVELS: readonly LanguageLevel[] = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
  'NATIVE',
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

/** Langue déclarée par le candidat. */
export interface LanguageDTO {
  id: string
  label: string
  level: LanguageLevel | null
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
  /** Identité affichée en tête de CV — factuelle, jamais reformulée par le moteur. */
  fullName: string | null
  email: string | null
  phone: string | null
  location: string | null
  /** Liens (portfolio, LinkedIn, GitHub…). */
  links: string[]
  headline: string | null
  summary: string | null
  /** Compétences clés : phrases d'accroche (verbe d'action), section au-dessus des expériences. */
  keySkills: string[]
  experiences: ExperienceDTO[]
  skills: SkillDTO[]
  education: EducationDTO[]
  languages: LanguageDTO[]
  /** Thème « CV de base » capturé depuis un PDF, ou null si non configuré. */
  baseCvDesign: CvDesign | null
}

/**
 * Contenu de profil extrait d'un CV (PDF ou texte) — proposition ÉDITABLE à relire
 * avant écriture. Champs texte : `''` = absent (compatibles v-model des inputs).
 * Dates en `YYYY-MM` (ou `''`) ; converties en ISO à la persistance. Niveaux
 * nullable (select « Niveau ? »). Rien n'est inventé : un champ absent vaut '' / [].
 */
export interface ParsedCvProfile {
  fullName: string
  email: string
  phone: string
  location: string
  links: string[]
  headline: string
  summary: string
  /** Phrases « compétences clés » (verbe d'action) extraites du CV, si présentes. */
  keySkills: string[]
  experiences: {
    title: string
    company: string
    startDate: string
    endDate: string
    description: string
    skillsUsed: string[]
  }[]
  education: {
    degree: string
    school: string
    startDate: string
    endDate: string
    description: string
  }[]
  skills: { label: string; level: SkillLevel | null; years: number | null }[]
  languages: { label: string; level: LanguageLevel | null }[]
}
