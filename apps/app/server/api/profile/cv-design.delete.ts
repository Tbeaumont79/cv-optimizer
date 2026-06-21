/**
 * DELETE /api/profile/cv-design — Retire le thème « CV de base » (revient au
 * template par défaut pour les futures générations).
 */
import { Prisma } from '@prisma/client'
import { getAuthSession } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED } from '../../utils/profile-serialize'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const profile = await prisma.profile.findFirst({ where: { userId: session.user.id, ...NOT_DELETED } })
  if (!profile) throw createError({ statusCode: 404, message: 'Profil introuvable.' })

  // `DbNull` = NULL SQL (le champ Json nullable est vidé).
  await prisma.profile.update({ where: { id: profile.id }, data: { baseCvDesign: Prisma.DbNull } })
  return { ok: true }
})
