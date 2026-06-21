/**
 * Utilitaire serveur (Nitro) : rendu HTML → PDF via Chromium headless.
 *
 * Approche : on injecte le HTML du CV dans une page Chromium et on utilise
 * l'API print-to-PDF native. Le CSS @media print (main.css) gère la mise en
 * page A4, les marges et le break-inside-avoid.
 *
 * Chromium path : CHROMIUM_EXECUTABLE_PATH (env, pour Docker / CI) ou Chrome
 * installé localement sur macOS (dev). En production on attend un container
 * Chromium ou l'option Gotenberg (alternative évoquée dans THI-120 §4b).
 *
 * Sécurité : le HTML est généré côté serveur uniquement depuis un RenderableCv
 * validé par le garde-fou (assertValidCv). Il n'est jamais stocké en clair ni
 * loggé (RGPD).
 */

import { chromium } from 'playwright-core'

const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function resolveChromiumPath(): string {
  const env = process.env.CHROMIUM_EXECUTABLE_PATH
  if (env) return env
  // Fallback local macOS dev : Chrome installé.
  return MAC_CHROME
}

/** Marges A4 par défaut (template par défaut). */
const DEFAULT_MARGIN = { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' }
/** Marges nulles : pour un thème « CV de base » qui gère lui-même ses paddings
 *  (sidebar pleine page) via `@page{margin:0}` + paddings sur .cv-header/.cv-main. */
const ZERO_MARGIN = { top: '0', right: '0', bottom: '0', left: '0' }

export interface RenderPdfOptions {
  /** true ⇒ marges nulles (le thème gère ses paddings). Défaut : marges A4. */
  fullBleed?: boolean
}

/**
 * Convertit un fragment HTML en PDF A4.
 * @param html Fragment HTML complet (head + body).
 * @param opts `fullBleed` pour laisser un thème gérer ses propres marges.
 * @returns ArrayBuffer du PDF.
 */
export async function renderHtmlToPdf(html: string, opts: RenderPdfOptions = {}): Promise<ArrayBuffer> {
  const executablePath = resolveChromiumPath()
  const browser = await chromium.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: opts.fullBleed ? ZERO_MARGIN : DEFAULT_MARGIN,
      // Le CV est un document 1 page : on ne sort QUE la 1re page. Tout débordement
      // est coupé net (l'éditeur avertit en amont du risque de dépassement).
      pageRanges: '1',
    })
    return pdfBuffer.buffer as ArrayBuffer
  } finally {
    await browser.close()
  }
}
