/**
 * Pipeline THI-124 §2 (matching honnête) + §3 (garde-fou de provenance).
 *
 * Règle architecturale : le LLM reçoit comme SOURCE DE CONTENU uniquement les
 * données réelles du profil (`ProfileDTO`). L'offre analysée sert seulement de
 * consignes de tri/reformulation. Chaque élément produit doit porter la
 * `provenance` d'un élément réel du profil.
 *
 * §3 — garde-fou déterministe HORS LLM : avant de retourner le CV, on vérifie
 * par le code (`assertValidCv`) que chaque élément référence un id réel du
 * profil. Un item inventé (provenance absente ou inconnue) ⇒ rejet. L'invention
 * est donc impossible par construction, indépendamment de ce que produit le LLM.
 */
import {
  assertValidCv,
  type AnalyzedOffer,
  type ProfileDTO,
  type ProfileItemId,
  type RenderableCv,
} from '@cvo/shared'
import { anthropicComplete, type LlmComplete } from '../utils/anthropic'

const SYSTEM = `Tu es un moteur de mise en forme de CV honnête.
RÈGLES ABSOLUES :
- Le CONTENU vient EXCLUSIVEMENT du profil candidat fourni. N'invente JAMAIS une compétence, une expérience ou une réalisation absente du profil.
- L'offre sert uniquement à TRIER et REFORMULER : réordonne les sections/éléments par pertinence et reformule les libellés, sans rien ajouter.
- Chaque élément produit DOIT porter "provenance.profileItemId" = l'id EXACT de l'élément profil source. Mets "reformulated": true si tu as reformulé le libellé.
- N'utilise QUE les id présents dans le profil. Aucun id inventé.
- Les langues déclarées (le cas échéant) vont dans une section "languages" ; chaque entrée porte son libellé et son niveau (ex. « Courant », « C1 », « Natif »), sourcée par l'id de la langue.

CONCISION (le CV doit tenir sur UNE page A4) :
- Résumé : 3 phrases maximum (≈ 350 caractères).
- Par expérience : 2 à 4 puces MAXIMUM, les plus pertinentes pour l'offre. Chaque puce = 1 ligne (≈ 140 caractères max), commence par un verbe d'action, va à l'essentiel (résultat/impact). Pas de phrases à rallonge.
- Priorise : mets en avant les expériences/compétences pertinentes pour l'offre ; reste synthétique. Mieux vaut court et percutant qu'exhaustif.`

/**
 * JSON Schema imposé à la sortie du matching (forme de `RenderableCv`).
 *
 * ⚠️ Le validateur de sortie structurée d'Anthropic est STRICT : tout objet doit
 * porter `additionalProperties: false` explicite (cf. mémoire projet). De plus, la
 * grammaire COMPILÉE a une taille limite : inliner les mêmes sous-schémas partout
 * (provenance × chaque entrée × 5 variantes de section) fait dépasser cette limite
 * → « compiled grammar is too large » (400 → 502). On factorise donc via `$defs` +
 * `$ref` : le compilateur partage les productions et la grammaire reste compacte.
 *
 * `prov` = `#/$defs/prov` (référencé partout). Union de sections via `anyOf`.
 */
const REF = (name: string) => ({ $ref: `#/$defs/${name}` })

