import type { UsageQuotas, UsageSummary } from '@cvo/shared'
import { FREE_TIER_QUOTAS } from '@cvo/shared'
import { prisma } from '../../utils/prisma'
import { readUsageSummary } from '../../utils/metering'
import { requireUserId } from '../../utils/session'

// GET /api/usage/current — usage de la période en cours + état des quotas, pour
// l'utilisateur authentifié. Aucune donnée de contenu : uniquement des compteurs.
export default defineEventHandler(async (event): Promise<UsageSummary> => {
  const userId = requireUserId(event)
  // Cohérent avec le gate de /generate : si la limite est désactivée (dev), la
  // génération est reportée comme illimitée (l'UI ne grise plus le bouton).
  const quotas: UsageQuotas =
    process.env.DISABLE_GENERATION_LIMIT === 'true'
      ? { ...FREE_TIER_QUOTAS, generation: undefined }
      : FREE_TIER_QUOTAS
  return readUsageSummary(prisma, userId, quotas, new Date())
})
