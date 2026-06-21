/**
 * GET /api/candidatures — liste des candidatures de l'utilisateur (suivi).
 * Léger : on ne sélectionne pas les gros JSON (offre/CV/design).
 */
import { requireUserId } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED } from '../../utils/profile-serialize'
import { toCandidatureListItemDTO } from '../../utils/candidature-serialize'

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const rows = await prisma.candidature.findMany({
    where: { userId, ...NOT_DELETED },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, label: true, status: true, matchScore: true, createdAt: true, updatedAt: true },
  })
  return rows.map(toCandidatureListItemDTO)
})
