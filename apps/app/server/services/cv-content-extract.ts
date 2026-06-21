/**
 * Extraction de CONTENU — analyse le PDF d'un CV et en extrait les données
 * factuelles pour pré-remplir le profil (identité, expériences, compétences,
 * langues). N'invente rien : un champ absent vaut null / [].
 *
 * Distinct de cv-design-extract (qui ne capture que le STYLE). Le résultat est
 * une PROPOSITION : l'utilisateur relit puis confirme avant toute écriture.
 */
import { SKILL_LEVELS, LANGUAGE_LEVELS, type ParsedCvProfile } from '@cvo/shared'
import { anthropicComplete, LlmError, type LlmComplete } from '../utils/anthropic'

const SYSTEM = `Tu extrais les informations factuelles d'un CV (fourni en PDF) pour pré-remplir un profil.
RÈGLES :
- N'invente RIEN. Si une information est absente du CV, mets null (ou [] pour les listes).
- Recopie fidèlement : intitulés de poste, entreprises, écoles, libellés de compétences/langues.
- Dates au format "YYYY-MM" (ou "YYYY-MM-DD"), ou null si absente/illisible. endDate null = poste en cours.
- skillsUsed = compétences citées dans une expérience donnée (libellés courts).
- level de compétence : un de ${SKILL_LEVELS.join('/')} si déductible, sinon null.
- level de langue : un de ${LANGUAGE_LEVELS.join('/')} (CEFR) ou "NATIVE", sinon null.
- education = formations/diplômes : degree (intitulé du diplôme/titre), school (établissement), dates, description (projets, mentions…).
- keySkills = « compétences clés » : 2 à 5 phrases d'accroche commençant par un VERBE D'ACTION (ex. « Concevoir des applications web… », « Maîtriser l'écosystème Vue 3… »), reprises si le CV a une section de ce type ; sinon [].
- headline = intitulé/accroche principal du candidat ; summary = résumé/à-propos s'il existe.`

/** JSON Schema (structured outputs) — anyOf pour les nullable (cf. règles Anthropic). */
const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] }
const nullableEnum = (values: readonly string[]) => ({
  anyOf: [{ type: 'string', enum: [...values] }, { type: 'null' }],
})

const CV_CONTENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fullName: nullableString,
    email: nullableString,
    phone: nullableString,
    location: nullableString,
    links: { type: 'array', items: { type: 'string' } },
    keySkills: { type: 'array', items: { type: 'string' } },
    headline: nullableString,
    summary: nullableString,
    experiences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          company: { type: 'string' },
          startDate: nullableString,
          endDate: nullableString,
          description: nullableString,
          skillsUsed: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'company', 'startDate', 'endDate', 'description', 'skillsUsed'],
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          degree: { type: 'string' },
          school: { type: 'string' },
          startDate: nullableString,
          endDate: nullableString,
          description: nullableString,
        },
        required: ['degree', 'school', 'startDate', 'endDate', 'description'],
      },
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          level: nullableEnum(SKILL_LEVELS),
          years: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
        },
        required: ['label', 'level', 'years'],
      },
    },
    languages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          level: nullableEnum(LANGUAGE_LEVELS),
        },
        required: ['label', 'level'],
      },
    },
  },
  required: ['fullName', 'email', 'phone', 'location', 'links', 'keySkills', 'headline', 'summary', 'experiences', 'education', 'skills', 'languages'],
} as const

export interface ExtractCvContentDeps {
  complete: LlmComplete
}

/** Analyse le PDF (base64) et renvoie le contenu de profil proposé. */
export async function extractCvContent(
  pdfBase64: string,
  deps: ExtractCvContentDeps = { complete: anthropicComplete },
): Promise<ParsedCvProfile> {
  const result = (await deps.complete({
    system: SYSTEM,
    user: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
      { type: 'text', text: 'Extrais les informations de ce CV pour pré-remplir un profil.' },
    ],
    schema: CV_CONTENT_SCHEMA as unknown as Record<string, unknown>,
    costLabel: 'cv-content-extract',
    maxTokens: 4096,
  })) as Partial<ParsedCvProfile>

  // Normalisation : null → '' pour les champs texte (éditables côté UI) ; les
  // niveaux restent nullable. Le schéma garantit déjà la forme globale.
  const raw = result as Record<string, unknown>
  return {
    fullName: (raw.fullName as string) ?? '',
    email: (raw.email as string) ?? '',
    phone: (raw.phone as string) ?? '',
    location: (raw.location as string) ?? '',
    links: (raw.links as string[]) ?? [],
    keySkills: ((raw.keySkills as string[]) ?? [])
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => s.trim().slice(0, 300))
      .slice(0, 8),
    headline: (raw.headline as string) ?? '',
    summary: (raw.summary as string) ?? '',
    experiences: ((raw.experiences as ParsedCvProfile['experiences']) ?? []).map((e) => ({
      title: e.title ?? '',
      company: e.company ?? '',
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      description: e.description ?? '',
      skillsUsed: e.skillsUsed ?? [],
    })),
    education: ((raw.education as ParsedCvProfile['education']) ?? []).map((e) => ({
      degree: e.degree ?? '',
      school: e.school ?? '',
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      description: e.description ?? '',
    })),
    skills: ((raw.skills as ParsedCvProfile['skills']) ?? []).map((s) => ({
      label: s.label ?? '',
      level: s.level ?? null,
      years: s.years ?? null,
    })),
    languages: ((raw.languages as ParsedCvProfile['languages']) ?? []).map((l) => ({
      label: l.label ?? '',
      level: l.level ?? null,
    })),
  }
}
