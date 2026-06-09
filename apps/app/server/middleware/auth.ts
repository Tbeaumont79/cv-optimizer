/**
 * Middleware Nitro serveur — résout la session Better Auth et renseigne
 * `event.context.userId` pour toutes les requêtes API.
 *
 * Volontairement non bloquant : si la session est absente, on laisse
 * `userId` indéfini plutôt que de lever une 401. Chaque route choisit son
 * exigence d'authentification via `requireUserId(event)` (server/utils/session.ts,
 * lot metering THI-126). Ce middleware est le *producteur* de `event.context.userId` ;
 * `requireUserId` en est le *consommateur*.
 *
 * Rattaché à l'auth (THI-131). Débloque le metering (THI-133/THI-126), dont
 * `GET /api/usage/current` qui renvoyait 401 faute de middleware serveur.
 */
import { auth } from '../utils/auth'
import { resolveUserId } from '../utils/auth-context'

// Le champ de contexte est aussi déclaré côté lecteur dans server/utils/session.ts.
// Les déclarations d'interface identiques fusionnent : aucune collision au merge.
declare module 'h3' {
  interface H3EventContext {
    /** Id de l'utilisateur authentifié (renseigné par ce middleware). */
    userId?: string
  }
}

export default defineEventHandler(async (event) => {
  event.context.userId = await resolveUserId(
    (args) => auth.api.getSession(args),
    event.headers,
  )
})
