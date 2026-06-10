/**
 * Helpers de session serveur (Nitro).
 *
 * - `requireUserId` (THI-126) : lit `event.context.userId` posé par le middleware
 *   d'auth (THI-134) et lève une 401 si absent. Découplé de l'instance Better Auth.
 * - `getAuthSession` (THI-132) : récupère la session Better Auth complète depuis
 *   les headers de l'événement. Retourne null si non authentifié.
 */
import { createError, type H3Event } from 'h3'
import { auth } from './auth'

// Le middleware d'auth renseigne l'id utilisateur dans le contexte de requête.
declare module 'h3' {
  interface H3EventContext {
    /** Id de l'utilisateur authentifié (renseigné par le middleware auth, THI-131/THI-134). */
    userId?: string
  }
}

/** Renvoie l'id de l'utilisateur authentifié, ou lève une 401 si absent. */
export function requireUserId(event: H3Event): string {
  const userId = event.context.userId
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Authentification requise' })
  }
  return userId
}

/**
 * Récupère la session Better Auth complète (ou null si non authentifié).
 *
 * ⚠️ On passe `event.headers` directement — surtout pas `toWebRequest(event)` :
 * convertir l'événement en Request touche au flux du corps, et le `readBody(event)`
 * qui suit dans les handlers PUT/POST attend alors un corps déjà verrouillé →
 * requête qui pend indéfiniment (toutes les écritures /api/profile* étaient HS
 * en build de prod ; les GET, sans corps, passaient).
 */
export async function getAuthSession(event: H3Event) {
  return auth.api.getSession({ headers: event.headers })
}
