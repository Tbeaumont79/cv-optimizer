/**
 * Pricing — CONFIG, jamais figé en dur dans les composants.
 *
 * Modèle acté (2026-06-10, fondateur) : 2 générations de CV OFFERTES pour tester,
 * puis achat de PACKS DE CRÉDITS one-shot (Stripe Checkout, pas d'abonnement).
 * 1 crédit = 1 génération de CV optimisé. Pas d'offre illimitée : c'est le seul
 * scénario déficitaire (coût API ~0,30–0,40 € par génération, marge packs ~60 %).
 */

/** Générations offertes à l'inscription (aligné sur FREE_TIER_QUOTAS.generation). */
export const FREE_GENERATIONS = 2 as const

export interface CreditPackConfig {
  /** clé i18n du pack dans i18n/fr.ts > pricing.packs */
  key: 'starter' | 'standard'
  priceEur: number
  credits: number
  /** Pack mis en avant visuellement (badge « Le plus populaire »). */
  featured: boolean
}

export const CREDIT_PACKS: readonly CreditPackConfig[] = [
  { key: 'starter', priceEur: 5, credits: 5, featured: false },
  { key: 'standard', priceEur: 12, credits: 15, featured: true },
]
