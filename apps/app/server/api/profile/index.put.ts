/**
 * PUT /api/profile — Upsert des champs scalaires du profil (headline + summary).
 * Crée le profil s'il n'existe pas encore (premier appel après création de compte).
 */
import { z } from 'zod'
import { getAuthSession } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { toProfileDTO } from '../../utils/profile-serialize'

const bodySchema = z.object({
  headline: z.string().max(150).nullable().optional(),
  summary: z.string().max(2000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Corps invalide.', data: parsed.error.flatten() })

  const { headline, summary } = parsed.data

  const profile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: {
      ...(headline !== undefined && { headline }),
      ...(summary !== undefined && { summary }),
    },
    create: {
      userId: session.user.id,
      headline: headline ?? null,
      summary: summary ?? null,
    },
    include: {
      experiences: { orderBy: { orderIndex: 'asc' } },
      skills: { orderBy: { orderIndex: 'asc' } },
      education: { orderBy: { orderIndex: 'asc' } },
    },
  })

  return toProfileDTO(profile)
})
