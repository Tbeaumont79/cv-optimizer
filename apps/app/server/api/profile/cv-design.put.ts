/**
 * PUT /api/profile/cv-design — Persiste les tokens de design « CV de base »
 * (après relecture). Les tokens sont validés/normalisés (couleurs hex, police
 * bornée, layout dans l'enum). Aucun CSS brut n'est stocké.
 */
import { Prisma } from '@prisma/client'
import type { CvDesign } from '@cvo/shared'
import { getAuthSession } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED } from '../../utils/profile-serialize'
import { normalizeDesign } from '../../utils/cv-design-tokens'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const profile = await prisma.profile.findFirst({ where: { userId: session.user.id, ...NOT_DELETED } })
  if (!profile) throw createError({ statusCode: 404, message: 'Profil introuvable.' })

  const design: CvDesign = normalizeDesign(await readBody(event))

  await prisma.profile.update({
    where: { id: profile.id },
    data: { baseCvDesign: design as unknown as Prisma.InputJsonValue },
  })
  return design
})
