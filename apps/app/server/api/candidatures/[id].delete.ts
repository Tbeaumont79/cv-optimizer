/**
 * DELETE /api/candidatures/:id — soft-delete d'une candidature.
 */
import { requireUserId } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED } from '../../utils/profile-serialize'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis.' })

  const existing = await prisma.candidature.findFirst({
    where: { id, userId, ...NOT_DELETED },
    select: { id: true },
  })
  if (!existing) throw createError({ statusCode: 404, message: 'Candidature introuvable.' })

  await prisma.candidature.update({ where: { id }, data: { deletedAt: new Date() } })
  return { ok: true }
})
