import { describe, it, expect } from 'vitest'
import { parseRenderInput } from '../server/utils/cv-render-input'
import type { RenderableCv } from '@cvo/shared'

const prov = { profileItemId: 'p1', reformulated: false }
const baseCv: RenderableCv = {
  locale: 'fr',
  header: { fullName: 'Camille', headline: 'Dev', contacts: [], provenance: prov },
  sections: [],
}

describe('parseRenderInput — dual-shape', () => {
  it('accepte un RenderableCv nu (design null)', () => {
    const out = parseRenderInput(baseCv)
    expect(out.cv.header.fullName).toBe('Camille')
    expect(out.design).toBeNull()
  })

  it('accepte { cv, design } et normalise le design (couleur invalide → défaut)', () => {
    const out = parseRenderInput({
      cv: baseCv,
      design: { layout: 'sidebar-left', accent: 'pas-une-couleur', sidebarBg: '#101010', sidebarFg: '#fff', font: 'Inter', summary: '' },
    })
    expect(out.design?.layout).toBe('sidebar-left')
    expect(out.design?.accent).toMatch(/^#[0-9a-f]{3,6}$/i) // invalide → défaut
    expect(out.design?.sidebarBg).toBe('#101010')
  })
})

describe('parseRenderInput — garde-fou provenance (invariant éditeur)', () => {
  it("rejette un nœud à profileItemId vide", () => {
    const bad: RenderableCv = {
      ...baseCv,
      sections: [{ kind: 'summary', title: 'Profil', text: 'x', provenance: { profileItemId: '', reformulated: true } }],
    }
    expect(() => parseRenderInput(bad)).toThrow()
  })

  it('accepte un nœud à profileItemId recopié (non vide)', () => {
    const ok: RenderableCv = {
      ...baseCv,
      sections: [{ kind: 'summary', title: 'Profil', text: 'x', provenance: { profileItemId: 'p1', reformulated: true } }],
    }
    expect(() => parseRenderInput(ok)).not.toThrow()
  })
})

describe('parseRenderInput — section keyskills (phrases)', () => {
  it('accepte une section keyskills à provenance non vide', () => {
    const cv: RenderableCv = {
      ...baseCv,
      sections: [{ kind: 'keyskills', title: 'Compétences clés', entries: [{ id: 'k1', text: 'Concevoir…', provenance: { profileItemId: 'p1', reformulated: false } }] }],
    }
    const out = parseRenderInput(cv)
    expect(out.cv.sections[0].kind).toBe('keyskills')
  })

  it('rejette une entrée keyskills à profileItemId vide', () => {
    const bad: RenderableCv = {
      ...baseCv,
      sections: [{ kind: 'keyskills', title: 'Compétences clés', entries: [{ id: 'k1', text: 'x', provenance: { profileItemId: '', reformulated: false } }] }],
    }
    expect(() => parseRenderInput(bad)).toThrow()
  })
})
