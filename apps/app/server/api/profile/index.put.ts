/**
 * PUT /api/profile — Upsert des champs scalaires du profil (headline + summary).
 * Crée le profil s'il n'existe pas encore (premier appel après création de compte).
 */
import { z } from 'zod'
import { getAuthSession } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { toProfileDTO } from '../../utils/profile-serialize'

const bodySchema = z.object({
  fullName: z.string().max(150).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  location: z.string().max(150).nullable().optional(),
  links: z.array(z.string().url().max(500)).max(10).optional(),
  // Borne large anti-abus ; le nettoyage réel (trim/vides/plafond 8 × 300 car.) se
  // fait côté handler pour ne JAMAIS faire échouer toute la sauvegarde d'en-tête.
  keySkills: z.array(z.string().max(2000)).max(100).optional(),
  headline: z.string().max(150).nullable().optional(),
  summary: z.string().max(8000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Corps invalide.', data: parsed.error.flatten() })

  const { fullName, email, phone, location, links, keySkills, headline, summary } = parsed.data

  // Nettoyage tolérant : trim, retrait des vides, plafond 8 phrases × 300 car. On
  // tronque plutôt que rejeter → un excès ne fait pas échouer toute la sauvegarde.
  const cleanedKeySkills =
    keySkills?.map((s) => s.trim().slice(0, 300)).filter(Boolean).slice(0, 8)

  const profile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: {
      ...(fullName !== undefined && { fullName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(location !== undefined && { location }),
      ...(links !== undefined && { links }),
      ...(cleanedKeySkills !== undefined && { keySkills: cleanedKeySkills }),
      ...(headline !== undefined && { headline }),
      ...(summary !== undefined && { summary }),
    },
    create: {
      userId: session.user.id,
      fullName: fullName ?? null,
      email: email ?? null,
      phone: phone ?? null,
      location: location ?? null,
      links: links ?? [],
      keySkills: cleanedKeySkills ?? [],
      headline: headline ?? null,
      summary: summary ?? null,
    },
    include: {
      experiences: { orderBy: { orderIndex: 'asc' } },
      skills: { orderBy: { orderIndex: 'asc' } },
      education: { orderBy: { orderIndex: 'asc' } },
      languages: { orderBy: { orderIndex: 'asc' } },
    },
  })

  return toProfileDTO(profile)
})
