/**
 * Pricing — CONFIG, jamais figé en dur dans les composants.
 *
 * ⚠️ Arbitrage RÉSERVÉ AU RÉFÉRENT (pricing THI-119) : le montant exact et la
 * liste précise des features par plan sont à valider. Fourchette validée
 * 9–15 €/mois ; `PREMIUM_PRICE_EUR` est un PLACEHOLDER au milieu de la
 * fourchette, à confirmer avant tout go-live.
 */
export const PREMIUM_PRICE_EUR = 12 as const // placeholder 9–15 € — à arbitrer (THI-119)

export interface PlanConfig {
  /** clé i18n du plan dans i18n/fr.ts > pricing.plans */
  key: 'free' | 'premium'
  /** prix mensuel en € ; null = gratuit */
  priceEur: number | null
  featured: boolean
}

export const PLANS: readonly PlanConfig[] = [
  { key: 'free', priceEur: null, featured: false },
  { key: 'premium', priceEur: PREMIUM_PRICE_EUR, featured: true },
]
