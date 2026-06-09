import type { HealthStatus } from '@cvo/shared'

/** Forme minimale d'un client capable de pinguer la base (facilite le test). */
export interface DbPinger {
  $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>
}

/** Preuve de vie de la connexion PostgreSQL. Pure vis-à-vis du framework, donc testable. */
export async function pingDb(client: DbPinger): Promise<boolean> {
  try {
    await client.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

/** Construit la réponse health (pure → testée unitairement). */
export function buildHealthStatus(dbUp: boolean, now: Date): HealthStatus {
  return {
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    service: 'cvo-app',
    timestamp: now.toISOString(),
  }
}
