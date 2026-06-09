/**
 * POST /api/profile/experiences — Ajouter une expérience au profil.
 */
import { z } from 'zod'
import { getAuthSession } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED } from '../../utils/profile-serialize'

const bodySchema = z.object({
  title: z.string().min(1).max(150),
  company: z.string().min(1).max(150),
  startDate: z.string().datetime({ offset: true }).nullable().optional(),
  endDate: z.string().datetime({ offset: true }).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  skillsUsed: z.array(z.string().max(80)).max(30).default([]),
  orderIndex: z.number().int().min(0).default(0),
})

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const profile = await prisma.profile.findFirst({ where: { userId: session.user.id, ...NOT_DELETED } })
  if (!profile) throw createError({ statusCode: 404, message: 'Profil introuvable. Initialisez-le d\'abord via PUT /api/profile.' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Corps invalide.', data: parsed.error.flatten() })

  const { title, company, startDate, endDate, description, skillsUsed, orderIndex } = parsed.data

  const exp = await prisma.experience.create({
    data: {
      profileId: profile.id,
      title,
      company,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      description: description ?? null,
      skillsUsed,
      orderIndex,
    },
  })

  return { id: exp.id }
})
