/**
 * GET /api/candidatures/:id — candidature complète (offre + match + CV + design).
 * Pour l'éditeur. 404 si absente / pas au propriétaire.
 */
import { requireUserId } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED } from '../../utils/profile-serialize'
import { toCandidatureDTO } from '../../utils/candidature-serialize'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis.' })

  const row = await prisma.candidature.findFirst({ where: { id, userId, ...NOT_DELETED } })
  if (!row) throw createError({ statusCode: 404, message: 'Candidature introuvable.' })

  return toCandidatureDTO(row)
})
