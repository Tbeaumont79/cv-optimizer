/**
 * POST /api/profile/skills — Ajouter une compétence RÉELLE déclarée.
 * Garde-fou : ces données saisies = seule source de vérité du moteur (THI-124).
 */
import { z } from 'zod'
import { SKILL_LEVELS } from '@cvo/shared'
import { getAuthSession } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED } from '../../utils/profile-serialize'

const bodySchema = z.object({
  label: z.string().min(1).max(80),
  level: z.enum(SKILL_LEVELS as [string, ...string[]]).nullable().optional(),
  years: z.number().int().min(0).max(50).nullable().optional(),
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

  const { label, level, years, orderIndex } = parsed.data

  const skill = await prisma.skill.create({
    data: {
      profileId: profile.id,
      label,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      level: (level as any) ?? null,
      years: years ?? null,
      orderIndex,
    },
  })

  return { id: skill.id }
})
