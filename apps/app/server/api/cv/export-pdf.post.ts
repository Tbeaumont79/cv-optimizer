/**
 * POST /api/cv/export-pdf
 * Corps : RenderableCv (JSON).
 * Réponse : PDF binaire (application/pdf), Content-Disposition: attachment.
 *
 * Flux : parse Zod → assertValidCv → buildCvHtml → renderHtmlToPdf.
 * Sécurité : données non loggées (RGPD) ; HTML échappé par buildCvHtml.
 */

import { z } from 'zod'
import { assertValidCv } from '@cvo/shared'
import type { RenderableCv } from '@cvo/shared'
import { buildCvHtml } from '../../utils/cv-html'
import { renderHtmlToPdf } from '../../utils/pdf'

const Provenance = z.object({ profileItemId: z.string(), reformulated: z.boolean() })
const Contact = z.object({ kind: z.enum(['email', 'phone', 'location', 'link']), label: z.string(), value: z.string() })
const Bullet = z.object({ id: z.string(), text: z.string(), provenance: Provenance })
const BaseEntry = z.object({ id: z.string(), provenance: Provenance })

const Section = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('summary'), title: z.string(), text: z.string(), provenance: Provenance }),
  z.object({ kind: z.literal('experience'), title: z.string(), entries: z.array(BaseEntry.extend({ role: z.string(), organization: z.string(), period: z.string(), location: z.string().optional(), bullets: z.array(Bullet) })) }),
  z.object({ kind: z.literal('skills'), title: z.string(), entries: z.array(BaseEntry.extend({ label: z.string() })) }),
  z.object({ kind: z.literal('education'), title: z.string(), entries: z.array(BaseEntry.extend({ degree: z.string(), institution: z.string(), period: z.string() })) }),
])

const RenderableCvSchema = z.object({
  header: z.object({ fullName: z.string().min(1), headline: z.string(), contacts: z.array(Contact), provenance: Provenance }),
  sections: z.array(Section),
  locale: z.literal('fr'),
})

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const parsed = RenderableCvSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Corps invalide : ' + parsed.error.message })
  }
  const cv = parsed.data as RenderableCv

  // Garde-fou provenance. Au MVP : les profileItemIds déclarés dans le CV lui-même
  // servent de proxy du profile_snapshot (THI-123 fournira les vrais ids).
  try {
    assertValidCv(cv, extractDeclaredIds(cv))
  } catch (err) {
    throw createError({ statusCode: 422, message: (err as Error).message })
  }

  const pdfBuffer = await renderHtmlToPdf(buildCvHtml(cv))

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', 'attachment; filename="cv.pdf"')
  return new Uint8Array(pdfBuffer)
})

/** Extrait tous les profileItemIds déclarés dans le CV (proxy de profile_snapshot au MVP). */
function extractDeclaredIds(cv: RenderableCv): Set<string> {
  const ids = new Set<string>()
  const add = (p: { profileItemId: string } | undefined) => { if (p?.profileItemId) ids.add(p.profileItemId) }

  add(cv.header?.provenance)
  for (const s of cv.sections ?? []) {
    if (s.kind === 'summary') { add(s.provenance) }
    else if (s.kind === 'experience') { for (const e of s.entries) { add(e.provenance); for (const b of e.bullets) add(b.provenance) } }
    else if (s.kind === 'skills' || s.kind === 'education') { for (const e of s.entries) add(e.provenance) }
  }
  return ids
}
