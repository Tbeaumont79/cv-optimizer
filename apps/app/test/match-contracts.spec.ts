import { describe, it, expect } from 'vitest'
import {
  clampScore,
  computeKeywordCoverage,
  matchVerdict,
  type AnalyzedOffer,
  type ProfileDTO,
} from '@cvo/shared'

describe('matchVerdict — bornes des seuils', () => {
  it('39 → weak (sous LOW_MATCH_THRESHOLD)', () => {
    expect(matchVerdict(39)).toBe('weak')
  })

  it('40 → medium (seuil bas atteint)', () => {
    expect(matchVerdict(40)).toBe('medium')
  })

  it('69 → medium (sous STRONG_MATCH_THRESHOLD)', () => {
    expect(matchVerdict(69)).toBe('medium')
  })

  it('70 → strong (seuil fort atteint)', () => {
    expect(matchVerdict(70)).toBe('strong')
  })
})

describe('clampScore — bornage du score LLM', () => {
  it('NaN → 0', () => {
    expect(clampScore(NaN)).toBe(0)
  })

  it('-5 → 0 (borne basse)', () => {
    expect(clampScore(-5)).toBe(0)
  })

  it('142.7 → 100 (borne haute)', () => {
    expect(clampScore(142.7)).toBe(100)
  })

  it('87.4 → 87 (arrondi entier)', () => {
    expect(clampScore(87.4)).toBe(87)
  })
})

/** Profil minimal : compétences + une expérience avec skillsUsed. */
const PROFILE: ProfileDTO = {
  id: 'prof-1',
  headline: 'Cheffe de projet digital',
  summary: 'Cinq ans en gestion de projet agile.',
  experiences: [
    {
      id: 'exp-1',
      title: 'Cheffe de projet',
      company: 'ACME',
      startDate: '2020-01-01',
      endDate: null,
      description: null,
      skillsUsed: ['TypeScript'],
      orderIndex: 0,
    },
  ],
  skills: [{ id: 'skill-1', label: 'Réactivité', level: null, years: null, orderIndex: 0 }],
  education: [],
}

function offerWith(requiredSkills: string[], keywords: string[] = []): AnalyzedOffer {
  return { title: 'Poste', requiredSkills, keywords, seniority: null }
}

describe('computeKeywordCoverage — couverture déterministe', () => {
  it('matche sans tenir compte des accents ni de la casse', () => {
    // « Gestion de projet » (offre) vs « gestion de projet » (résumé du profil),
    // « réactivité » (offre, minuscules) vs « Réactivité » (compétence).
    const { matched, missing } = computeKeywordCoverage(
      offerWith(['Gestion de projet', 'réactivité']),
      PROFILE,
    )
    expect(matched).toEqual(['Gestion de projet', 'réactivité'])
    expect(missing).toEqual([])
  })

  it('matche un mot-clé présent dans les skillsUsed d’une expérience', () => {
    const { matched } = computeKeywordCoverage(offerWith(['TypeScript']), PROFILE)
    expect(matched).toContain('TypeScript')
  })

  it('classe en missing un mot-clé réellement absent du profil', () => {
    const { matched, missing } = computeKeywordCoverage(offerWith(['Kubernetes']), PROFILE)
    expect(matched).toEqual([])
    expect(missing).toEqual(['Kubernetes'])
  })

  it('dédoublonne un mot-clé présent dans requiredSkills ET keywords', () => {
    const { matched, missing } = computeKeywordCoverage(
      offerWith(['TypeScript', 'Kubernetes'], ['typescript', 'kubernetes']),
      PROFILE,
    )
    // Une seule occurrence par mot-clé normalisé, requiredSkills prioritaire.
    expect(matched).toEqual(['TypeScript'])
    expect(missing).toEqual(['Kubernetes'])
  })
})
