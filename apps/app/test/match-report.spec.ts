import { describe, it, expect } from 'vitest'
import type { AnalyzedOffer, ProfileDTO } from '@cvo/shared'
import { buildMatchReport } from '../server/services/match-report'
import { LlmError, type LlmComplete } from '../server/utils/anthropic'

/** Profil réel minimal : la compétence TypeScript couvre l'offre OFFER. */
const PROFILE: ProfileDTO = {
  id: 'prof-1',
  headline: 'Dev full-stack',
  summary: 'Quatre ans de TypeScript.',
  experiences: [
    {
      id: 'exp-1',
      title: 'Développeuse',
      company: 'ACME',
      startDate: '2021-01-01',
      endDate: null,
      description: 'Vue + Node',
      skillsUsed: ['TypeScript'],
      orderIndex: 0,
    },
  ],
  skills: [{ id: 'skill-ts', label: 'TypeScript', level: 'ADVANCED', years: 4, orderIndex: 0 }],
  education: [],
}

/** Offre partiellement couverte : TypeScript présent, Kubernetes absent. */
const OFFER: AnalyzedOffer = {
  title: 'Développeur Front-end',
  requiredSkills: ['TypeScript', 'Kubernetes'],
  keywords: [],
  seniority: 'mid',
}

/** Offre SANS AUCUNE couverture par PROFILE (pour le garde-fou de cohérence). */
const OFFER_DISJOINTE: AnalyzedOffer = {
  title: 'Ingénieur plateforme',
  requiredSkills: ['Kubernetes'],
  keywords: ['Terraform'],
  seniority: null,
}

/** Faux client LLM qui renvoie toujours `payload` (aucun réseau). */
const fakeLlm =
  (payload: unknown): LlmComplete =>
  async () =>
    payload

describe('buildMatchReport — score + raisons (THI flux candidature)', () => {
  it('borne le score LLM dans [0, 100]', async () => {
    const report = await buildMatchReport(PROFILE, OFFER, {
      complete: fakeLlm({ score: 142.7, reasons: ['Très bon recouvrement'] }),
    })
    expect(report.score).toBe(100)
  })

  it('retombe à 0 sur un score non numérique', async () => {
    const report = await buildMatchReport(PROFILE, OFFER, {
      complete: fakeLlm({ score: 'excellent', reasons: ['Bon profil'] }),
    })
    expect(report.score).toBe(0)
  })

  it('nettoie les raisons : trim, vides exclues, non-strings exclues, max 4', async () => {
    const report = await buildMatchReport(PROFILE, OFFER, {
      complete: fakeLlm({
        score: 55,
        reasons: ['  Solide sur TypeScript  ', '', 42, 'Manque Kubernetes', '   ', 'a', 'b', 'c'],
      }),
    })
    expect(report.reasons).toEqual(['Solide sur TypeScript', 'Manque Kubernetes', 'a', 'b'])
  })

  it('calcule matched/missing par le code (déterministe), pas par le LLM', async () => {
    const report = await buildMatchReport(PROFILE, OFFER, {
      complete: fakeLlm({ score: 60, reasons: ['ok'] }),
    })
    expect(report.matchedKeywords).toEqual(['TypeScript'])
    expect(report.missingKeywords).toEqual(['Kubernetes'])
  })

  it('GARDE-FOU : plafonne à 60 un score > 70 quand AUCUN mot-clé n’est couvert', async () => {
    const report = await buildMatchReport(PROFILE, OFFER_DISJOINTE, {
      complete: fakeLlm({ score: 85, reasons: ['r1', 'r2', 'r3', 'r4'] }),
    })
    expect(report.score).toBe(60)
    // L'explication du plafond est visible, et la borne de 4 raisons tient.
    expect(report.reasons.length).toBeLessThanOrEqual(4)
    expect(report.reasons.at(-1)).toMatch(/plafonné/i)
    expect(report.matchedKeywords).toEqual([])
  })

  it('ne plafonne PAS un score ≤ 70 même sans couverture', async () => {
    const report = await buildMatchReport(PROFILE, OFFER_DISJOINTE, {
      complete: fakeLlm({ score: 35, reasons: ['Profil hors sujet'] }),
    })
    expect(report.score).toBe(35)
    expect(report.reasons).toEqual(['Profil hors sujet'])
  })

  it('propage LlmError telle quelle (gérée en 502 par l’endpoint)', async () => {
    const complete: LlmComplete = async () => {
      throw new LlmError('Claude API 529')
    }
    await expect(buildMatchReport(PROFILE, OFFER, { complete })).rejects.toBeInstanceOf(LlmError)
  })
})
