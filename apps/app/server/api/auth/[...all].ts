/**
 * Route Nitro catch-all → délègue toutes les requêtes /api/auth/** à Better Auth.
 * Couvre : POST /api/auth/magic-link/sign-in, GET /api/auth/magic-link/verify, etc.
 */
import { auth } from '../../utils/auth'

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event))
})
