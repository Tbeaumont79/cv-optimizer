/**
 * Composable côté client pour l'authentification (Better Auth magic-link).
 * Expose : session réactive, signIn (envoi du magic-link), signOut.
 *
 * Utilisation :
 *   const { session, signIn, signOut, pending } = useAuth()
 *   await signIn('user@example.com')  // envoie le magic-link
 *   await signOut()
 */
import { createAuthClient } from 'better-auth/client'
import { magicLinkClient } from 'better-auth/client/plugins'

// Singleton par contexte. Le client vanilla better-auth exige une URL ABSOLUE
// quand on en fournit une (une relative type '/api/auth' est rejetée partout) :
// - navigateur : on omet baseURL → il prend l'origine courante + '/api/auth'
//   (chemin par défaut de Better Auth) ;
// - SSR (le layout lit la session au rendu) : on la construit depuis
//   runtimeConfig.public.appUrl.
let _client: ReturnType<typeof createAuthClient> | null = null

function getClient() {
  if (!_client) {
    _client = createAuthClient({
      ...(import.meta.server
        ? { baseURL: `${useRuntimeConfig().public.appUrl}/api/auth` }
        : {}),
      plugins: [magicLinkClient()],
    })
  }
  return _client
}

export function useAuth() {
  const client = getClient()
  const pending = ref(false)
  const error = ref<string | null>(null)

  /**
   * Session Better Auth (null si non connecté).
   * Better Auth client expose useSession en tant que composable Vue 3 —
   * on le délègue directement pour que la réactivité fonctionne.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = (client as any).useSession ?? ref(null)

  /**
   * Envoie un magic-link à l'adresse e-mail.
   * Dev : le lien apparaît dans la console serveur (pas de SMTP requis).
   */
  async function signIn(email: string): Promise<boolean> {
    pending.value = true
    error.value = null
    try {
      // @ts-expect-error — Better Auth client plugin types are dynamic
      await client.signIn.magicLink({ email, callbackURL: '/profil' })
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'envoi du lien.'
      return false
    } finally {
      pending.value = false
    }
  }

  async function signOut(): Promise<void> {
    pending.value = true
    try {
      await client.signOut()
    } finally {
      pending.value = false
    }
  }

  return { session, signIn, signOut, pending: readonly(pending), error: readonly(error) }
}
