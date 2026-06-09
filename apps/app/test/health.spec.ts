import { describe, it, expect } from 'vitest'
import { buildHealthStatus, pingDb, type DbPinger } from '../server/utils/health'
import { healthLabel } from '../utils/health-label'

describe('buildHealthStatus', () => {
  const now = new Date('2026-01-01T00:00:00.000Z')

  it('reports ok / db up when the database responds', () => {
    const status = buildHealthStatus(true, now)
    expect(status).toEqual({
      status: 'ok',
      db: 'up',
      service: 'cvo-app',
      timestamp: '2026-01-01T00:00:00.000Z',
    })
  })

  it('reports degraded / db down when the database is unreachable', () => {
    const status = buildHealthStatus(false, now)
    expect(status.status).toBe('degraded')
    expect(status.db).toBe('down')
  })
})

describe('pingDb', () => {
  it('returns true when $queryRaw resolves', async () => {
    const client: DbPinger = { $queryRaw: async () => [{ '?column?': 1 }] }
    expect(await pingDb(client)).toBe(true)
  })

  it('returns false when $queryRaw throws', async () => {
    const client: DbPinger = {
      $queryRaw: async () => {
        throw new Error('connection refused')
      },
    }
    expect(await pingDb(client)).toBe(false)
  })
})

describe('healthLabel', () => {
  const base = { db: 'up', service: 'cvo-app', timestamp: 'x' } as const

  it('maps ok to a friendly FR label', () => {
    expect(healthLabel({ ...base, status: 'ok' })).toBe('Service opérationnel')
  })

  it('maps degraded to a friendly FR label', () => {
    expect(healthLabel({ ...base, status: 'degraded', db: 'down' })).toBe('Service dégradé')
  })
})
