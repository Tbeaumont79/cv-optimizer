/**
 * Adapte les « compétences clés » du profil à une offre — SANS inventer.
 *
 * Étape de génération : on part des phrases RÉELLES du profil (déjà rédigées par le
 * candidat) et on les fait reformuler/réordonner/sélectionner par le LLM pour mettre
 * en avant ce qui compte pour l'offre. Garde-fou anti-invention : le résultat est
 * borné au NOMBRE de phrases sources (jamais d'ajout) ; en cas d'échec/vide, on
 * retombe sur les phrases d'origine (verbatim). RGPD : aucun contenu loggé (tokens
 * mesurés par anthropicComplete).
 */
import { type AnalyzedOffer } from '@cvo/shared'
import { anthropicComplete, type LlmComplete } from '../utils/anthropic'

const SYSTEM = `Tu adaptes les « compétences clés » d'un candidat à une offre, SANS mentir ni inventer.
On te donne les compétences clés ACTUELLES du candidat (phrases factuelles, déjà rédigées) et l'offre analysée.
Tu rends "keySkills" : ces mêmes compétences RÉÉCRITES / RÉORDONNÉES / SÉLECTIONNÉES pour mettre en avant
ce qui compte le plus pour l'offre.
RÈGLES ABSOLUES :
- N'ajoute AUCUNE compétence, technologie, chiffre ou outil que les phrases sources n'attestent pas déjà.
- Tu peux reformuler le style et changer l'ordre, retirer les moins pertinentes, mais JAMAIS en créer de nouvelles non fondées.
- Chaque phrase reste fidèle au candidat et commence par un verbe d'action.
- Tu rends AU PLUS autant de phrases que reçues (tu peux en rendre moins), jamais plus.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { keySkills: { type: 'array', items: { type: 'string' } } },
  required: ['keySkills'],
} as const

export interface AdaptKeySkillsDeps {
  complete: LlmComplete
}

/**
 * Renvoie les compétences clés adaptées à l'offre (≤ nombre de phrases fournies,
 * trim, sans vides). Repli sur `keySkills` d'origine si le LLM ne renvoie rien.
 */
export async function adaptKeySkills(
  keySkills: string[],
  offer: AnalyzedOffer,
  deps: AdaptKeySkillsDeps = { complete: anthropicComplete },
): Promise<string[]> {
  if (keySkills.length === 0) return []

  const result = (await deps.complete({
    system: SYSTEM,
    user: JSON.stringify({ offreAnalysee: offer, competencesClesActuelles: keySkills }),
    schema: SCHEMA as unknown as Record<string, unknown>,
    costLabel: 'keyskills-adapt',
    effort: 'low',
    maxTokens: 1024,
  })) as { keySkills?: unknown }

  const adapted = Array.isArray(result.keySkills)
    ? result.keySkills
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, keySkills.length) // jamais plus de phrases que fournies (anti-invention)
    : []

  return adapted.length ? adapted : keySkills
}
