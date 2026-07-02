import { describe, it, expect } from 'vitest'
import {
  CREDIT_PACKS,
  FREE_GENERATIONS,
  packLookupKey,
  resolveCreditPack,
  packAmountCents,
} from '../config/pricing'
import { freeGrantKey } from '../server/utils/credits'

describe('pricing — catalogue de packs', () => {
  it('packs attendus (starter 5€/5, standard 12€/15)', () => {
    expect(CREDIT_PACKS.map((p) => [p.key, p.priceEur, p.credits])).toEqual([
      ['starter', 5, 5],
      ['standard', 12, 15],
    ])
  })

  it('FREE_GENERATIONS = 5 (offertes à vie)', () => {
    expect(FREE_GENERATIONS).toBe(5)
  })

  it('resolveCreditPack : clé connue → pack, inconnue → null', () => {
    expect(resolveCreditPack('standard')?.credits).toBe(15)
    expect(resolveCreditPack('starter')?.priceEur).toBe(5)
    expect(resolveCreditPack('inconnu')).toBeNull()
    expect(resolveCreditPack('')).toBeNull()
  })

  it('packAmountCents : euros → centimes entiers', () => {
    expect(packAmountCents({ key: 'starter', priceEur: 5, credits: 5, featured: false })).toBe(500)
    expect(packAmountCents({ key: 'standard', priceEur: 12, credits: 15, featured: true })).toBe(1200)
  })

  it('packLookupKey : clé Stripe stable et préfixée', () => {
    expect(packLookupKey('starter')).toBe('teven_credits_starter')
    expect(packLookupKey('standard')).toBe('teven_credits_standard')
  })
})

describe('credits — clé d’idempotence de l’octroi gratuit', () => {
  it('freeGrantKey : 1 clé déterministe par utilisateur', () => {
    expect(freeGrantKey('user-123')).toBe('free:user-123')
    expect(freeGrantKey('abc')).not.toBe(freeGrantKey('abd'))
  })
})
