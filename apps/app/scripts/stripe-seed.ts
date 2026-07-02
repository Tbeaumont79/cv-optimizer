/**
 * Seed Stripe idempotent — crée les produits + prix des packs de crédits depuis
 * `config/pricing.ts`. Source de vérité = le code (reproductible test → prod).
 *
 * Idempotence : on cherche le prix par `lookup_key` ; s'il existe, on passe. Le
 * checkout résout ensuite le prix par cette même clé (aucun ID Stripe en base).
 *
 * Lancement (depuis apps/app, .env chargé) :
 *   node --env-file=.env --import tsx scripts/stripe-seed.ts
 *   (ou `pnpm --filter @cvo/app stripe:seed`)
 */
import Stripe from 'stripe'
import { CREDIT_PACKS, packLookupKey, packAmountCents } from '../config/pricing'

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key.includes('changeme')) {
    throw new Error('STRIPE_SECRET_KEY manquante : renseigne apps/app/.env (clé de TEST).')
  }
  const stripe = new Stripe(key)

  for (const pack of CREDIT_PACKS) {
    const lookupKey = packLookupKey(pack.key)
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
    if (existing.data.length > 0) {
      console.log(`= pack "${pack.key}" : prix déjà présent (${lookupKey}) — ignoré`)
      continue
    }

    const product = await stripe.products.create({
      name: `Teven — ${pack.credits} crédits`,
      description: `${pack.credits} générations de CV optimisé`,
      metadata: { packKey: pack.key, credits: String(pack.credits) },
    })
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: packAmountCents(pack),
      lookup_key: lookupKey,
      metadata: { packKey: pack.key, credits: String(pack.credits) },
    })
    console.log(`+ pack "${pack.key}" : ${pack.priceEur}€ / ${pack.credits} crédits (price ${price.id})`)
  }
  console.log('Seed Stripe terminé.')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
