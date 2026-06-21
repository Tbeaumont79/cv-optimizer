import { describe, it, expect } from 'vitest'
import { toCandidatureDTO, toCandidatureListItemDTO, type CandidatureRow } from '../server/utils/candidature-serialize'

const baseRow: CandidatureRow = {
  id: 'c1',
  label: 'Dev Fullstack',
  status: 'SUBMITTED',
  matchScore: 78,
  offerSnapshot: { title: 'Dev Fullstack', requiredSkills: ['Vue'], keywords: ['node'], seniority: 'mid' },
  matchReport: { score: 78, reasons: ['ok'], matchedKeywords: ['vue'], missingKeywords: [] },
  generatedCv: { locale: 'fr', header: { fullName: 'X', headline: 'Y', contacts: [], provenance: { profileItemId: 'p', reformulated: false } }, sections: [] },
  design: { layout: 'sidebar-left', accent: '#123456', sidebarBg: '#000000', sidebarFg: '#ffffff', font: 'Inter', summary: '' },
  createdAt: new Date('2026-06-01T10:00:00.000Z'),
  updatedAt: new Date('2026-06-02T10:00:00.000Z'),
}

describe('toCandidatureListItemDTO', () => {
  it('mappe les champs légers + dates ISO', () => {
    const dto = toCandidatureListItemDTO(baseRow)
    expect(dto).toEqual({
      id: 'c1',
      label: 'Dev Fullstack',
      status: 'SUBMITTED',
      matchScore: 78,
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-02T10:00:00.000Z',
    })
  })
})

describe('toCandidatureDTO', () => {
  it('inclut offre/match/cv et normalise le design', () => {
    const dto = toCandidatureDTO(baseRow)
    expect(dto.offer.title).toBe('Dev Fullstack')
    expect(dto.match.score).toBe(78)
    expect(dto.cv.header.fullName).toBe('X')
    expect(dto.design?.layout).toBe('sidebar-left')
    expect(dto.design?.accent).toBe('#123456')
    expect(dto.design?.photo).toBeNull() // normalisé (photo absente → null)
  })

  it('design null reste null', () => {
    const dto = toCandidatureDTO({ ...baseRow, design: null })
    expect(dto.design).toBeNull()
  })
})
