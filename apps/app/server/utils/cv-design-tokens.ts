/**
 * Validation/normalisation des tokens de design « CV de base ».
 *
 * Les valeurs viennent d'une extraction LLM (donnée non fiable) ou d'anciens
 * designs stockés (ancienne forme `{ css }`). On normalise toujours vers un
 * `CvDesign` sûr : couleurs hex validées, police bornée, layout dans l'enum,
 * sinon valeurs par défaut. Aucun CSS brut n'est jamais accepté.
 */
import type { CvDesign, CvLayout } from '@cvo/shared'

/** Design par défaut (marque Teven) — utilisé sans « CV de base » configuré. */
export const DEFAULT_DESIGN: CvDesign = {
  layout: 'single',
  accent: '#4f46e5',
  sidebarBg: '#1f2937',
  sidebarFg: '#f9fafb',
  sidebarRadius: 0,
  photoPosition: 'header-right',
  photoSize: 128, // px
  photoMargin: 14,
  photoPadding: 0,
  font: null,
  photo: null,
  summary: '',
}

/** Positions de photo autorisées. */
const PHOTO_POSITIONS = ['header-right', 'header-left', 'sidebar'] as const

/** Borne un nombre dans [min, max] (fallback si non numérique). */
function sanitizeNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Plafond de la photo (data-URL) — ~700 Ko de base64 ≈ ~500 Ko décodés. */
const MAX_PHOTO_CHARS = 700_000
/** N'autorise que des images raster en data-URL base64 (pas de SVG → pas de script). */
const DATA_IMAGE = /^data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/

/**
 * Renvoie une photo en data-URL raster valide et bornée, ou null. Rejette les
 * URL distantes, le SVG (vecteur de script) et tout dépassement de taille.
 */
export function sanitizeDataImage(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (v.length === 0 || v.length > MAX_PHOTO_CHARS) return null
  return DATA_IMAGE.test(v) ? v : null
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** Renvoie une couleur hex valide, ou le fallback. */
export function sanitizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX.test(value.trim()) ? value.trim() : fallback
}

/** Renvoie un nom de police « propre » (lettres/chiffres/espaces/-), ou null. */
export function sanitizeFont(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim().slice(0, 40)
  return /^[A-Za-z0-9 \-]+$/.test(cleaned) && cleaned.length > 0 ? cleaned : null
}

function sanitizeLayout(value: unknown): CvLayout {
  return value === 'sidebar-left' ? 'sidebar-left' : 'single'
}

/** Normalise un objet quelconque (extraction LLM ou ancien stockage) en CvDesign sûr. */
export function normalizeDesign(raw: unknown): CvDesign {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    layout: sanitizeLayout(r.layout),
    accent: sanitizeColor(r.accent, DEFAULT_DESIGN.accent),
    sidebarBg: sanitizeColor(r.sidebarBg, DEFAULT_DESIGN.sidebarBg),
    sidebarFg: sanitizeColor(r.sidebarFg, DEFAULT_DESIGN.sidebarFg),
    sidebarRadius: sanitizeNumber(r.sidebarRadius, 0, 12, 0),
    photoPosition: PHOTO_POSITIONS.includes(r.photoPosition as (typeof PHOTO_POSITIONS)[number])
      ? (r.photoPosition as CvDesign['photoPosition'])
      : 'header-right',
    photoSize: sanitizeNumber(r.photoSize, 64, 360, 128), // px
    photoMargin: sanitizeNumber(r.photoMargin, 0, 16, 14),
    photoPadding: sanitizeNumber(r.photoPadding, 0, 8, 0),
    font: sanitizeFont(r.font),
    photo: sanitizeDataImage(r.photo),
    summary: typeof r.summary === 'string' ? r.summary.trim().slice(0, 500) : '',
  }
}
