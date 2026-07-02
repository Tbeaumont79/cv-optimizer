/**
 * POST /api/billing/webhook — réception des événements Stripe.
 *
 * Sécurité : la signature est vérifiée avec `STRIPE_WEBHOOK_SECRET` sur le corps
 * BRUT (readRawBody) — un webhook non signé/altéré est rejeté (400). Idempotent :
 * créditer un achat repose sur la contrainte unique du ledger (rejeu sans effet).
 *
 * On ne crédite QUE sur `checkout.session.completed` payé : les crédits proviennent
 * d'un paiement confirmé, jamais d'un appel client.
 */
import type Stripe from 'stripe'
import { getStripe, StripeNotConfiguredError } from '../../utils/stripe'
import { grantPurchasedCredits } from '../../utils/credits'

export default defineEventHandler(async (event) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || secret.includes('changeme')) {
    throw createError({ statusCode: 503, message: 'Webhook Stripe non configuré.' })
  }

  const signature = getHeader(event, 'stripe-signature')
  const raw = await readRawBody(event)
  if (!signature || !raw) throw createError({ statusCode: 400, message: 'Signature ou corps manquant.' })

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = getStripe().webhooks.constructEvent(raw, signature, secret)
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      throw createError({ statusCode: 503, message: 'Webhook Stripe non configuré.' })
    }
    // Signature invalide ⇒ requête non authentique (ou corps altéré).
    throw createError({ statusCode: 400, message: 'Signature de webhook invalide.' })
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session
    if (session.payment_status === 'paid') {
      const userId = session.metadata?.userId
      const packKey = session.metadata?.packKey ?? ''
      const credits = Number(session.metadata?.credits)
      if (userId && Number.isFinite(credits) && credits > 0) {
        // Idempotent : un rejeu du même paiement ne crédite pas deux fois.
        await grantPurchasedCredits({ userId, sessionId: session.id, packKey, credits })
      }
    }
  }

  return { received: true }
})
