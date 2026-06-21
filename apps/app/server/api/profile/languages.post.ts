/**
 * POST /api/profile/languages — Ajouter une langue déclarée.
 * Garde-fou : ces données saisies = seule source de vérité du moteur (THI-124).
 */
import { z } from 'zod'
import { LANGUAGE_LEVELS } from '@cvo/shared'
import { getAuthSession } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { NOT_DELETED } from '../../utils/profile-serialize'

const bodySchema = z.object({
  label: z.string().min(1).max(80),
  level: z.enum(LANGUAGE_LEVELS as [string, ...string[]]).nullable().optional(),
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

  const { label, level, orderIndex } = parsed.data

  const language = await prisma.language.create({
    data: {
      profileId: profile.id,
      label,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      level: (level as any) ?? null,
      orderIndex,
    },
  })

  return { id: language.id }
})
