/**
 * GET /api/billing/summary — solde de crédits de l'utilisateur connecté.
 * Octroie les crédits gratuits au premier accès (idempotent).
 */
import type { BillingSummary } from '@cvo/shared'
import { requireUserId } from '../../utils/session'
import { getOrInitBalance } from '../../utils/credits'

export default defineEventHandler(async (event): Promise<BillingSummary> => {
  const userId = requireUserId(event)
  const creditBalance = await getOrInitBalance(userId)
  return { creditBalance }
})
