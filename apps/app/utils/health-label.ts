import type { HealthStatus } from '@cvo/shared'

/** Libellé FR lisible pour l'état de santé (auto-importé par Nuxt, testé unitairement). */
export function healthLabel(status: HealthStatus): string {
  return status.status === 'ok' ? 'Service opérationnel' : 'Service dégradé'
}
