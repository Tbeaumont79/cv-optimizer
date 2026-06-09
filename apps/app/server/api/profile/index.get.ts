/**
 * GET /api/profile — Lecture du profil candidat connecté.
 * Retourne le profil existant (ou null si jamais créé).
 * Seuls les sous-éléments non soft-delete sont exposés.
 */
import { getAuthSession } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED, toProfileDTO } from '../../utils/profile-serialize'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const profile = await prisma.profile.findFirst({
    where: { userId: session.user.id, ...NOT_DELETED },
    include: {
      experiences: { orderBy: { orderIndex: 'asc' } },
      skills: { orderBy: { orderIndex: 'asc' } },
      education: { orderBy: { orderIndex: 'asc' } },
    },
  })

  if (!profile) return null
  return toProfileDTO(profile)
})
