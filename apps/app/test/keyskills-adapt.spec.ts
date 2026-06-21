import { describe, it, expect } from 'vitest'
import type { AnalyzedOffer } from '@cvo/shared'
import { adaptKeySkills } from '../server/services/keyskills-adapt'
import { type LlmComplete } from '../server/utils/anthropic'

const OFFER: AnalyzedOffer = { title: 'Dev Vue', requiredSkills: ['Vue.js'], keywords: ['SPA'], seniority: 'mid' }
const SOURCE = ['Concevoir des apps Vue', 'Maîtriser Node.js', 'Livrer du code testé']

const fakeLlm =
  (payload: unknown): LlmComplete =>
  async () =>
    payload

describe('adaptKeySkills — adaptation bornée (anti-invention)', () => {
  it('renvoie les phrases adaptées (trim + sans vides)', async () => {
    const out = await adaptKeySkills(SOURCE, OFFER, {
      complete: fakeLlm({ keySkills: ['  Concevoir des SPA Vue.js  ', '', 'Livrer du code testé'] }),
    })
    expect(out).toEqual(['Concevoir des SPA Vue.js', 'Livrer du code testé'])
  })

  it('borne au nombre de phrases sources (jamais plus)', async () => {
    const out = await adaptKeySkills(SOURCE, OFFER, {
      complete: fakeLlm({ keySkills: ['a', 'b', 'c', 'd', 'e'] }),
    })
    expect(out).toHaveLength(3) // SOURCE en a 3
  })

  it('repli verbatim si le LLM ne renvoie rien d’exploitable', async () => {
    const out = await adaptKeySkills(SOURCE, OFFER, { complete: fakeLlm({ keySkills: [] }) })
    expect(out).toEqual(SOURCE)
  })

  it('liste vide en entrée → liste vide (aucun appel nécessaire)', async () => {
    const out = await adaptKeySkills([], OFFER, {
      complete: async () => { throw new Error('ne devrait pas être appelé') },
    })
    expect(out).toEqual([])
  })
})
