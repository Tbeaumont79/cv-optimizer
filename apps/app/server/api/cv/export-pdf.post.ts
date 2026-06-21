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
import { buildCvHtml } from '../../utils/cv-html'
import { renderHtmlToPdf } from '../../utils/pdf'
import { loadBaseCvDesign } from '../../utils/cv-design'
import { parseRenderInput } from '../../utils/cv-render-input'

export default defineEventHandler(async (event) => {
  const { cv, design: bodyDesign } = parseRenderInput(await readBody(event))

  // Design par-candidature (body) > thème de profil > défaut. Avec un design, on
  // rend en pleine page (marges nulles) ; le gabarit gère ses paddings.
  const design: CvDesign | null = bodyDesign ?? (await loadBaseCvDesign(event))

  const pdfBuffer = await renderHtmlToPdf(buildCvHtml(cv, design), { fullBleed: !!design })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', 'attachment; filename="cv.pdf"')
  return new Uint8Array(pdfBuffer)
})
