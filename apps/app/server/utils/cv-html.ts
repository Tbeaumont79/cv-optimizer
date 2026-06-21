/**
 * Rendu serveur d'un RenderableCv en document HTML A4 auto-suffisant (export PDF
 * + aperçu iframe). Le STYLE est un GABARIT CODÉ et testé à l'impression — pas du
 * CSS généré par un LLM. On l'adapte au CV de l'utilisateur via des TOKENS
 * (`CvDesign` : layout, accent, couleurs sidebar, police) injectés en variables
 * CSS. Résultat : toujours propre, 1 page si le contenu le permet, proportions
 * maîtrisées. Le contenu reste fourni par le moteur (provenance garantie).
 *
 * Sécurité : `esc()` sur toutes les données utilisateur ; les tokens sont validés
 * en amont (cv-design-tokens.ts : couleurs hex, police bornée).
 */

import type { RenderableCv, CvSection, CvDesign } from '@cvo/shared'
import { DEFAULT_DESIGN } from './cv-design-tokens'

// Gabarit maîtrisé. Variables : --accent, --side-bg, --side-fg, --cv-font.
const TEMPLATE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:0}
html,body{background:#fff}
.cv-root{
  font-family:var(--cv-font,'Inter',ui-sans-serif,system-ui,'Segoe UI',sans-serif);
  color:#1f2937;font-size:10.3pt;line-height:1.42;
  /* -2px : évite qu'un arrondi sous-pixel (≈ +0.5px) ne déborde sur une 2e page
     blanche quand le contenu remplit exactement la hauteur A4 (297mm). */
  width:210mm;min-height:calc(297mm - 2px);margin:0 auto;background:#fff;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}
.cv-header{padding:13mm 14mm 5mm;display:flex;justify-content:flex-start;align-items:flex-start;gap:8mm}
.cv-header-text{flex:1;min-width:0}
/* Cadre = case carrée (taille + padding intérieur) ; l'image remplit le contenu.
   --photo-padding = espace transparent autour de l'image (s'adapte au fond). */
.cv-photo-frame{flex-shrink:0;box-sizing:border-box;width:var(--photo-size,128px);height:var(--photo-size,128px);padding:var(--photo-padding,0);border-radius:3mm}
.cv-photo{display:block;width:100%;height:100%;border-radius:3mm;object-fit:cover;background:#e5e7eb}
/* --photo-margin = distance souhaitée au bord de page (mm). On compense le padding
   de l'en-tête (haut 13mm, côtés 14mm) par une marge négative → 0 = bord à bord. */
.cv-photo-frame--hr{margin-top:calc(var(--photo-margin,14mm) - 13mm);margin-right:calc(var(--photo-margin,14mm) - 14mm)}
.cv-photo-frame--hl{margin-top:calc(var(--photo-margin,14mm) - 13mm);margin-left:calc(var(--photo-margin,14mm) - 14mm)}
.cv-side-photo{display:flex;justify-content:center;margin-bottom:5mm}
.cv-name{font-size:25pt;font-weight:800;line-height:1.04;letter-spacing:-.4px;color:#111827}
.cv-headline{margin-top:2.5mm;font-size:11.5pt;font-weight:600;color:var(--accent)}
.cv-contacts{margin-top:3mm;display:flex;flex-wrap:wrap;gap:1.2mm 6mm;list-style:none;font-size:8.6pt;color:#6b7280}
.cv-main{padding:0 14mm 14mm}
.cv-section{break-inside:avoid}
.cv-section + .cv-section{margin-top:6mm}
.cv-section-title{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;color:var(--accent);border-bottom:1.5px solid var(--accent);padding-bottom:1.3mm;margin-bottom:3mm}
.cv-summary{font-size:9.6pt;line-height:1.5;color:#374151}
.cv-keyskills{padding-left:4.5mm;display:flex;flex-direction:column;gap:1.5mm;list-style:disc}
.cv-keyskill{font-size:9.6pt;line-height:1.4;color:#374151}
.cv-keyskill::marker{color:var(--accent)}
.cv-exps{display:flex;flex-direction:column;gap:4mm}
.cv-exp{break-inside:avoid}
.cv-exp-head{display:flex;justify-content:space-between;align-items:baseline;gap:4mm}
.cv-exp-role{font-size:10.2pt;font-weight:700;color:#111827}
.cv-exp-org{font-size:9.5pt;color:#374151}
.cv-exp-period{flex-shrink:0;font-size:8.4pt;font-weight:600;color:var(--accent);white-space:nowrap}
.cv-bullets{margin-top:1.5mm;padding-left:4.5mm;display:flex;flex-direction:column;gap:1mm}
.cv-bullet{font-size:9.3pt;line-height:1.4;color:#374151}
.cv-bullet::marker{color:var(--accent)}
.cv-edus{display:flex;flex-direction:column;gap:3mm}
.cv-edu{display:flex;justify-content:space-between;align-items:baseline;gap:4mm;break-inside:avoid}
.cv-edu-degree{font-size:10pt;font-weight:700;color:#111827}
.cv-edu-school{font-size:9.4pt;color:#374151}
.cv-edu-period{flex-shrink:0;font-size:8.4pt;font-weight:600;color:var(--accent);white-space:nowrap}
.cv-tags{display:flex;flex-wrap:wrap;gap:1.6mm;list-style:none}
.cv-tag{font-size:8.5pt;font-weight:500;padding:1mm 2.6mm;border-radius:2mm;background:color-mix(in srgb,var(--accent) 12%,#fff);color:var(--accent)}

/* ── Disposition sidebar à gauche ────────────────────────────────────────── */
.cv-root--sidebar .cv-main{display:grid;grid-template-columns:33% 1fr;gap:0;padding:0;align-items:stretch}
.cv-col--side{color:var(--side-fg);padding:6mm 6mm 12mm}
.cv-col--main{padding:6mm 13mm 14mm 8mm}
/* Mode BANDE (rayon 0) : fond peint sur la racine → pleine hauteur, se répète à
   chaque page (pas de fragment). Header en blanc pour couvrir la bande en haut. */
.cv-root--sidebar:not(.cv-root--side-rounded){background:linear-gradient(to right,var(--side-bg) 0 33%,#fff 33% 100%)}
.cv-root--sidebar:not(.cv-root--side-rounded) .cv-header{background:#fff}
/* Mode PANNEAU (rayon > 0) : sidebar = vraie boîte arrondie (s'arrête au contenu). */
.cv-root--side-rounded .cv-col--side{background:var(--side-bg);border-radius:0 var(--side-radius,0) var(--side-radius,0) 0}
.cv-col--side .cv-section + .cv-section,
.cv-col--main .cv-section + .cv-section{margin-top:6mm}
.cv-col--side .cv-section-title{color:var(--side-fg);border-bottom-color:color-mix(in srgb,var(--side-fg) 30%,transparent)}
.cv-col--side .cv-summary{color:color-mix(in srgb,var(--side-fg) 88%,transparent)}
.cv-col--side .cv-tag{background:color-mix(in srgb,var(--side-fg) 16%,transparent);color:var(--side-fg)}
`

/** Échappe les caractères HTML pour prévenir toute injection. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderContacts(cv: RenderableCv): string {
  if (!cv.header.contacts.length) return ''
  return `<ul class="cv-contacts">${cv.header.contacts
    .map((c) => `<li class="cv-contact">${c.label ? `${esc(c.label)} · ` : ''}${esc(c.value)}</li>`)
    .join('')}</ul>`
}

function renderSectionBody(section: CvSection): string {
  switch (section.kind) {
    case 'summary':
      return `<p class="cv-summary">${esc(section.text)}</p>`
    case 'keyskills':
      return `<ul class="cv-keyskills">${section.entries
        .map((e) => `<li class="cv-keyskill">${esc(e.text)}</li>`)
        .join('')}</ul>`
    case 'experience': {
      const rows = section.entries.map((e) => {
        const loc = e.location ? ` · ${esc(e.location)}` : ''
        const bl = e.bullets.length
          ? `<ul class="cv-bullets">${e.bullets.map((b) => `<li class="cv-bullet">${esc(b.text)}</li>`).join('')}</ul>`
          : ''
        return `<div class="cv-exp"><div class="cv-exp-head"><div><p class="cv-exp-role">${esc(e.role)}</p><p class="cv-exp-org">${esc(e.organization)}${loc}</p></div><p class="cv-exp-period">${esc(e.period)}</p></div>${bl}</div>`
      })
      return `<div class="cv-exps">${rows.join('')}</div>`
    }
    case 'skills':
      return `<ul class="cv-tags">${section.entries.map((e) => `<li class="cv-tag">${esc(e.label)}</li>`).join('')}</ul>`
    case 'languages':
      return `<ul class="cv-tags">${section.entries
        .map((e) => `<li class="cv-tag">${esc(e.label)}${e.level ? ` · ${esc(e.level)}` : ''}</li>`)
        .join('')}</ul>`
    case 'education': {
      const rows = section.entries.map(
        (e) =>
          `<div class="cv-edu"><div><p class="cv-edu-degree">${esc(e.degree)}</p><p class="cv-edu-school">${esc(e.institution)}</p></div><p class="cv-edu-period">${esc(e.period)}</p></div>`,
      )
      return `<div class="cv-edus">${rows.join('')}</div>`
    }
  }
}

function renderSection(section: CvSection): string {
  return `<section class="cv-section cv-section--${section.kind}"><h2 class="cv-section-title">${esc(section.title)}</h2>${renderSectionBody(section)}</section>`
}

/**
 * Élague les entrées vides et retire les sections devenues sans contenu — évite un
 * titre orphelin + liste vide au rendu (cas atteignable via l'éditeur : suppression
 * de toutes les phrases/puces). Couvre aperçu ET export, pour tous les types.
 */
function pruneSections(sections: CvSection[]): CvSection[] {
  return sections
    .map((s): CvSection => {
      switch (s.kind) {
        case 'summary':
          return s
        case 'keyskills':
          return { ...s, entries: s.entries.filter((e) => e.text.trim() !== '') }
        case 'skills':
          return { ...s, entries: s.entries.filter((e) => e.label.trim() !== '') }
        case 'languages':
          return { ...s, entries: s.entries.filter((e) => e.label.trim() !== '') }
        case 'education':
          return { ...s, entries: s.entries.filter((e) => e.degree.trim() !== '' || e.institution.trim() !== '') }
        case 'experience':
          return {
            ...s,
            entries: s.entries
              .map((e) => ({ ...e, bullets: e.bullets.filter((b) => b.text.trim() !== '') }))
              .filter((e) => e.role.trim() !== '' || e.organization.trim() !== '' || e.bullets.length > 0),
          }
      }
    })
    .filter((s) => (s.kind === 'summary' ? s.text.trim() !== '' : s.entries.length > 0))
}

/** Sections qui vont dans la sidebar (layout `sidebar-left`). */
const SIDEBAR_KINDS = new Set<CvSection['kind']>(['summary', 'skills', 'languages'])

/** Lien <link> vers une police Google (nom déjà validé/borné côté serveur). */
function googleFontLink(name: string | null): string {
  if (!name) return ''
  const family = encodeURIComponent(name.trim()).replace(/%20/g, '+')
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700;800&display=swap" rel="stylesheet">`
}

/**
 * Construit le document HTML A4 d'un RenderableCv, habillé par les tokens `design`
 * (défaut : marque Teven). Données utilisateur systématiquement échappées.
 */
export function buildCvHtml(cv: RenderableCv, design: CvDesign | null = DEFAULT_DESIGN): string {
  const d = design ?? DEFAULT_DESIGN

  const sections = pruneSections(cv.sections)
  const sidebarSections = sections.filter((s) => SIDEBAR_KINDS.has(s.kind))
  const mainSections = sections.filter((s) => !SIDEBAR_KINDS.has(s.kind))
  // Sidebar seulement si demandé ET s'il y a de quoi remplir la sidebar.
  const useSidebar = d.layout === 'sidebar-left' && sidebarSections.length > 0

  // Photo : data-URL déjà validée par sanitizeDataImage (raster only). Pas un
  // contenu texte → pas d'esc() ; l'attribut est borné par la regex de validation.
  // Position : `sidebar` (en haut de la sidebar, si 2 colonnes) sinon en-tête
  // (gauche/droite). Repli en-tête-droite si `sidebar` mais layout 1 colonne.
  const photoInSidebar = !!d.photo && d.photoPosition === 'sidebar' && useSidebar
  const photoInHeader = !!d.photo && !photoInSidebar
  // Image dans un cadre (taille + padding intérieur). En en-tête, la classe de
  // position du cadre pilote la marge (var --photo-margin) → bord à bord.
  const photoImg = `<img class="cv-photo" src="${d.photo}" alt="" />`
  const frameClass = d.photoPosition === 'header-left' ? 'cv-photo-frame cv-photo-frame--hl' : 'cv-photo-frame cv-photo-frame--hr'
  const headerPhoto = photoInHeader ? `<div class="${frameClass}">${photoImg}</div>` : ''
  const sidePhotoHtml = photoInSidebar ? `<div class="cv-side-photo"><div class="cv-photo-frame">${photoImg}</div></div>` : ''

  const sideInner = sidePhotoHtml + sidebarSections.map(renderSection).join('')
  const mainHtml = useSidebar
    ? `<div class="cv-col cv-col--side">${sideInner}</div>` +
      `<div class="cv-col cv-col--main">${mainSections.map(renderSection).join('')}</div>`
    : sections.map(renderSection).join('')

  const fontVar = d.font ? `--cv-font:'${esc(d.font)}', ui-sans-serif, system-ui, sans-serif;` : ''
  const radius = d.sidebarRadius ?? 0
  const photoSize = d.photoSize ?? 128
  const photoMargin = d.photoMargin ?? 14
  const photoPadding = d.photoPadding ?? 0
  const rootStyle = `--accent:${d.accent};--side-bg:${d.sidebarBg};--side-fg:${d.sidebarFg};--side-radius:${radius}mm;--photo-size:${photoSize}px;--photo-margin:${photoMargin}mm;--photo-padding:${photoPadding}mm;${fontVar}`
  // Rayon 0 ⇒ bande pleine hauteur (robuste multi-pages) ; rayon > 0 ⇒ panneau arrondi.
  const rootClass = useSidebar
    ? radius > 0
      ? 'cv-root cv-root--sidebar cv-root--side-rounded'
      : 'cv-root cv-root--sidebar'
    : 'cv-root'

  const headerText = `<div class="cv-header-text">
        <h1 class="cv-name">${esc(cv.header.fullName)}</h1>
        <p class="cv-headline">${esc(cv.header.headline)}</p>
        ${renderContacts(cv)}
      </div>`
  // Ordre DOM : photo à gauche ⇒ photo avant le texte ; sinon texte puis photo à droite.
  const headerInner = photoInHeader
    ? d.photoPosition === 'header-left'
      ? headerPhoto + headerText
      : headerText + headerPhoto
    : headerText

  return `<!DOCTYPE html>
<html lang="${esc(cv.locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CV</title>
  ${googleFontLink(d.font)}
  <style>${TEMPLATE_CSS}</style>
</head>
<body>
  <article id="cv-render" class="${rootClass}" style="${rootStyle}">
    <header class="cv-header">${headerInner}</header>
    <main class="cv-main">${mainHtml}</main>
  </article>
</body>
</html>`
}
