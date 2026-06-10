/**
 * POST /api/candidature/analyze — étape 1 du flux « Nouvelle candidature ».
 *
 * Corps : { offerText } (offre collée). Réponse : { offer, match } —
 * l'offre analysée + le score de match, AVANT toute génération (et donc avant
 * de consommer un crédit). Deux appels LLM (analyse + score) sont cumulés dans
 * UN événement d'usage `extraction` (non facturable).
 *
 * RGPD : ni l'offre ni le profil ne sont loggés — seulement les tokens.
 */
import { z } from 'zod'
import type { AnalyzeCandidatureResponse } from '@cvo/shared'
import { requireUserId } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED, toProfileDTO } from '../../utils/profile-serialize'
import { recordUsageEvent } from '../../utils/metering'
import { anthropicComplete, LlmError, type LlmComplete } from '../../utils/anthropic'
import { analyzeOffer } from '../../services/offer-analysis'
import { buildMatchReport } from '../../services/match-report'

const bodySchema = z.object({
  offerText: z
    .string()
    .min(50, "Le texte de l'offre est trop court (50 caractères minimum).")
    .max(20_000, "Le texte de l'offre est trop long (20 000 caractères maximum)."),
})

export default defineEventHandler(async (event): Promise<AnalyzeCandidatureResponse> => {
  const userId = requireUserId(event)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? 'Corps invalide : { offerText: string } attendu.',
    })
  }

  // Profil réel = seule source de contenu du moteur. Sans profil exploitable,
  // analyser l'offre n'a pas de sens — on guide l'utilisateur vers son profil.
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

  // Cumule les tokens des deux appels LLM via onUsage (jamais de contenu).
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
    const offer = await analyzeOffer(parsed.data.offerText, { complete })
    const match = await buildMatchReport(profile, offer, { complete })

    await recordUsageEvent(
      prisma,
      { userId, type: 'extraction', tokensIn, tokensOut, billable: false },
      new Date(),
    )

    return { offer, match }
  } catch (err) {
    // Message volontairement générique : ne divulgue pas la config serveur
    // (clé API absente, statut HTTP amont, etc.).
    if (err instanceof LlmError) {
      throw createError({
        statusCode: 502,
        message: "L'analyse a échoué, réessaie dans un instant",
      })
    }
    throw err
  }
})
