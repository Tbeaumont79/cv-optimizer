import { describe, it, expect, vi } from 'vitest'
import { extractCvContent } from '../server/services/cv-content-extract'
import type { LlmComplete } from '../server/utils/anthropic'

describe('extractCvContent', () => {
  it('envoie le PDF en bloc document et normalise le contenu', async () => {
    const complete = vi.fn(async (req) => {
      const blocks = req.user as Array<{ type: string }>
      expect(blocks[0]!.type).toBe('document')
      return {
        fullName: 'Camille Martin',
        email: null,
        phone: null,
        location: 'Paris',
        links: ['https://github.com/camille'],
        headline: 'Dev full-stack',
        summary: null,
        experiences: [
          {
            title: 'Lead',
            company: 'Acme',
            startDate: '2021-01',
            endDate: null,
            description: null,
            skillsUsed: ['Vue', 'Node'],
          },
        ],
        skills: [{ label: 'TypeScript', level: 'EXPERT', years: 6 }],
        languages: [{ label: 'Anglais', level: 'C1' }],
      }
    }) as unknown as LlmComplete

    const parsed = await extractCvContent('UERG', { complete })

    expect(parsed.fullName).toBe('Camille Martin')
    expect(parsed.experiences).toHaveLength(1)
    expect(parsed.experiences[0]!.company).toBe('Acme')
    expect(parsed.skills[0]!.level).toBe('EXPERT')
    expect(parsed.languages[0]!.label).toBe('Anglais')
  })

  it('tolère une réponse partielle (champs manquants → null/[])', async () => {
    const complete = vi.fn(async () => ({ fullName: 'X' })) as unknown as LlmComplete
    const parsed = await extractCvContent('UERG', { complete })
    expect(parsed.experiences).toEqual([])
    expect(parsed.skills).toEqual([])
    expect(parsed.languages).toEqual([])
    expect(parsed.email).toBe('')
  })
})
