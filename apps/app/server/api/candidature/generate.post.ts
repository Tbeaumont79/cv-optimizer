/**
 * POST /api/candidature/generate — étape 2 du flux « Nouvelle candidature ».
 *
 * Corps : { offer } (l'offre analysée renvoyée par /analyze). Réponse : { cv }
 * (RenderableCv, garde-fou de provenance déjà appliqué par le service).
 *
 * Gate ÉCONOMIQUE : le quota `generation` (FREE_TIER_QUOTAS) est vérifié AVANT
 * tout appel LLM — un utilisateur à quota épuisé ne coûte aucun token.
 *
 * RGPD : ni l'offre, ni le profil, ni le CV ne sont loggés — seulement les tokens.
 */
import { z } from 'zod'
import {
  FREE_TIER_QUOTAS,
  ProvenanceError,
  QUOTA_EXCEEDED_CODE,
  type AnalyzedOffer,
  type RenderableCv,
} from '@cvo/shared'
import { requireUserId } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED, toProfileDTO } from '../../utils/profile-serialize'
import { isUsageAllowed, recordUsageEvent } from '../../utils/metering'
import { anthropicComplete, LlmError, type LlmComplete } from '../../utils/anthropic'
import { matchProfileToOffer } from '../../services/matching'

const bodySchema = z.object({
  offer: z.object({
    title: z.string().min(1),
    requiredSkills: z.array(z.string()),
    keywords: z.array(z.string()),
    seniority: z.enum(['junior', 'mid', 'senior', 'lead']).nullable(),
  }),
})

export default defineEventHandler(async (event): Promise<{ cv: RenderableCv }> => {
  const userId = requireUserId(event)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Corps invalide : { offer: AnalyzedOffer } attendu.',
    })
  }
  const offer: AnalyzedOffer = parsed.data.offer

  // Gate quota AVANT tout appel LLM (aucun token consommé si quota atteint).
  const now = new Date()
  const allowed = await isUsageAllowed(prisma, userId, 'generation', FREE_TIER_QUOTAS, now)
  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: 'Tes générations offertes sont épuisées',
      data: { code: QUOTA_EXCEEDED_CODE },
    })
  }

  // Profil réel = seule source de contenu du CV généré (mêmes règles que /analyze).
  const profileRow = await prisma.profile.findFirst({
    where: { userId, ...NOT_DELETED },
    include: {
      experiences: { orderBy: { orderIndex: 'asc' } },
      skills: { orderBy: { orderIndex: 'asc' } },
      education: { orderBy: { orderIndex: 'asc' } },
    },
  })
  const profile = profileRow ? toProfileDTO(profileRow) : null
  if (!profile || (profile.experiences.length === 0 && profile.skills.length === 0)) {
    throw createError({
      statusCode: 409,
      message: "Complète d'abord ton profil",
      data: { code: 'profile_empty' },
    })
  }

  // Mesure des tokens via onUsage (jamais de contenu).
  let tokensIn = 0
  let tokensOut = 0
  const complete: LlmComplete = (req) =>
    anthropicComplete({
      ...req,
      onUsage: (u) => {
        tokensIn += u.inputTokens
        tokensOut += u.outputTokens
      },
    })

  try {
    const cv = await matchProfileToOffer(profile, offer, { complete })

    await recordUsageEvent(
      prisma,
      { userId, type: 'generation', tokensIn, tokensOut, billable: false },
      new Date(),
    )

    return { cv }
  } catch (err) {
    // Garde-fou de provenance : le LLM a produit un élément non sourcé — rejeté.
    if (err instanceof ProvenanceError) {
      throw createError({
        statusCode: 422,
        message: 'La génération a produit un élément non vérifiable, réessaie',
      })
    }
    // Message générique : ne divulgue pas la config serveur (clé API, amont…).
    if (err instanceof LlmError) {
      throw createError({
        statusCode: 502,
        message: 'La génération a échoué, réessaie dans un instant',
      })
    }
    throw err
  }
})
