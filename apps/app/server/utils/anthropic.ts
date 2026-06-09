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

export interface LlmRequest {
  /** Consignes système (rôle/tâche). Pas de contenu CV au-delà du strict nécessaire. */
  system: string
  /** Message utilisateur : données structurées (profil réel + offre analysée). */
  user: string
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

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new LlmError(`Claude API ${res.status}`)

  const data = (await res.json()) as {
    stop_reason?: string
    content?: { type: string; text?: string }[]
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  logCost(req.costLabel, model, data.usage?.input_tokens ?? 0, data.usage?.output_tokens ?? 0)

  if (data.stop_reason === 'refusal') throw new LlmError('Réponse refusée par le modèle')
  const text = data.content?.find((b) => b.type === 'text')?.text
  if (!text) throw new LlmError('Réponse LLM vide')
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new LlmError('Sortie LLM non parsable en JSON')
  }
}
