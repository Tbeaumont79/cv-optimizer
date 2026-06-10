import { fr, type LandingMessages } from '~/i18n/fr'
import { BRAND } from '~/config/brand'
import { CREDIT_PACKS, FREE_GENERATIONS } from '~/config/pricing'

/**
 * Remplace récursivement les placeholders `{brand}` et `{freeGenerations}`
 * dans toute la copy. Tient lieu d'interpolation i18n minimale en attendant le
 * module dédié (le contrat de clés reste identique).
 */
function interpolate<T>(value: T): T {
  if (typeof value === 'string') {
    return value
      .replace(/\{brand\}/g, BRAND)
      .replace(/\{freeGenerations\}/g, String(FREE_GENERATIONS)) as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolate(item)) as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      out[key] = interpolate(val)
    }
    return out as T
  }
  return value
}

export function useLanding() {
  const m: LandingMessages = interpolate(fr)

  // JSON-LD FAQPage (SEO) construit depuis la même source de copy.
  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: m.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  })

  return {
    m,
    brand: BRAND,
    packs: CREDIT_PACKS,
    freeGenerations: FREE_GENERATIONS,
    faqJsonLd,
  }
}
