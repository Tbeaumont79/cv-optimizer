/**
 * Résolution de l'id utilisateur à partir d'une session Better Auth.
 *
 * Logique pure et injectable (on passe le résolveur de session en paramètre)
 * pour rester testable sans charger l'instance `auth` ni `better-auth`.
 * Le middleware Nitro (`server/middleware/auth.ts`) câble ici la vraie session.
 */

/** Forme minimale d'une session Better Auth dont on a besoin ici. */
export interface SessionLike {
  user?: { id?: string | null } | null
}

/** Récupère une session à partir des en-têtes de la requête (ou null si absente). */
export type SessionResolver = (args: { headers: Headers }) => Promise<SessionLike | null>

/**
 * Résout l'id de l'utilisateur authentifié, ou `undefined` si la session est
 * absente/anonyme. Ne lève jamais d'erreur d'authentification : chaque route
 * décide de l'exigence via `requireUserId(event)`.
 */
export async function resolveUserId(
  getSession: SessionResolver,
  headers: Headers,
): Promise<string | undefined> {
  const session = await getSession({ headers })
  return session?.user?.id ?? undefined
}
