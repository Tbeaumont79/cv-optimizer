/**
 * PATCH /api/candidatures/:id — met à jour une candidature (champs optionnels :
 * cv, design, status, label). Le `cv` repasse le garde-fou de provenance avant
 * persistance ; le `design` est re-normalisé. 404 si pas au propriétaire.
 */
import { Prisma } from '@prisma/client'
import { CANDIDATURE_STATUSES, type CandidatureStatus } from '@cvo/shared'
import { requireUserId } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED } from '../../utils/profile-serialize'
import { parseRenderableCvBody } from '../../utils/cv-render-input'
import { normalizeDesign } from '../../utils/cv-design-tokens'
import { toCandidatureDTO } from '../../utils/candidature-serialize'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis.' })

  const existing = await prisma.candidature.findFirst({
    where: { id, userId, ...NOT_DELETED },
    select: { id: true },
  })
  if (!existing) throw createError({ statusCode: 404, message: 'Candidature introuvable.' })

  const body = (await readBody(event)) as Record<string, unknown>
  const data: Prisma.CandidatureUpdateInput = {}

  if (body.cv !== undefined) {
    // Re-applique la validation + garde-fou provenance (400/422 si invalide).
    const cv = parseRenderableCvBody(body.cv)
    data.generatedCv = cv as unknown as Prisma.InputJsonValue
  }
  if (body.design !== undefined) {
    data.design =
      body.design === null
        ? Prisma.DbNull
        : (normalizeDesign(body.design) as unknown as Prisma.InputJsonValue)
  }
  if (body.status !== undefined) {
    if (!CANDIDATURE_STATUSES.includes(body.status as CandidatureStatus)) {
      throw createError({ statusCode: 400, message: 'Statut invalide.' })
    }
    data.status = body.status as CandidatureStatus
  }
  if (body.label !== undefined) {
    const label = String(body.label).trim().slice(0, 150)
    if (!label) throw createError({ statusCode: 400, message: 'Libellé vide.' })
    data.label = label
  }

  const row = await prisma.candidature.update({ where: { id }, data })
  return toCandidatureDTO(row)
})
