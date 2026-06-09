/**
 * Contrats partagés client ↔ serveur (Nitro).
 * Le modèle métier (profil, offre, CV…) arrivera après le data model de THI-120.
 * Pour l'instant : uniquement le contrat du health check (preuve de vie).
 */

export type HealthState = 'ok' | 'degraded'
export type DependencyState = 'up' | 'down'

/** Réponse du endpoint GET /api/health exposé par Nitro et consommé par le front. */
export interface HealthStatus {
  /** État global du service. */
  status: HealthState
  /** État de la connexion PostgreSQL. */
  db: DependencyState
  /** Nom du service qui répond. */
  service: string
  /** Horodatage ISO-8601 de la réponse. */
  timestamp: string
}

export const HEALTH_PATH = '/api/health' as const
