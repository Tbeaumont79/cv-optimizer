/**
 * Client Claude (API Messages) pour le moteur THI-124.
 *
 * Sortie structurée imposée via `output_config.format` (JSON Schema) : le modèle
 * répond un JSON conforme, parsé puis revalidé en aval.
 *
 * ⚠️ RGPD : on logge le COÛT (modèle, tokens, $ estimé) mais JAMAIS le contenu
 * (offre, profil, CV) — aucune donnée personnelle ne transite par les logs.
 *
 * L'appel réseau est isolé derrière le type `LlmComplete` : les services moteur
 * en dépendent par injection, donc les tests tournent sans réseau ni clé API.
 */

/** Modèle par défaut du moteur (DoD THI-124). */
export const DEFAULT_MODEL = 'claude-sonnet-4-6' as const

/** Tarifs USD / million de tokens (entrée, sortie) — pour le log de coût. */
const PRICING: Record<string, { in: number; out: number }> = {
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-haiku-4-5': { in: 1, out: 5 },
  'claude-opus-4-8': { in: 5, out: 25 },
}

/**
 * Bloc de contenu d'un message utilisateur. Permet d'envoyer un document (PDF)
 * ou une image en plus du texte. Forme API Messages : le bloc `document`/`image`
 * doit précéder le bloc texte. PDF en base64 : pas de beta header requis.
 */
export type LlmContentBlock =
  | { type: 'text'; text: string }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

export interface LlmRequest {
  /** Consignes système (rôle/tâche). Pas de contenu CV au-delà du strict nécessaire. */
  system: string
  /**
   * Message utilisateur : soit une string (cas courant : données structurées),
   * soit une liste de blocs (texte + document PDF / image) pour la vision.
   */
  user: string | LlmContentBlock[]
  /** JSON Schema imposé à la sortie. */
  schema: Record<string, unknown>
  /** Étiquette de coût pour le log (ex. `offer-analysis`). JAMAIS de contenu. */
  costLabel: string
  /** Override modèle (défaut `DEFAULT_MODEL`). */
  model?: string
  /** Budget de sortie. */
  maxTokens?: number
  /** Effort de raisonnement (Sonnet 4.6 / Opus uniquement). */
  effort?: 'low' | 'medium' | 'high'
  /** Callback de mesure : tokens consommés (JAMAIS de contenu). Pour le metering. */
  onUsage?: (usage: { inputTokens: number; outputTokens: number }) => void
}

/** Contrat d'appel LLM injectable — réimplémenté par un faux dans les tests. */
export type LlmComplete = (req: LlmRequest) => Promise<unknown>

/** Erreur d'appel LLM (réseau, refus, sortie non parsable). */
export class LlmError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmError'
  }
}

/** Log de coût RGPD-safe : modèle + tokens + $ estimé, sans aucun contenu. */
function logCost(label: string, model: string, inTok: number, outTok: number): void {
  const p = PRICING[model] ?? { in: 0, out: 0 }
  const costUsd = (inTok * p.in + outTok * p.out) / 1_000_000
  console.info(
    JSON.stringify({
      event: 'llm_cost',
      label,
      model,
      inputTokens: inTok,
      outputTokens: outTok,
      costUsd: Number(costUsd.toFixed(6)),
    }),
  )
}

/**
 * Implémentation réelle : appelle l'API Messages d'Anthropic via `fetch`.
 * Lit la clé dans `ANTHROPIC_API_KEY`. Retourne l'objet JSON parsé (non typé —
 * la validation de forme est faite par l'appelant / le garde-fou).
 */
export const anthropicComplete: LlmComplete = async (req) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new LlmError('ANTHROPIC_API_KEY manquante')
  const model = req.model ?? DEFAULT_MODEL
  // Override pour proxy d'entreprise ou mock de test E2E (défaut : API publique).
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'

  const body: Record<string, unknown> = {
    model,
    max_tokens: req.maxTokens ?? 4096,
    system: req.system,
    messages: [{ role: 'user', content: req.user }],
    thinking: { type: 'disabled' },
    output_config: {
      format: { type: 'json_schema', schema: req.schema },
      ...(req.effort ? { effort: req.effort } : {}),
    },
  }

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    // Le corps d'erreur de l'API décrit le problème (schéma invalide, grammaire
    // trop grande, etc.) — RGPD-safe (aucun contenu utilisateur). On le logge et
    // on l'inclut dans l'erreur pour rendre les 502 diagnosticables.
    let detail = ''
    try {
      const errBody = (await res.json()) as { error?: { message?: string } }
      detail = errBody?.error?.message ?? ''
    } catch {
      /* corps non-JSON : on garde juste le statut */
    }
    console.warn(
      JSON.stringify({ event: 'llm_error', label: req.costLabel, model, status: res.status, detail }),
    )
    throw new LlmError(`Claude API ${res.status}${detail ? `: ${detail}` : ''}`)
  }

  const data = (await res.json()) as {
    stop_reason?: string
    content?: { type: string; text?: string }[]
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const inputTokens = data.usage?.input_tokens ?? 0
  const outputTokens = data.usage?.output_tokens ?? 0
  logCost(req.costLabel, model, inputTokens, outputTokens)
  req.onUsage?.({ inputTokens, outputTokens })

  if (data.stop_reason === 'refusal') throw new LlmError('Réponse refusée par le modèle')
  const text = data.content?.find((b) => b.type === 'text')?.text
  if (!text) throw new LlmError('Réponse LLM vide')
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new LlmError('Sortie LLM non parsable en JSON')
  }
}