const RENDERABLE_CV_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    prov: {
      type: 'object',
      additionalProperties: false,
      properties: { profileItemId: { type: 'string' }, reformulated: { type: 'boolean' } },
      required: ['profileItemId', 'reformulated'],
    },
    contact: {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', enum: ['email', 'phone', 'location', 'link'] },
        label: { type: 'string' },
        value: { type: 'string' },
      },
      required: ['kind', 'label', 'value'],
    },
    bullet: {
      type: 'object',
      additionalProperties: false,
      properties: { id: { type: 'string' }, text: { type: 'string' }, provenance: REF('prov') },
      required: ['id', 'text', 'provenance'],
    },
    exp: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        role: { type: 'string' },
        organization: { type: 'string' },
        period: { type: 'string' },
        // `location` optionnel (CvExperienceEntry.location?) → hors `required`.
        location: { type: 'string' },
        bullets: { type: 'array', items: REF('bullet') },
        provenance: REF('prov'),
      },
      required: ['id', 'role', 'organization', 'period', 'bullets', 'provenance'],
    },
    skill: {
      type: 'object',
      additionalProperties: false,
      properties: { id: { type: 'string' }, label: { type: 'string' }, provenance: REF('prov') },
      required: ['id', 'label', 'provenance'],
    },
    edu: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        degree: { type: 'string' },
        institution: { type: 'string' },
        period: { type: 'string' },
        provenance: REF('prov'),
      },
      required: ['id', 'degree', 'institution', 'period', 'provenance'],
    },
    lang: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        level: { type: 'string' }, // libellé affiché (ex. « C1 », « Natif »)
        provenance: REF('prov'),
      },
      required: ['id', 'label', 'level', 'provenance'],
    },
    // Union discriminée par `kind` (CvSection) — une variante par type de section.
    section: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', enum: ['summary'] },
            title: { type: 'string' },
            text: { type: 'string' },
            provenance: REF('prov'),
          },
          required: ['kind', 'title', 'text', 'provenance'],
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', enum: ['experience'] },
            title: { type: 'string' },
            entries: { type: 'array', items: REF('exp') },
          },
          required: ['kind', 'title', 'entries'],
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', enum: ['skills'] },
            title: { type: 'string' },
            entries: { type: 'array', items: REF('skill') },
          },
          required: ['kind', 'title', 'entries'],
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', enum: ['education'] },
            title: { type: 'string' },
            entries: { type: 'array', items: REF('edu') },
          },
          required: ['kind', 'title', 'entries'],
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', enum: ['languages'] },
            title: { type: 'string' },
            entries: { type: 'array', items: REF('lang') },
          },
          required: ['kind', 'title', 'entries'],
        },
      ],
    },
  },
  properties: {
    locale: { type: 'string', enum: ['fr'] },
    header: {
      type: 'object',
      additionalProperties: false,
      properties: {
        fullName: { type: 'string' },
        headline: { type: 'string' },
        contacts: { type: 'array', items: REF('contact') },
        provenance: REF('prov'),
      },
      required: ['fullName', 'headline', 'contacts', 'provenance'],
    },
    sections: { type: 'array', items: REF('section') },
  },
  required: ['locale', 'header', 'sections'],
} as const

export interface MatchDeps {
  complete: LlmComplete
}

/** Ids réels du profil : header + chaque expérience / compétence / formation / langue. */
export function collectProfileItemIds(profile: ProfileDTO): Set<ProfileItemId> {
  const ids = new Set<ProfileItemId>([profile.id])
  for (const e of profile.experiences) ids.add(e.id)
  for (const s of profile.skills) ids.add(s.id)
  for (const ed of profile.education) ids.add(ed.id)
  for (const l of profile.languages) ids.add(l.id)
  return ids
}

/**
 * Produit un CV structuré priorisé pour l'offre, puis le passe au garde-fou
 * déterministe. Lève `ProvenanceError` si le LLM a produit un item non sourcé.
 */
export async function matchProfileToOffer(
  profile: ProfileDTO,
  offer: AnalyzedOffer,
  deps: MatchDeps = { complete: anthropicComplete },
): Promise<RenderableCv> {
  // keySkills (phrases) est injecté DÉTERMINISTE-ment côté generate.post (au-dessus
  // des expériences) → on le retire du payload pour que le LLM ne les recopie pas
  // dans skills/summary (doublon sémantique).
  const { keySkills: _keySkills, ...profilReel } = profile
  const user = JSON.stringify({
    instructionsDeTri: offer,
    profilReel,
  })

  const cv = (await deps.complete({
    system: SYSTEM,
    user,
    schema: RENDERABLE_CV_SCHEMA as unknown as Record<string, unknown>,
    costLabel: 'matching',
    effort: 'medium',
    // Profils riches (nombreuses expériences/compétences/langues) → sortie longue.
    maxTokens: 16000,
  })) as RenderableCv

  // Plafond déterministe (garantie « 1 page », indépendant du LLM) : on borne le
  // nombre d'expériences et de puces. On supprime, jamais on n'invente → provenance
  // intacte sur ce qui reste.
  capCvLength(cv)

  // §3 — garde-fou déterministe : rejette tout élément non sourcé (hors LLM).
  assertValidCv(cv, collectProfileItemIds(profile))
  return cv
}

/** Bornes de longueur pour viser un CV sur une seule page A4. */
const MAX_EXPERIENCES = 6
const MAX_BULLETS_PER_EXPERIENCE = 4

/** Tronque (en place) expériences et puces aux bornes ci-dessus. Ne fait que retirer. */
function capCvLength(cv: RenderableCv): void {
  for (const section of cv.sections) {
    if (section.kind !== 'experience') continue
    section.entries = section.entries.slice(0, MAX_EXPERIENCES)
    for (const entry of section.entries) {
      entry.bullets = entry.bullets.slice(0, MAX_BULLETS_PER_EXPERIENCE)
    }
  }
}
