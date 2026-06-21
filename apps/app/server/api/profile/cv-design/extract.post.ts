/**
 * POST /api/profile/cv-design/extract — étape 1 du « CV de base ».
 *
 * Corps : multipart, champ fichier = PDF du CV existant. Réponse : { design }
 * (thème extrait, sanitisé) AVANT toute persistance — l'utilisateur relit puis
 * confirme (cf. flux import-text). Le PDF n'est JAMAIS stocké ni loggé (RGPD) :
 * seuls les tokens sont mesurés.
 */
import { requireUserId } from '../../../utils/session'
import { prisma } from '../../../utils/prisma'
import { recordUsageEvent } from '../../../utils/metering'
import { anthropicComplete, LlmError, type LlmComplete } from '../../../utils/anthropic'
import { extractCvDesign } from '../../../services/cv-design-extract'
import { extractCvContent } from '../../../services/cv-content-extract'

/** Borne de garde : marge confortable sous la limite API (32 Mo). */
const MAX_PDF_BYTES = 8 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.filename && p.data?.length)
  if (!file) {
    throw createError({ statusCode: 400, message: 'Aucun fichier reçu.' })
  }
  if (file.type !== 'application/pdf') {
    throw createError({ statusCode: 400, message: 'Le fichier doit être un PDF.' })
  }
  if (file.data.length > MAX_PDF_BYTES) {
    throw createError({ statusCode: 413, message: 'PDF trop volumineux (8 Mo maximum).' })
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

  const pdfBase64 = file.data.toString('base64')

  try {
    // Deux extractions indépendantes sur le même PDF : le STYLE (thème) et le
    // CONTENU (à relire pour pré-remplir le profil). En parallèle.
    const [design, parsed] = await Promise.all([
      extractCvDesign(pdfBase64, { complete }),
      extractCvContent(pdfBase64, { complete }),
    ])

    await recordUsageEvent(
      prisma,
      { userId, type: 'extraction', tokensIn, tokensOut, billable: false },
      new Date(),
    )

    return { design, parsed }
  } catch (err) {
    if (err instanceof LlmError) {
      throw createError({
        statusCode: 502,
        message: "L'analyse du CV a échoué, réessaie dans un instant",
      })
    }
    throw err
  }
})
