/**
 * Contrats partagés client ↔ serveur (Nitro) et frontière Moteur ↔ Génération.
 * - Health check (preuve de vie — scaffold THI-122).
 * - Profil candidat (THI-123) → ./profile.
 */

export * from './profile'

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

// Contrat du CV structuré + garde-fou de provenance (THI-124 ↔ THI-125).
export * from './cv'
export * from './provenance'
