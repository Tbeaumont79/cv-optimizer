/**
 * POST /api/csp-report — collecteur de violations CSP (phase de validation).
 *
 * Tant que la CSP est en Report-Only (nuxt.config `contentSecurityPolicyReportOnly`),
 * le navigateur POSTe ici chaque violation (directive `report-uri`). On logge une
 * ligne concise par violation pour ajuster la policy avant de l'appliquer réellement.
 *
 * Non authentifié (appelé par le navigateur, sans session garantie) ; ne stocke rien.
 * Le corps arrive en `application/csp-report` → on lit le brut et on parse à la main.
 */
export default defineEventHandler(async (event) => {
  const raw = await readRawBody(event)
  if (!raw) return { ok: true }
  try {
    const parsed = JSON.parse(raw.toString())
    const r = parsed['csp-report'] ?? parsed.body ?? parsed
    const directive = r['effective-directive'] || r['violated-directive'] || '?'
    const blocked = r['blocked-uri'] || r.blockedURL || '?'
    const page = r['document-uri'] || r.documentURL || '?'
    const src = r['source-file'] ? ` | source: ${r['source-file']}:${r['line-number'] ?? '?'}` : ''
    console.warn(`[CSP] directive=${directive} | bloqué=${blocked} | page=${page}${src}`)
  } catch {
    console.warn('[CSP] rapport non parsable:', raw.toString().slice(0, 300))
  }
  return { ok: true }
})
