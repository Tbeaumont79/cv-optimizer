import { describe, it, expect } from 'vitest'
import { buildCvHtml } from '../server/utils/cv-html'
import type { RenderableCv } from '@cvo/shared'

const demoCv: RenderableCv = {
  locale: 'fr',
  header: {
    fullName: 'Camille Martin',
    headline: 'Développeuse full-stack TypeScript',
    contacts: [{ kind: 'email', label: 'Email', value: 'camille@exemple.fr' }],
    provenance: { profileItemId: 'identity-1', reformulated: true },
  },
  sections: [
    {
      kind: 'summary',
      title: 'Profil',
      text: 'Développeuse orientée qualité.',
      provenance: { profileItemId: 'summary-1', reformulated: true },
    },
    {
      kind: 'experience',
      title: 'Expériences',
      entries: [
        {
          id: 'exp-1',
          role: 'Développeuse full-stack',
          organization: 'Studio Web SAS',
          period: '2021 – 2024',
          provenance: { profileItemId: 'exp-1', reformulated: true },
          bullets: [
            {
              id: 'b1',
              text: "Conception d'une app Vue 3.",
              provenance: { profileItemId: 'exp-1-b1', reformulated: true },
            },
          ],
        },
      ],
    },
    {
      kind: 'skills',
      title: 'Compétences',
      entries: [{ id: 'sk-1', label: 'TypeScript', provenance: { profileItemId: 'skill-ts', reformulated: false } }],
    },
    {
      kind: 'education',
      title: 'Formation',
      entries: [
        {
          id: 'edu-1',
          degree: 'Master Informatique',
          institution: 'Université de Lyon',
          period: '2019',
          provenance: { profileItemId: 'edu-1', reformulated: false },
        },
      ],
    },
  ],
}

describe('buildCvHtml', () => {
  it('produit un document HTML valide', () => {
    const html = buildCvHtml(demoCv)
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('<html lang="fr"')
    expect(html).toContain('</html>')
  })

  it("inclut le nom et l'accroche", () => {
    const html = buildCvHtml(demoCv)
    expect(html).toContain('Camille Martin')
    expect(html).toContain('Développeuse full-stack TypeScript')
  })

  it('inclut les contacts', () => {
    const html = buildCvHtml(demoCv)
    expect(html).toContain('camille@exemple.fr')
  })

  it('inclut toutes les sections', () => {
    const html = buildCvHtml(demoCv)
    expect(html).toContain('Profil')
    expect(html).toContain('Expériences')
    expect(html).toContain('Compétences')
    expect(html).toContain('Formation')
  })

  it("inclut les puces d'expérience", () => {
    const html = buildCvHtml(demoCv)
    expect(html).toContain("Conception d&#39;une app Vue 3.")
  })

  it('échappe les caractères HTML potentiellement dangereux', () => {
    const maliciousCv: RenderableCv = {
      ...demoCv,
      header: {
        ...demoCv.header,
        fullName: '<script>alert("xss")</script>',
      },
      sections: [],
    }
    const html = buildCvHtml(maliciousCv)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('inclut les tokens CSS (@page A4, couleurs de marque)', () => {
    const html = buildCvHtml(demoCv)
    expect(html).toContain('A4 portrait')
    expect(html).toContain('--b600')
  })
})
