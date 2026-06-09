import type { UsageSummary } from '@cvo/shared'
import { FREE_TIER_QUOTAS } from '@cvo/shared'
import { prisma } from '../../utils/prisma'
import { readUsageSummary } from '../../utils/metering'
import { requireUserId } from '../../utils/session'

// GET /api/usage/current — usage de la période en cours + état des quotas, pour
// l'utilisateur authentifié. Aucune donnée de contenu : uniquement des compteurs.
export default defineEventHandler(async (event): Promise<UsageSummary> => {
  const userId = requireUserId(event)
  return readUsageSummary(prisma, userId, FREE_TIER_QUOTAS, new Date())
})
