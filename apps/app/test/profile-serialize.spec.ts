import { describe, it, expect } from 'vitest'
import {
  NOT_DELETED,
  activeOrdered,
  toIso,
  toProfileDTO,
} from '../server/utils/profile-serialize'

describe('NOT_DELETED', () => {
  it('is the Prisma fragment selecting non-soft-deleted rows', () => {
    expect(NOT_DELETED).toEqual({ deletedAt: null })
  })
})

describe('toIso', () => {
  it('passes null through', () => {
    expect(toIso(null)).toBeNull()
  })
  it('serialises a Date to ISO-8601', () => {
    expect(toIso(new Date('2026-01-02T03:04:05.000Z'))).toBe('2026-01-02T03:04:05.000Z')
  })
})

describe('activeOrdered', () => {
  const rows = [
    { id: 'b', orderIndex: 1, deletedAt: null },
    { id: 'gone', orderIndex: 0, deletedAt: new Date('2026-01-01T00:00:00.000Z') },
    { id: 'a', orderIndex: 0, deletedAt: null },
  ]

  it('drops soft-deleted rows and sorts by orderIndex', () => {
    expect(activeOrdered(rows).map((r) => r.id)).toEqual(['a', 'b'])
  })
})

describe('toProfileDTO', () => {
  const d = (s: string) => new Date(s)
  const profile = {
    id: 'p1',
    headline: 'Développeuse Full-Stack',
    summary: null,
    experiences: [
      {
        id: 'e2',
        title: 'Lead',
        company: 'Acme',
        startDate: d('2023-01-01T00:00:00.000Z'),
        endDate: null,
        description: 'En cours',
        skillsUsed: ['Vue', 'Nitro'],
        orderIndex: 1,
        deletedAt: null,
      },
      {
        id: 'e-del',
        title: 'Supprimée',
        company: 'X',
        startDate: null,
        endDate: null,
        description: null,
        skillsUsed: [],
        orderIndex: 0,
        deletedAt: d('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'e1',
        title: 'Dev',
        company: 'Beta',
        startDate: d('2020-01-01T00:00:00.000Z'),
        endDate: d('2022-12-31T00:00:00.000Z'),
        description: null,
        skillsUsed: [],
        orderIndex: 0,
        deletedAt: null,
      },
    ],
    skills: [{ id: 's1', label: 'TypeScript', level: 'EXPERT' as const, years: 6, orderIndex: 0, deletedAt: null }],
    education: [],
  }

  it('maps to DTO, excludes soft-deleted children and keeps display order', () => {
    const dto = toProfileDTO(profile)
    expect(dto.id).toBe('p1')
    expect(dto.experiences.map((e) => e.id)).toEqual(['e1', 'e2'])
    expect(dto.experiences[0]!.startDate).toBe('2020-01-01T00:00:00.000Z')
    expect(dto.experiences[1]!.endDate).toBeNull()
    expect(dto.skills).toEqual([
      { id: 's1', label: 'TypeScript', level: 'EXPERT', years: 6, orderIndex: 0 },
    ])
    expect(dto.education).toEqual([])
  })
})
