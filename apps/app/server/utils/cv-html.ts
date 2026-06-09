/**
 * Rendu côté serveur (Nitro) d'un RenderableCv en HTML complet auto-suffisant.
 * Aucune dépendance Vue côté serveur : la structure HTML est générée directement
 * à partir des données, pour être passée à Chromium (export PDF).
 *
 * Les classes Tailwind utilisées ici sont un sous-ensemble des tokens @theme
 * définis dans main.css. Elles sont inlinées en CSS natif dans la balise <style>
 * pour que le document soit entièrement auto-suffisant (pas de CDN en headless).
 *
 * Doit rester synchronisé avec CvTemplate.vue. Si le design du composant Vue
 * évolue, mettre à jour `TOKENS` et la fonction `html()` en parallèle.
 *
 * Sécurité : `escape()` appliqué sur toutes les données utilisateur — pas
 * d'injection XSS possible dans le HTML rendu.
 */

import type { RenderableCv, CvSection } from '@cvo/shared'

// Tokens synchronisés avec @theme de main.css + styles A4 auto-suffisants pour Chromium.
const CSS = `
:root{--b50:#eff6ff;--b100:#dbeafe;--b500:#3b82f6;--b600:#2563eb;--b700:#1d4ed8;--i5:#6b7280;--i7:#374151;--i9:#111827;--sf:#fff;--r:.75rem;--fn:"Inter",ui-sans-serif,system-ui,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4 portrait;margin:12mm 14mm}
body{font-family:var(--fn);color:var(--i9);background:var(--sf);-webkit-print-color-adjust:exact;print-color-adjust:exact}
article{width:100%;max-width:210mm;margin:0 auto;font-size:14px;line-height:1.5}
header{padding:32px 40px;border-bottom:1px solid rgba(107,114,128,.2)}
h1{font-size:1.875rem;font-weight:700}
.hl{margin-top:4px;font-size:1rem;font-weight:500;color:var(--b600)}
.ct{margin-top:12px;display:flex;flex-wrap:wrap;gap:4px 20px;list-style:none}
.ct li{font-size:.875rem;color:var(--i5)}
main{padding:28px 40px;display:flex;flex-direction:column;gap:24px}
section{break-inside:avoid}
h2{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--b600);border-bottom:1px solid var(--b100);padding-bottom:4px;margin-bottom:12px}
.sm{font-size:.875rem;line-height:1.625;color:var(--i7)}
.xe{display:flex;flex-direction:column;gap:20px}
.xr{break-inside:avoid}
.xh{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.xn{font-size:.875rem;font-weight:600}
.xo{font-size:.875rem;color:var(--i7)}
.xp{font-size:.75rem;color:var(--i5);white-space:nowrap}
.bl{margin-top:8px;padding-left:16px;display:flex;flex-direction:column;gap:4px}
.bl li{font-size:.875rem;color:var(--i7)}
.bl li::marker{color:var(--b500)}
.sk{display:flex;flex-wrap:wrap;gap:8px;list-style:none}
.sk li{background:var(--b50);color:var(--b700);font-size:.75rem;font-weight:500;padding:4px 12px;border-radius:var(--r)}
.ee{display:flex;flex-direction:column;gap:12px}
.er{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;break-inside:avoid}
.ed{font-size:.875rem;font-weight:600}
.ei{font-size:.875rem;color:var(--i7)}
.ep{font-size:.75rem;color:var(--i5);white-space:nowrap}
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
  return `<ul class="ct">${cv.header.contacts.map((c) => `<li>${c.label ? `${esc(c.label)} · ` : ''}${esc(c.value)}</li>`).join('')}</ul>`
}

function renderSection(section: CvSection): string {
  switch (section.kind) {
    case 'summary':
      return `<p class="sm">${esc(section.text)}</p>`

    case 'experience': {
      const rows = section.entries.map((e) => {
        const loc = e.location ? ` · ${esc(e.location)}` : ''
        const bl = e.bullets.length ? `<ul class="bl">${e.bullets.map((b) => `<li>${esc(b.text)}</li>`).join('')}</ul>` : ''
        return `<div class="xr"><div class="xh"><div><p class="xn">${esc(e.role)}</p><p class="xo">${esc(e.organization)}${loc}</p></div><p class="xp">${esc(e.period)}</p></div>${bl}</div>`
      })
      return `<div class="xe">${rows.join('')}</div>`
    }

    case 'skills':
      return `<ul class="sk">${section.entries.map((e) => `<li>${esc(e.label)}</li>`).join('')}</ul>`

    case 'education': {
      const rows = section.entries.map((e) => `<div class="er"><div><p class="ed">${esc(e.degree)}</p><p class="ei">${esc(e.institution)}</p></div><p class="ep">${esc(e.period)}</p></div>`)
      return `<div class="ee">${rows.join('')}</div>`
    }
  }
}

/**
 * Construit le document HTML complet auto-suffisant à partir d'un RenderableCv.
 * Destiné à être passé à Chromium headless pour l'export PDF.
 * Les données utilisateur sont systématiquement échappées.
 */
export function buildCvHtml(cv: RenderableCv): string {
  const sectionsHtml = cv.sections
    .map(
      (s) => `    <section>
      <h2>${esc(s.title)}</h2>
      ${renderSection(s)}
    </section>`,
    )
    .join('\n\n')

  return `<!DOCTYPE html>
<html lang="${esc(cv.locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CV</title>
  <style>${CSS}</style>
</head>
<body>
  <article id="cv-render">
    <header>
      <h1>${esc(cv.header.fullName)}</h1>
      <p class="hl">${esc(cv.header.headline)}</p>
      ${renderContacts(cv)}
    </header>
    <main>
${sectionsHtml}
    </main>
  </article>
</body>
</html>`
}
