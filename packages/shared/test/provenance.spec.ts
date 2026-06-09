import { describe, it, expect } from 'vitest'
import { checkProvenance, assertValidCv, ProvenanceError } from '../src/provenance'
import type { RenderableCv } from '../src/cv'
import { SAMPLE_CV, SAMPLE_PROFILE_ITEM_IDS } from '../src/fixtures/sample-cv'

/** Clone profond pour muter un CV sans toucher la fixture partagée. */
function clone(cv: RenderableCv): RenderableCv {
  return structuredClone(cv)
}

describe('checkProvenance — garde-fou', () => {
  it('accepte un CV entièrement sourcé', () => {
    const result = checkProvenance(SAMPLE_CV, SAMPLE_PROFILE_ITEM_IDS)
    expect(result.ok).toBe(true)
    expect(result.violations).toEqual([])
  })

  it('REJETTE une compétence inventée (provenance absente)', () => {
    const cv = clone(SAMPLE_CV)
    const skills = cv.sections.find((s) => s.kind === 'skills')!
    // Item halluciné : aucune provenance, comme le ferait une sortie LLM non contrôlée.
    skills.entries.push({ id: 'cv-sk-x', label: 'Kubernetes' } as never)

    const result = checkProvenance(cv, SAMPLE_PROFILE_ITEM_IDS)
    expect(result.ok).toBe(false)
    expect(result.violations).toContainEqual(
      expect.objectContaining({ reason: 'missing', path: expect.stringContaining('entries[2]') }),
    )
  })

  it('REJETTE un item dont la provenance pointe vers un id absent du profil', () => {
    const cv = clone(SAMPLE_CV)
    const skills = cv.sections.find((s) => s.kind === 'skills')!
    skills.entries[0].provenance = { profileItemId: 'skill-fantome', reformulated: false }

    const result = checkProvenance(cv, SAMPLE_PROFILE_ITEM_IDS)
    expect(result.ok).toBe(false)
    expect(result.violations).toContainEqual(
      expect.objectContaining({ reason: 'unknown', profileItemId: 'skill-fantome' }),
    )
  })

  it('REJETTE une puce d’expérience inventée (provenance vide)', () => {
    const cv = clone(SAMPLE_CV)
    const exp = cv.sections.find((s) => s.kind === 'experience')!
    exp.entries[0].bullets.push({
      id: 'cv-exp-1-bx',
      text: 'A piloté une équipe de 10 personnes.',
      provenance: { profileItemId: '', reformulated: true },
    })

    const result = checkProvenance(cv, SAMPLE_PROFILE_ITEM_IDS)
    expect(result.ok).toBe(false)
    expect(result.violations.some((v) => v.path.includes('bullets'))).toBe(true)
  })
})

describe('assertValidCv — barrière stricte', () => {
  it('ne lève pas pour un CV sourcé', () => {
    expect(() => assertValidCv(SAMPLE_CV, SAMPLE_PROFILE_ITEM_IDS)).not.toThrow()
  })

  it('lève ProvenanceError avec les violations pour un CV non sourcé', () => {
    const cv = clone(SAMPLE_CV)
    const skills = cv.sections.find((s) => s.kind === 'skills')!
    skills.entries.push({ id: 'cv-sk-x', label: 'Inventé' } as never)

    expect(() => assertValidCv(cv, SAMPLE_PROFILE_ITEM_IDS)).toThrow(ProvenanceError)
  })
})
