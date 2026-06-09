import { describe, it, expect } from 'vitest'
import {
  EMPTY_USAGE_SNAPSHOT,
  FREE_TIER_QUOTAS,
  buildUsageSummary,
  isQuotaExceeded,
  quotaStateFor,
  usagePeriod,
  type UsageQuotas,
} from '@cvo/shared'

describe('usagePeriod', () => {
  it('formate la période yyyymm en UTC', () => {
    expect(usagePeriod(new Date('2026-06-09T10:00:00.000Z'))).toBe('202606')
    expect(usagePeriod(new Date('2026-01-31T23:59:59.000Z'))).toBe('202601')
    expect(usagePeriod(new Date('2026-12-01T00:00:00.000Z'))).toBe('202612')
  })

  it('ne saute pas de mois selon le fuseau (UTC)', () => {
    // 23h59 UTC le 30/06 reste en juin même si un fuseau local serait déjà en juillet.
    expect(usagePeriod(new Date('2026-06-30T23:59:00.000Z'))).toBe('202606')
  })
})

describe('isQuotaExceeded', () => {
  const quotas: UsageQuotas = { generation: 3 }

  it('autorise tant que la limite n’est pas atteinte', () => {
    expect(isQuotaExceeded('generation', 0, quotas)).toBe(false)
    expect(isQuotaExceeded('generation', 2, quotas)).toBe(false)
  })

  it('refuse l’action qui ferait dépasser la limite (used >= limit)', () => {
    expect(isQuotaExceeded('generation', 3, quotas)).toBe(true)
    expect(isQuotaExceeded('generation', 4, quotas)).toBe(true)
  })

  it('traite une limite absente ou ≤ 0 comme illimitée', () => {
    expect(isQuotaExceeded('extraction', 9999, quotas)).toBe(false)
    expect(isQuotaExceeded('generation', 9999, { generation: 0 })).toBe(false)
  })
})

describe('quotaStateFor', () => {
  it('expose used / limit / remaining / exceeded', () => {
    expect(quotaStateFor('generation', 2, { generation: 5 })).toEqual({
      type: 'generation',
      used: 2,
      limit: 5,
      remaining: 3,
      exceeded: false,
    })
  })

  it('borne remaining à 0 et marque exceeded au-delà de la limite', () => {
    expect(quotaStateFor('export_pdf', 7, { export_pdf: 5 })).toEqual({
      type: 'export_pdf',
      used: 7,
      limit: 5,
      remaining: 0,
      exceeded: true,
    })
  })

  it('rend limit/remaining null quand illimité', () => {
    const state = quotaStateFor('extraction', 42, FREE_TIER_QUOTAS)
    expect(state.limit).toBeNull()
    expect(state.remaining).toBeNull()
    expect(state.exceeded).toBe(false)
  })
})

describe('buildUsageSummary', () => {
  it('assemble période + compteur + un quota par type', () => {
    const summary = buildUsageSummary(
      '202606',
      { ...EMPTY_USAGE_SNAPSHOT, generation: 5 },
      FREE_TIER_QUOTAS,
    )
    expect(summary.period).toBe('202606')
    expect(summary.counter.generation).toBe(5)
    expect(summary.quotas.map((q) => q.type)).toEqual(['generation', 'export_pdf', 'extraction'])
    const gen = summary.quotas.find((q) => q.type === 'generation')!
    expect(gen.exceeded).toBe(true) // 5/5 atteint
  })
})
