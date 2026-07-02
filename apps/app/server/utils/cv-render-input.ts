/**
 * Validation + garde-fou de provenance d'un RenderableCv reçu en corps de requête.
 * Mutualisé entre l'export PDF et l'aperçu (mêmes règles, même rejet).
 */
import { z } from 'zod'
import { assertValidCv } from '@cvo/shared'
import type { CvDesign, RenderableCv } from '@cvo/shared'
import { normalizeDesign } from './cv-design-tokens'

// Bornes de taille : un CV valide reste modeste. Elles plafonnent le HTML/JSON
// pour éviter un rendu Chromium géant / une persistance JSON abusive (anti-DoS).
const S = (max: number) => z.string().max(max)
const ID = z.string().max(200)

const Provenance = z.object({ profileItemId: ID, reformulated: z.boolean() })
const Contact = z.object({ kind: z.enum(['email', 'phone', 'location', 'link']), label: S(100), value: S(500) })
const Bullet = z.object({ id: ID, text: S(2000), provenance: Provenance })
const BaseEntry = z.object({ id: ID, provenance: Provenance })

const Section = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('summary'), title: S(200), text: S(5000), provenance: Provenance }),
  z.object({ kind: z.literal('keyskills'), title: S(200), entries: z.array(BaseEntry.extend({ text: S(1000) })).max(30) }),
  z.object({ kind: z.literal('experience'), title: S(200), entries: z.array(BaseEntry.extend({ role: S(300), organization: S(300), period: S(120), location: S(300).optional(), bullets: z.array(Bullet).max(40) })).max(40) }),
  z.object({ kind: z.literal('skills'), title: S(200), entries: z.array(BaseEntry.extend({ label: S(200) })).max(100) }),
  z.object({ kind: z.literal('education'), title: S(200), entries: z.array(BaseEntry.extend({ degree: S(300), institution: S(300), period: S(120) })).max(30) }),
  z.object({ kind: z.literal('languages'), title: S(200), entries: z.array(BaseEntry.extend({ label: S(200), level: S(100) })).max(50) }),
])

export const RenderableCvSchema = z.object({
  header: z.object({ fullName: z.string().min(1).max(200), headline: S(300), contacts: z.array(Contact).max(20), provenance: Provenance }),
  sections: z.array(Section).max(20),
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
