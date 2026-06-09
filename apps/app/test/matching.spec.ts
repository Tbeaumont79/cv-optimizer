import { describe, it, expect } from 'vitest'
import {
  ProvenanceError,
  type AnalyzedOffer,
  type ProfileDTO,
  type RenderableCv,
} from '@cvo/shared'
import { matchProfileToOffer, collectProfileItemIds } from '../server/services/matching'
import { analyzeOffer } from '../server/services/offer-analysis'
import type { LlmComplete } from '../server/utils/anthropic'

/** Profil réel minimal : 1 expérience + 1 compétence. Ids = source de vérité. */
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

const OFFER: AnalyzedOffer = {
  title: 'Développeur Front-end',
  requiredSkills: ['TypeScript', 'Kubernetes'],
  keywords: ['SaaS'],
  seniority: 'mid',
}

/** Fabrique un faux client LLM qui renvoie toujours `cv` (aucun réseau). */
const fakeLlm =
  (cv: RenderableCv): LlmComplete =>
  async () =>
    cv

/** CV entièrement sourcé : toutes les provenances pointent vers des ids réels. */
const SOURCED_CV: RenderableCv = {
  locale: 'fr',
  header: {
    fullName: 'Camille',
    headline: 'Dev',
    contacts: [],
    provenance: { profileItemId: 'prof-1', reformulated: true },
  },
  sections: [
    {
      kind: 'skills',
      title: 'Compétences',
      entries: [
        {
          id: 'cv-s1',
          label: 'TypeScript',
          provenance: { profileItemId: 'skill-ts', reformulated: false },
        },
      ],
    },
  ],
}

describe('collectProfileItemIds', () => {
  it('rassemble le header + expériences + compétences + formations', () => {
    expect(collectProfileItemIds(PROFILE)).toEqual(new Set(['prof-1', 'exp-1', 'skill-ts']))
  })
})

describe('matchProfileToOffer — garde-fou de provenance (THI-124 §3)', () => {
  it('accepte un CV dont chaque élément est sourcé', async () => {
    const cv = await matchProfileToOffer(PROFILE, OFFER, { complete: fakeLlm(SOURCED_CV) })
    expect(cv.sections).toHaveLength(1)
  })

  it('REJETTE un CV où le LLM a inventé une compétence (provenance absente)', async () => {
    const invented: RenderableCv = structuredClone(SOURCED_CV)
    const skills = invented.sections.find((s) => s.kind === 'skills')!
    // Item halluciné : « Kubernetes » est dans l'offre mais PAS dans le profil.
    skills.entries.push({ id: 'cv-sx', label: 'Kubernetes' } as never)

    await expect(
      matchProfileToOffer(PROFILE, OFFER, { complete: fakeLlm(invented) }),
    ).rejects.toBeInstanceOf(ProvenanceError)
  })

  it('REJETTE un item dont la provenance pointe vers un id absent du profil', async () => {
    const invented: RenderableCv = structuredClone(SOURCED_CV)
    const skills = invented.sections.find((s) => s.kind === 'skills')!
    skills.entries[0].provenance = { profileItemId: 'skill-fantome', reformulated: false }

    await expect(
      matchProfileToOffer(PROFILE, OFFER, { complete: fakeLlm(invented) }),
    ).rejects.toBeInstanceOf(ProvenanceError)
  })
})

describe('analyzeOffer — étape 1', () => {
  it('retourne le résumé structuré renvoyé par le LLM', async () => {
    const complete: LlmComplete = async () => OFFER
    const result = await analyzeOffer('Nous recherchons un développeur front-end…', { complete })
    expect(result.title).toBe('Développeur Front-end')
    expect(result.requiredSkills).toContain('Kubernetes')
  })

  it('rejette une offre vide', async () => {
    const complete: LlmComplete = async () => OFFER
    await expect(analyzeOffer('   ', { complete })).rejects.toThrow()
  })
})
