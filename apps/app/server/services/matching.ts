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
- N'utilise QUE les id présents dans le profil. Aucun id inventé.`

/** Provenance attendue sur chaque nœud du CV. */
const PROVENANCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    profileItemId: { type: 'string' },
    reformulated: { type: 'boolean' },
  },
  required: ['profileItemId', 'reformulated'],
}

/** JSON Schema imposé à la sortie du matching (forme de `RenderableCv`). */
const RENDERABLE_CV_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    locale: { type: 'string', enum: ['fr'] },
    header: {
      type: 'object',
      additionalProperties: false,
      properties: {
        fullName: { type: 'string' },
        headline: { type: 'string' },
        contacts: { type: 'array', items: { type: 'object' } },
        provenance: PROVENANCE_SCHEMA,
      },
      required: ['fullName', 'headline', 'contacts', 'provenance'],
    },
    sections: { type: 'array', items: { type: 'object' } },
  },
  required: ['locale', 'header', 'sections'],
} as const

export interface MatchDeps {
  complete: LlmComplete
}

/** Ids réels du profil : header + chaque expérience / compétence / formation. */
export function collectProfileItemIds(profile: ProfileDTO): Set<ProfileItemId> {
  const ids = new Set<ProfileItemId>([profile.id])
  for (const e of profile.experiences) ids.add(e.id)
  for (const s of profile.skills) ids.add(s.id)
  for (const ed of profile.education) ids.add(ed.id)
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
  const user = JSON.stringify({
    instructionsDeTri: offer,
    profilReel: profile,
  })

  const cv = (await deps.complete({
    system: SYSTEM,
    user,
    schema: RENDERABLE_CV_SCHEMA as unknown as Record<string, unknown>,
    costLabel: 'matching',
    effort: 'medium',
    maxTokens: 8192,
  })) as RenderableCv

  // §3 — garde-fou déterministe : rejette tout élément non sourcé (hors LLM).
  assertValidCv(cv, collectProfileItemIds(profile))
  return cv
}
