/**
 * POST /api/billing/checkout — démarre l'achat d'un pack de crédits.
 *
 * Crée (ou réutilise) le client Stripe de l'utilisateur, puis une session
 * Checkout hébergée (mode `payment`, one-shot). Le prix est résolu par `lookup_key`
 * (posé par le seed) → aucun ID Stripe stocké en base. Les crédits ne sont accordés
 * qu'au webhook `checkout.session.completed` (paiement confirmé), jamais ici.
 *
 * Sécurité : montant/crédits déterminés SERVER-SIDE depuis le catalogue (le client
 * n'envoie qu'une clé de pack) — pas de prix piloté par le client.
 */
import { z } from 'zod'
import type { CreateCheckoutResponse } from '@cvo/shared'
import { requireUserId } from '../../utils/session'
import { prisma } from '../../utils/prisma'
import { getStripe, StripeNotConfiguredError } from '../../utils/stripe'
import { resolveCreditPack, packLookupKey } from '../../../config/pricing'

const bodySchema = z.object({ packKey: z.string() })

export default defineEventHandler(async (event): Promise<CreateCheckoutResponse> => {
  const userId = requireUserId(event)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Corps invalide : { packKey } attendu.' })

  // Catalogue = source de vérité serveur (prix/crédits jamais pilotés par le client).
  const pack = resolveCreditPack(parsed.data.packKey)
  if (!pack) throw createError({ statusCode: 400, message: 'Pack inconnu.' })

  try {
    const stripe = getStripe()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, stripeCustomerId: true },
    })
    if (!user) throw createError({ statusCode: 401, message: 'Non authentifié.' })

    // Client Stripe : créé à la première intention d'achat, puis mémorisé.
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId },
      })
      customerId = customer.id
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } })
    }

    // Prix résolu par lookup_key (posé par le seed). Absent ⇒ seed non exécuté.
    const prices = await stripe.prices.list({
      lookup_keys: [packLookupKey(pack.key)],
      active: true,
      limit: 1,
    })
    const price = prices.data[0]
    if (!price) {
      throw createError({ statusCode: 503, message: 'Catalogue Stripe non initialisé (lance le seed).' })
    }

    const origin = process.env.APP_URL || getRequestURL(event).origin
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/credits?status=success`,
      cancel_url: `${origin}/credits?status=cancel`,
      // Métadonnées relues par le webhook pour créditer le bon compte.
      metadata: { userId, packKey: pack.key, credits: String(pack.credits) },
      payment_intent_data: { metadata: { userId, packKey: pack.key, credits: String(pack.credits) } },
    })

    if (!session.url) throw createError({ statusCode: 502, message: 'Session Checkout sans URL.' })
    return { url: session.url }
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      throw createError({ statusCode: 503, message: 'Paiement indisponible (Stripe non configuré).' })
    }
    throw err
  }
})
