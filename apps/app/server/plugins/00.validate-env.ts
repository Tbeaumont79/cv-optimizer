/**
 * Fail-fast de configuration au démarrage du serveur (Nitro).
 *
 * En production, on REFUSE de démarrer si un secret critique est absent/faible :
 * un fallback silencieux (secret d'auth codé en dur, cookies non-Secure) ouvre
 * une usurpation de session totale. Mieux vaut un crash au boot qu'une prod
 * vulnérable en silence. En dev, on ne bloque pas (valeurs de repli tolérées).
 *
 * S'exécute une fois à l'initialisation ; lit la runtimeConfig résolue (donc les
 * overrides d'env runtime `NUXT_*` sont bien pris en compte).
 */
export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return

  const config = useRuntimeConfig()
  const fail = (msg: string): never => {
    throw new Error(`[config] ${msg} — refus de démarrer en production.`)
  }

  const secret = config.authSecret
  if (!secret || secret.length < 32 || secret.includes('change-in-prod')) {
    fail('BETTER_AUTH_SECRET manquant, trop court (<32) ou laissé à la valeur de dev')
  }

  // Better Auth n'active les cookies Secure que si baseURL est en https.
  if (!config.public.appUrl.startsWith('https://')) {
    fail('APP_URL doit être en https:// (cookies de session Secure)')
  }
})
