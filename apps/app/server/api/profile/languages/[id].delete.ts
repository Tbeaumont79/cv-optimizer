/**
 * DELETE /api/profile/languages/:id — Soft-delete d'une langue.
 */
import { getAuthSession } from '../../../utils/session'
import { prisma } from '../../../utils/prisma'
import { NOT_DELETED } from '../../../utils/profile-serialize'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis.' })

  const language = await prisma.language.findFirst({
    where: { id, ...NOT_DELETED, profile: { userId: session.user.id, ...NOT_DELETED } },
  })
  if (!language) throw createError({ statusCode: 404, message: 'Langue introuvable.' })

  await prisma.language.update({ where: { id }, data: { deletedAt: new Date() } })
  return { ok: true }
})
