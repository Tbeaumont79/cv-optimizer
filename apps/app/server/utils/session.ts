/**
 * Résolution de l'utilisateur courant côté serveur (Nitro).
 *
 * Découplage volontaire du lot Auth (THI-131) : on lit `event.context.userId`,
 * renseigné par le middleware d'authentification (Better Auth). Ce WS (THI-126)
 * n'importe donc pas l'instance auth, ce qui le garde indépendant de l'ordre de
 * merge. Quand le middleware d'auth est en place, l'id est disponible ici ;
 * sinon l'accès est refusé (401) plutôt que d'attribuer l'usage au mauvais compte.
 */
import { createError, type H3Event } from 'h3'

// Le middleware d'auth renseigne l'id utilisateur dans le contexte de requête.
declare module 'h3' {
  interface H3EventContext {
    /** Id de l'utilisateur authentifié (renseigné par le middleware auth, THI-131). */
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
