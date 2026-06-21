import { describe, it, expect } from 'vitest'
import { sanitizeDataImage, normalizeDesign, DEFAULT_DESIGN } from '../server/utils/cv-design-tokens'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
const WEBP = 'data:image/webp;base64,UklGRhoAAABXRUJQ'

describe('sanitizeDataImage', () => {
  it('accepte png/jpeg/webp en data-URL', () => {
    expect(sanitizeDataImage(PNG)).toBe(PNG)
    expect(sanitizeDataImage(JPEG)).toBe(JPEG)
    expect(sanitizeDataImage(WEBP)).toBe(WEBP)
  })
  it('rejette le SVG (vecteur de script)', () => {
    expect(sanitizeDataImage('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBeNull()
  })
  it('rejette les URL distantes', () => {
    expect(sanitizeDataImage('https://evil.test/x.png')).toBeNull()
  })
  it('rejette une data-URL trop volumineuse', () => {
    expect(sanitizeDataImage('data:image/png;base64,' + 'A'.repeat(800_000))).toBeNull()
  })
  it('rejette le non-string', () => {
    expect(sanitizeDataImage(undefined)).toBeNull()
    expect(sanitizeDataImage(42)).toBeNull()
  })
})

describe('normalizeDesign — photo', () => {
  it('passe la photo valide, défaut null sinon', () => {
    expect(normalizeDesign({ ...DEFAULT_DESIGN, photo: PNG }).photo).toBe(PNG)
    expect(normalizeDesign({ ...DEFAULT_DESIGN, photo: 'nope' }).photo).toBeNull()
    expect(normalizeDesign({}).photo).toBeNull()
  })
})

describe('normalizeDesign — tokens de mise en page (bornage + enum)', () => {
  it('borne sidebarRadius dans [0,12]', () => {
    expect(normalizeDesign({ sidebarRadius: 99 }).sidebarRadius).toBe(12)
    expect(normalizeDesign({ sidebarRadius: -5 }).sidebarRadius).toBe(0)
    expect(normalizeDesign({ sidebarRadius: 'abc' }).sidebarRadius).toBe(0)
    expect(normalizeDesign({ sidebarRadius: Infinity }).sidebarRadius).toBe(0)
  })
  it('borne photoSize en px dans [64,360], défaut 128', () => {
    expect(normalizeDesign({ photoSize: 999 }).photoSize).toBe(360)
    expect(normalizeDesign({ photoSize: 10 }).photoSize).toBe(64)
    expect(normalizeDesign({}).photoSize).toBe(128)
  })
  it('borne photoMargin dans [0,16], défaut 14', () => {
    expect(normalizeDesign({ photoMargin: 99 }).photoMargin).toBe(16)
    expect(normalizeDesign({ photoMargin: -3 }).photoMargin).toBe(0)
    expect(normalizeDesign({}).photoMargin).toBe(14)
  })
  it('borne photoPadding dans [0,8], défaut 0', () => {
    expect(normalizeDesign({ photoPadding: 99 }).photoPadding).toBe(8)
    expect(normalizeDesign({ photoPadding: -3 }).photoPadding).toBe(0)
    expect(normalizeDesign({}).photoPadding).toBe(0)
  })
  it('contraint photoPosition à l’enum (défaut header-right)', () => {
    expect(normalizeDesign({ photoPosition: 'header-left' }).photoPosition).toBe('header-left')
    expect(normalizeDesign({ photoPosition: 'sidebar' }).photoPosition).toBe('sidebar')
    expect(normalizeDesign({ photoPosition: 'top' }).photoPosition).toBe('header-right')
    expect(normalizeDesign({ photoPosition: 42 }).photoPosition).toBe('header-right')
  })
  it('ancien design stocké (sans les nouveaux champs) → défauts remplis', () => {
    const d = normalizeDesign({ layout: 'single', accent: '#000000' })
    expect(d.sidebarRadius).toBe(0)
    expect(d.photoPosition).toBe('header-right')
    expect(d.photoSize).toBe(128)
  })
})
