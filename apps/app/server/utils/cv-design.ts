/**
 * Charge le thème « CV de base » de l'utilisateur courant (ou null).
 * Mutualisé entre l'export PDF et l'aperçu pour garantir un rendu identique.
 */
import type { H3Event } from 'h3'
import type { CvDesign } from '@cvo/shared'
import { prisma } from './prisma'
import { NOT_DELETED } from './profile-serialize'
import { normalizeDesign } from './cv-design-tokens'

/**
 * Tokens de design « CV de base » de l'utilisateur courant, ou null (→ défaut).
 *
 * NON bloquant : si la requête n'est pas authentifiée (ex. page démo publique),
 * on renvoie null → gabarit par défaut. Les tokens stockés sont re-normalisés
 * (tolère un ancien format) avant rendu.
 */
export async function loadBaseCvDesign(event: H3Event): Promise<CvDesign | null> {
  const userId = event.context.userId
  if (!userId) return null
  const profile = await prisma.profile.findFirst({
    where: { userId, ...NOT_DELETED },
    select: { baseCvDesign: true },
  })
  return profile?.baseCvDesign ? normalizeDesign(profile.baseCvDesign) : null
}
