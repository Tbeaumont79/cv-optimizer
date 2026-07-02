/**
 * Billing — contrats partagés client ↔ serveur (Nitro).
 *
 * Modèle : packs de crédits one-shot (Stripe Checkout hébergé). 1 crédit = 1
 * génération de CV. Le catalogue des packs (prix/crédits) vit dans
 * `apps/app/config/pricing.ts` (source de vérité serveur+client de l'app) ; ce
 * module ne porte que les CONTRATS d'API neutres réutilisables des deux côtés.
 *
 * RGPD : aucune donnée carte ne transite par notre API (gérée par Stripe).
 */

/** Clé d'un pack de crédits (miroir de CreditPackConfig.key côté app). */
export type CreditPackKey = 'starter' | 'standard'

/** Réponse de `GET /api/billing/summary` — solde de crédits de l'utilisateur. */
export interface BillingSummary {
  /** Crédits disponibles (générations restantes). Jamais négatif. */
  creditBalance: number
}

/** Corps de `POST /api/billing/checkout` — démarre l'achat d'un pack. */
export interface CreateCheckoutRequest {
  packKey: CreditPackKey
}

/** Réponse de `POST /api/billing/checkout` — URL de la page Stripe hébergée. */
export interface CreateCheckoutResponse {
  /** URL Stripe Checkout vers laquelle rediriger le navigateur. */
  url: string
}

export const BILLING_SUMMARY_PATH = '/api/billing/summary' as const
export const BILLING_CHECKOUT_PATH = '/api/billing/checkout' as const
export const BILLING_WEBHOOK_PATH = '/api/billing/webhook' as const
