/**
 * Client Stripe serveur (singleton paresseux). La clé vient de l'env
 * `STRIPE_SECRET_KEY` (restreinte `rk_` recommandée) — JAMAIS en dur, jamais loggée.
 *
 * On n'épingle pas `apiVersion` explicitement : le SDK utilise sa version intégrée,
 * et la version par défaut du compte gouverne — suffisant pour Checkout + webhooks.
 */
import Stripe from 'stripe'

let client: Stripe | null = null

/** Erreur de configuration (clé absente) — distincte des erreurs Stripe runtime. */
export class StripeNotConfiguredError extends Error {
  constructor() {
    super('STRIPE_SECRET_KEY manquante')
    this.name = 'StripeNotConfiguredError'
  }
}

/** Retourne le client Stripe, ou lève `StripeNotConfiguredError` si non configuré. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key.includes('changeme')) throw new StripeNotConfiguredError()
  if (!client) client = new Stripe(key)
  return client
}
