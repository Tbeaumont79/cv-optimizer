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

  it('rend un document A4 avec le gabarit codé', () => {
    const html = buildCvHtml(demoCv)
    expect(html).toContain('size:A4')
    expect(html).toContain('class="cv-root"')
    expect(html).toContain('cv-section cv-section--experience')
    expect(html).toContain('class="cv-name"')
  })

  it('applique les tokens de design (accent, police) en variables CSS', () => {
    const html = buildCvHtml(demoCv, {
      layout: 'single',
      accent: '#ff0000',
      sidebarBg: '#111111',
      sidebarFg: '#ffffff',
      font: 'Poppins',
      summary: 'Test',
    })
    expect(html).toContain('--accent:#ff0000')
    expect(html).toContain("--cv-font:'Poppins'")
    expect(html).toContain('fonts.googleapis.com/css2?family=Poppins')
  })

  it('passe en 2 colonnes pour le layout sidebar-left (avec sections de sidebar)', () => {
    const html = buildCvHtml(demoCv, {
      layout: 'sidebar-left',
      accent: '#2563eb',
      sidebarBg: '#0f172a',
      sidebarFg: '#ffffff',
      font: null,
      summary: '',
    })
    expect(html).toContain('cv-root--sidebar')
    expect(html).toContain('cv-col--side')
    expect(html).toContain('cv-col--main')
  })

  it('rend la photo (data-URL) quand design.photo est défini, sinon non', () => {
    const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
    const withPhoto = buildCvHtml(demoCv, {
      layout: 'single',
      accent: '#2563eb',
      sidebarBg: '#0f172a',
      sidebarFg: '#ffffff',
      font: null,
      photo,
      summary: '',
    })
    expect(withPhoto).toContain('<img class="cv-photo')
    expect(withPhoto).toContain(photo)

    expect(buildCvHtml(demoCv)).not.toContain('<img class="cv-photo')
  })

  const designBase = {
    layout: 'single' as const,
    accent: '#2563eb',
    sidebarBg: '#0f172a',
    sidebarFg: '#ffffff',
    font: null,
    summary: '',
  }
  const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

  // NB : les noms de classe apparaissent aussi dans le CSS → on cible l'attribut
  // `class="..."` de l'article et les balises rendues, pas une sous-chaîne nue.
  it('mode panneau (radius>0) : classe side-rounded sur l’article + var --side-radius', () => {
    const html = buildCvHtml(demoCv, { ...designBase, layout: 'sidebar-left', sidebarRadius: 6 })
    expect(html).toContain('class="cv-root cv-root--sidebar cv-root--side-rounded"')
    expect(html).toContain('--side-radius:6mm')
  })

  it('rayon ignoré hors sidebar (layout single → article = cv-root simple)', () => {
    const html = buildCvHtml(demoCv, { ...designBase, layout: 'single', sidebarRadius: 6 })
    expect(html).toContain('class="cv-root"')
  })

  it('photoPosition sidebar (2 colonnes) → div cv-side-photo rendu', () => {
    const html = buildCvHtml(demoCv, { ...designBase, layout: 'sidebar-left', photo: PHOTO, photoPosition: 'sidebar' })
    expect(html).toContain('<div class="cv-side-photo">')
  })

  it('photoPosition sidebar mais layout single → repli en-tête (pas de div cv-side-photo)', () => {
    const html = buildCvHtml(demoCv, { ...designBase, layout: 'single', photo: PHOTO, photoPosition: 'sidebar' })
    expect(html).not.toContain('<div class="cv-side-photo">')
    expect(html).toContain('<img class="cv-photo')
  })

  it('photoPosition header-left → <img> avant le <h1>; header-right → après', () => {
    const left = buildCvHtml(demoCv, { ...designBase, photo: PHOTO, photoPosition: 'header-left' })
    expect(left.indexOf('<img class="cv-photo')).toBeLessThan(left.indexOf('<h1 class="cv-name"'))
    const right = buildCvHtml(demoCv, { ...designBase, photo: PHOTO, photoPosition: 'header-right' })
    expect(right.indexOf('<h1 class="cv-name"')).toBeLessThan(right.indexOf('<img class="cv-photo'))
  })

  it('applique --photo-size en px', () => {
    const html = buildCvHtml(demoCv, { ...designBase, photo: PHOTO, photoSize: 200 })
    expect(html).toContain('--photo-size:200px')
  })

  it('applique --photo-margin (bord à bord)', () => {
    const html = buildCvHtml(demoCv, { ...designBase, photo: PHOTO, photoMargin: 0 })
    expect(html).toContain('--photo-margin:0mm')
  })

  it('applique --photo-padding et encadre l’image (cv-photo-frame)', () => {
    const html = buildCvHtml(demoCv, { ...designBase, photo: PHOTO, photoPadding: 4 })
    expect(html).toContain('--photo-padding:4mm')
    expect(html).toContain('cv-photo-frame')
    expect(html).toContain('<img class="cv-photo"') // image interne au cadre
  })

  it('rend une section keyskills en liste de phrases', () => {
    const cv: RenderableCv = {
      ...demoCv,
      sections: [
        {
          kind: 'keyskills',
          title: 'Compétences clés',
          entries: [
            { id: 'k1', text: 'Concevoir des apps web', provenance: { profileItemId: 'p', reformulated: false } },
            { id: 'k2', text: 'Livrer du code testé', provenance: { profileItemId: 'p', reformulated: false } },
          ],
        },
      ],
    }
    const html = buildCvHtml(cv)
    expect(html).toContain('<ul class="cv-keyskills">')
    expect(html).toContain('<li class="cv-keyskill">Concevoir des apps web</li>')
    expect(html).toContain('<li class="cv-keyskill">Livrer du code testé</li>')
  })

  it('élague les entrées vides et ne rend pas une section keyskills vidée (pas de titre orphelin)', () => {
    const withBlank: RenderableCv = {
      ...demoCv,
      sections: [
        {
          kind: 'keyskills',
          title: 'Compétences clés',
          entries: [
            { id: 'k1', text: 'Concevoir des apps', provenance: { profileItemId: 'p', reformulated: false } },
            { id: 'k2', text: '   ', provenance: { profileItemId: 'p', reformulated: false } },
          ],
        },
      ],
    }
    const html = buildCvHtml(withBlank)
    expect(html).toContain('<li class="cv-keyskill">Concevoir des apps</li>')
    expect(html).not.toContain('<li class="cv-keyskill"></li>') // l'entrée vide est retirée

    const allEmpty: RenderableCv = {
      ...demoCv,
      sections: [{ kind: 'keyskills', title: 'Compétences clés', entries: [{ id: 'k1', text: '', provenance: { profileItemId: 'p', reformulated: false } }] }],
    }
    const empty = buildCvHtml(allEmpty)
    expect(empty).not.toContain('cv-section--keyskills') // section vide non rendue (pas de titre orphelin)
    expect(empty).not.toContain('<ul class="cv-keyskills">')
  })
})
