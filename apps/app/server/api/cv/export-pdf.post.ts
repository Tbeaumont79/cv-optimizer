/**
 * POST /api/cv/export-pdf
 * Corps : RenderableCv (JSON).
 * Réponse : PDF binaire (application/pdf), Content-Disposition: attachment.
 *
 * Flux : parse Zod + garde-fou provenance → buildCvHtml (thème « CV de base » si
 * configuré) → renderHtmlToPdf.
 * Sécurité : données non loggées (RGPD) ; HTML échappé par buildCvHtml.
 */

import type { CvDesign } from '@cvo/shared'
import { FREE_TIER_QUOTAS } from '@cvo/shared'
import { requireUserId } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { isUsageAllowed, recordUsageEvent } from '../../utils/metering'
import { buildCvHtml } from '../../utils/cv-html'
import { renderHtmlToPdf } from '../../utils/pdf'
import { loadBaseCvDesign } from '../../utils/cv-design'
import { parseRenderInput } from '../../utils/cv-render-input'

export default defineEventHandler(async (event) => {
  // Auth OBLIGATOIRE : le rendu lance un Chromium par requête. Sans ce garde, un
  // visiteur anonyme peut épuiser CPU/RAM du serveur (DoS) et contourner le quota.
  const userId = requireUserId(event)

  // Gate de quota d'export (borné par période) AVANT de lancer Chromium.
  const now = new Date()
  if (!(await isUsageAllowed(prisma, userId, 'export_pdf', FREE_TIER_QUOTAS, now))) {
    throw createError({ statusCode: 429, message: 'Quota d’export PDF atteint pour cette période.' })
  }

  const { cv, design: bodyDesign } = parseRenderInput(await readBody(event))

  // Design par-candidature (body) > thème de profil > défaut. Avec un design, on
  // rend en pleine page (marges nulles) ; le gabarit gère ses paddings.
  const design: CvDesign | null = bodyDesign ?? (await loadBaseCvDesign(event))

  const pdfBuffer = await renderHtmlToPdf(buildCvHtml(cv, design), { fullBleed: !!design })

  // Comptabilise l'export réussi (metering + quota de la période suivante).
  await recordUsageEvent(prisma, { userId, type: 'export_pdf' }, now)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', 'attachment; filename="cv.pdf"')
  return new Uint8Array(pdfBuffer)
})
