/**
 * Middleware de navigation — protège les pages authentifiées.
 * Usage : definePageMeta({ middleware: 'auth' }) dans la page.
 * Redirige vers /connexion si la session est absente.
 *
 * La session est vérifiée auprès du serveur Better Auth (GET /api/auth/get-session),
 * fiable en SSR (cookies transférés) comme en navigation client. L'atom nanostores
 * de useAuth() n'est PAS utilisable ici : l'objet est toujours truthy et la session
 * n'est hydratée qu'après le premier fetch côté client — l'ancien check laissait
 * passer les visiteurs non connectés (écran d'erreur 401 sur /profil au lieu d'une
 * redirection).
 */
export default defineNuxtRouteMiddleware(async () => {
  // En SSR, $fetch interne ne transmet pas les cookies du navigateur tout seul.
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  try {
    const session = await $fetch('/api/auth/get-session', { headers })
    if (!session) return navigateTo('/connexion')
  } catch {
    return navigateTo('/connexion')
  }
})
