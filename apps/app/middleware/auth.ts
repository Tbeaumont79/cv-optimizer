/**
 * Middleware de navigation — protège les pages authentifiées.
 * Usage : definePageMeta({ middleware: 'auth' }) dans la page.
 * Redirige vers /connexion si la session est absente.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { session } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (session as any)?.value ?? session
  if (!s) return navigateTo('/connexion')
})
