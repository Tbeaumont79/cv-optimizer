/**
 * POST /api/profile/education — Ajouter une formation au profil.
 */
import { z } from 'zod'
import { getAuthSession } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED } from '../../utils/profile-serialize'

const bodySchema = z.object({
  degree: z.string().min(1).max(150),
  school: z.string().min(1).max(150),
  startDate: z.string().datetime({ offset: true }).nullable().optional(),
  endDate: z.string().datetime({ offset: true }).nullable().optional(),
  description: z.string().max(8000).nullable().optional(),
  orderIndex: z.number().int().min(0).default(0),
})

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const profile = await prisma.profile.findFirst({ where: { userId: session.user.id, ...NOT_DELETED } })
  if (!profile) throw createError({ statusCode: 404, message: 'Profil introuvable.' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Corps invalide.', data: parsed.error.flatten() })

  const { degree, school, startDate, endDate, description, orderIndex } = parsed.data

  const edu = await prisma.education.create({
    data: {
      profileId: profile.id,
      degree,
      school,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      description: description ?? null,
      orderIndex,
    },
  })

  return { id: edu.id }
})
