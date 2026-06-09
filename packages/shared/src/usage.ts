/**
 * Metering & quotas (THI-126) — contrats partagés client ↔ serveur (Nitro).
 *
 * On mesure l'usage DÈS le MVP même si tout est gratuit, pour préparer le billing
 * freemium (abo ~9–15 €/mois). Pas de paywall Stripe au MVP : les quotas sont
 * paramétrables et appliqués côté serveur, mais aucune facturation n'est branchée.
 *
 * Les fonctions de ce module sont PURES (aucun accès base / framework) → testables
 * unitairement et réutilisables côté front pour afficher l'usage courant.
 */

/** Type d'événement mesuré. `extraction` = analyse d'offre (Haiku, THI-124). */
export type UsageEventType = 'generation' | 'export_pdf' | 'extraction'

/** Liste exhaustive — source de vérité pour les itérations / validations. */
export const USAGE_EVENT_TYPES = ['generation', 'export_pdf', 'extraction'] as const

/** Période d'agrégation au format `yyyymm` (ex. `"202606"`). */
export type UsagePeriod = string

/**
 * Période `yyyymm` (UTC) d'une date donnée. UTC volontaire : le compteur ne doit
 * pas « sauter » de mois selon le fuseau du serveur. Pur → testé.
 */
export function usagePeriod(date: Date): UsagePeriod {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  return `${year}${String(month).padStart(2, '0')}`
}

/** Agrégat d'usage d'un utilisateur sur une période. */
export interface UsageCounterSnapshot {
  generation: number
  export_pdf: number
  extraction: number
  /** Tokens LLM cumulés (entrée). Jamais le contenu — RGPD. */
  tokensIn: number
  /** Tokens LLM cumulés (sortie). */
  tokensOut: number
  /** Nombre d'événements facturables (base billing). */
  billableCount: number
}

/** Compteur vide — état d'un utilisateur sans usage sur la période. */
export const EMPTY_USAGE_SNAPSHOT: UsageCounterSnapshot = {
  generation: 0,
  export_pdf: 0,
  extraction: 0,
  tokensIn: 0,
  tokensOut: 0,
  billableCount: 0,
}

/**
 * Quotas par période, par type d'événement. Une limite absente ou ≤ 0 = illimité.
 * Paramétrable (le palier ci-dessous n'est qu'un défaut MVP).
 */
export type UsageQuotas = Partial<Record<UsageEventType, number>>

/**
 * Palier gratuit du MVP. Pas de paywall : on autorise quelques générations/exports
 * gratuits par mois. À surcharger via config quand le billing freemium arrivera.
 */
export const FREE_TIER_QUOTAS: UsageQuotas = {
  generation: 5,
  export_pdf: 5,
}

/** État d'un quota pour un type donné, à afficher / à appliquer. */
export interface QuotaState {
  type: UsageEventType
  used: number
  /** `null` = illimité. */
  limit: number | null
  /** `null` = illimité. */
  remaining: number | null
  /** `true` si le quota est atteint (une action de plus serait refusée). */
  exceeded: boolean
}

/** Limite effective d'un type (`null` si illimité). */
function effectiveLimit(type: UsageEventType, quotas: UsageQuotas): number | null {
  const limit = quotas[type]
  return limit === undefined || limit <= 0 ? null : limit
}

/**
 * Gate d'écriture : `true` si une NOUVELLE action de ce type dépasserait le quota.
 * Comparaison `used >= limit` ⇒ on bloque la (limit+1)-ème action. Pur → testé.
 */
export function isQuotaExceeded(type: UsageEventType, used: number, quotas: UsageQuotas): boolean {
  const limit = effectiveLimit(type, quotas)
  return limit !== null && used >= limit
}

/** État détaillé d'un quota (pour l'API / l'UI). Pur → testé. */
export function quotaStateFor(type: UsageEventType, used: number, quotas: UsageQuotas): QuotaState {
  const limit = effectiveLimit(type, quotas)
  return {
    type,
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    exceeded: limit !== null && used >= limit,
  }
}

/** Réponse de `GET /api/usage/current` — usage de la période en cours. */
export interface UsageSummary {
  period: UsagePeriod
  counter: UsageCounterSnapshot
  quotas: QuotaState[]
}

/** Assemble la réponse d'usage à partir d'un snapshot + des quotas. Pur → testé. */
export function buildUsageSummary(
  period: UsagePeriod,
  snapshot: UsageCounterSnapshot,
  quotas: UsageQuotas,
): UsageSummary {
  return {
    period,
    counter: snapshot,
    quotas: USAGE_EVENT_TYPES.map((type) => quotaStateFor(type, snapshot[type], quotas)),
  }
}

export const USAGE_CURRENT_PATH = '/api/usage/current' as const
