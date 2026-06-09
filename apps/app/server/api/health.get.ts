import type { HealthStatus } from '@cvo/shared'
import { prisma } from '../utils/prisma'
import { buildHealthStatus, pingDb } from '../utils/health'

// GET /api/health — preuve de vie (front + serveur), exécutée aussi en CI.
export default defineEventHandler(async (): Promise<HealthStatus> => {
  const dbUp = await pingDb(prisma)
  return buildHealthStatus(dbUp, new Date())
})
