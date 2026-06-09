/**
 * DELETE /api/profile/experiences/:id — Soft-delete d'une expérience.
 * RGPD : soft-delete uniquement (la ligne reste pour le job de purge).
 */
import { getAuthSession } from '../../../utils/session'
import { prisma } from '../../../utils/prisma'
import { NOT_DELETED } from '../../../utils/profile-serialize'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis.' })

  // Vérifier l'ownership via le profil
  const exp = await prisma.experience.findFirst({
    where: { id, ...NOT_DELETED, profile: { userId: session.user.id, ...NOT_DELETED } },
  })
  if (!exp) throw createError({ statusCode: 404, message: 'Expérience introuvable.' })

  await prisma.experience.update({ where: { id }, data: { deletedAt: new Date() } })
  return { ok: true }
})
