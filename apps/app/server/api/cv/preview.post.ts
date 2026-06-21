/**
 * POST /api/cv/preview
 * Corps : `RenderableCv` nu OU `{ cv, design? }`. Réponse : document HTML complet.
 *
 * Sert l'aperçu écran (iframe sandbox), même HTML que l'export PDF. Le design
 * provient du body (éditeur, design par-candidature) sinon du profil sinon défaut.
 */
import type { CvDesign } from '@cvo/shared'
import { buildCvHtml } from '../../utils/cv-html'
import { loadBaseCvDesign } from '../../utils/cv-design'
import { parseRenderInput } from '../../utils/cv-render-input'

export default defineEventHandler(async (event) => {
  const { cv, design } = parseRenderInput(await readBody(event))
  const effective: CvDesign | null = design ?? (await loadBaseCvDesign(event))

  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return buildCvHtml(cv, effective)
})
