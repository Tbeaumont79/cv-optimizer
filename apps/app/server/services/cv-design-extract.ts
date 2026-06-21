/**
 * Capture de DA — observe le PDF d'un CV et en extrait des TOKENS de design
 * (disposition, couleurs, police) qui paramètrent le gabarit codé (cv-html.ts).
 *
 * On ne génère PAS de CSS : juste des paramètres validés → rendu toujours propre.
 * Le contenu du CV reste fourni par le moteur (provenance garantie).
 *
 * `deps.complete` est injecté (réel en prod, faux en test).
 */
import type { CvDesign } from '@cvo/shared'
import { anthropicComplete, type LlmComplete } from '../utils/anthropic'
import { normalizeDesign } from '../utils/cv-design-tokens'

const SYSTEM = `Tu observes le PDF d'un CV et tu en déduis des TOKENS de design (pas de CSS) :
- layout : "sidebar-left" si le CV a une colonne latérale (bandeau de couleur sur un côté), sinon "single".
- accent : la couleur d'accent dominante du CV (titres, filets, liens) en hex (#rrggbb).
- sidebarBg : couleur de fond de la sidebar en hex (si pas de sidebar, propose une couleur sombre cohérente avec l'accent).
- sidebarFg : couleur du texte sur la sidebar en hex (clair si sidebar sombre).
- font : nom d'une police Google proche de celle du CV (ex. "Inter", "Poppins", "Lato"), ou null.
- summary : 1 phrase en français décrivant le style (couleurs + disposition).
N'invente pas de contenu. Donne des couleurs hex valides. Sois fidèle aux couleurs réelles du CV.`

/** JSON Schema (structured outputs) — anyOf pour le nullable (cf. règles Anthropic). */
const CV_DESIGN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    layout: { type: 'string', enum: ['single', 'sidebar-left'] },
    accent: { type: 'string' },
    sidebarBg: { type: 'string' },
    sidebarFg: { type: 'string' },
    font: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    summary: { type: 'string' },
  },
  required: ['layout', 'accent', 'sidebarBg', 'sidebarFg', 'font', 'summary'],
} as const

export interface ExtractCvDesignDeps {
  complete: LlmComplete
}

/** Analyse le PDF (base64) et renvoie des tokens `CvDesign` validés/normalisés. */
export async function extractCvDesign(
  pdfBase64: string,
  deps: ExtractCvDesignDeps = { complete: anthropicComplete },
): Promise<CvDesign> {
  const result = await deps.complete({
    system: SYSTEM,
    user: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
      { type: 'text', text: 'Déduis les tokens de design (disposition, couleurs, police) de ce CV.' },
    ],
    schema: CV_DESIGN_SCHEMA as unknown as Record<string, unknown>,
    costLabel: 'cv-design-extract',
    maxTokens: 512,
  })

  // Validation stricte : couleurs hex, police bornée, layout dans l'enum, défauts sinon.
  return normalizeDesign(result)
}
