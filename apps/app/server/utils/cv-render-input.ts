/**
 * Validation + garde-fou de provenance d'un RenderableCv reçu en corps de requête.
 * Mutualisé entre l'export PDF et l'aperçu (mêmes règles, même rejet).
 */
import { z } from 'zod'
import { assertValidCv } from '@cvo/shared'
import type { CvDesign, RenderableCv } from '@cvo/shared'
import { normalizeDesign } from './cv-design-tokens'

const Provenance = z.object({ profileItemId: z.string(), reformulated: z.boolean() })
const Contact = z.object({ kind: z.enum(['email', 'phone', 'location', 'link']), label: z.string(), value: z.string() })
const Bullet = z.object({ id: z.string(), text: z.string(), provenance: Provenance })
const BaseEntry = z.object({ id: z.string(), provenance: Provenance })

const Section = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('summary'), title: z.string(), text: z.string(), provenance: Provenance }),
  z.object({ kind: z.literal('keyskills'), title: z.string(), entries: z.array(BaseEntry.extend({ text: z.string() })) }),
  z.object({ kind: z.literal('experience'), title: z.string(), entries: z.array(BaseEntry.extend({ role: z.string(), organization: z.string(), period: z.string(), location: z.string().optional(), bullets: z.array(Bullet) })) }),
  z.object({ kind: z.literal('skills'), title: z.string(), entries: z.array(BaseEntry.extend({ label: z.string() })) }),
  z.object({ kind: z.literal('education'), title: z.string(), entries: z.array(BaseEntry.extend({ degree: z.string(), institution: z.string(), period: z.string() })) }),
  z.object({ kind: z.literal('languages'), title: z.string(), entries: z.array(BaseEntry.extend({ label: z.string(), level: z.string() })) }),
])

export const RenderableCvSchema = z.object({
  header: z.object({ fullName: z.string().min(1), headline: z.string(), contacts: z.array(Contact), provenance: Provenance }),
  sections: z.array(Section),
  locale: z.literal('fr'),
})

/** Extrait tous les profileItemIds déclarés dans le CV (proxy de profile_snapshot au MVP). */
export function extractDeclaredIds(cv: RenderableCv): Set<string> {
  const ids = new Set<string>()
  const add = (p: { profileItemId: string } | undefined) => { if (p?.profileItemId) ids.add(p.profileItemId) }

  add(cv.header?.provenance)
  for (const s of cv.sections ?? []) {
    if (s.kind === 'summary') { add(s.provenance) }
    else if (s.kind === 'experience') { for (const e of s.entries) { add(e.provenance); for (const b of e.bullets) add(b.provenance) } }
    else if (s.kind === 'keyskills' || s.kind === 'skills' || s.kind === 'education' || s.kind === 'languages') { for (const e of s.entries) add(e.provenance) }
  }
  return ids
}

/**
 * Parse le corps en RenderableCv puis applique le garde-fou de provenance.
 * Lève une 400 (corps invalide) ou une 422 (provenance) — comme avant.
 */
export function parseRenderableCvBody(raw: unknown): RenderableCv {
  const parsed = RenderableCvSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Corps invalide : ' + parsed.error.message })
  }
  const cv = parsed.data as RenderableCv
  try {
    assertValidCv(cv, extractDeclaredIds(cv))
  } catch (err) {
    throw createError({ statusCode: 422, message: (err as Error).message })
  }
  return cv
}

/**
 * Parse un corps de rendu acceptant DEUX formes :
 *  - un `RenderableCv` nu (rétro-compat `/cv/demo`, ancien `candidature.vue`),
 *  - `{ cv, design? }` (design par-candidature pour l'éditeur).
 * Le `cv` est validé + garde-fou provenance ; `design` est normalisé (ou null).
 */
export function parseRenderInput(raw: unknown): { cv: RenderableCv; design: CvDesign | null } {
  const isWrapped = !!raw && typeof raw === 'object' && 'cv' in (raw as Record<string, unknown>)
  if (isWrapped) {
    const r = raw as { cv: unknown; design?: unknown }
    return {
      cv: parseRenderableCvBody(r.cv),
      design: r.design == null ? null : normalizeDesign(r.design),
    }
  }
  return { cv: parseRenderableCvBody(raw), design: null }
}
