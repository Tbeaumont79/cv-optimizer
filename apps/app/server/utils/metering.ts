/**
 * Service de metering (THI-126) — enregistre les événements d'usage et agrège le
 * compteur de période. Appelé par les chemins génération (THI-124) et export PDF
 * (THI-125) : chaque action y crée un `usage_event` et incrémente le `usage_counter`.
 *
 * Conception testable (cf. `DbPinger` de health.ts) : la logique de mapping/agrégat
 * est PURE et testée unitairement ; l'accès base passe par une interface minimale
 * `MeteringClient`, ce qui permet d'injecter un faux client dans les tests sans base.
 *
 * RGPD : on n'écrit que des compteurs et des volumes de tokens — jamais de contenu.
 */
import {
  EMPTY_USAGE_SNAPSHOT,
  buildUsageSummary,
  isQuotaExceeded,
  usagePeriod,
  type UsageCounterSnapshot,
  type UsageEventType,
  type UsageQuotas,
  type UsageSummary,
} from '@cvo/shared'

/** Enum Prisma (UPPER_SNAKE) ↔ type partagé (lower). */
const EVENT_TYPE_TO_PRISMA = {
  generation: 'GENERATION',
  export_pdf: 'EXPORT_PDF',
  extraction: 'EXTRACTION',
} as const satisfies Record<UsageEventType, string>

type PrismaUsageEventType = (typeof EVENT_TYPE_TO_PRISMA)[UsageEventType]

/** Colonne de compteur incrémentée pour un type d'événement donné. */
const COUNTER_COLUMN = {
  generation: 'generationCount',
  export_pdf: 'exportPdfCount',
  extraction: 'extractionCount',
} as const satisfies Record<UsageEventType, string>

type CounterColumn = (typeof COUNTER_COLUMN)[UsageEventType]

/** Ligne `usage_counters` telle que lue/écrite (sous-ensemble utile). */
export interface UsageCounterRow {
  generationCount: number
  exportPdfCount: number
  extractionCount: number
  tokensIn: number
  tokensOut: number
  billableCount: number
}

/** Entrée d'un enregistrement d'usage. */
export interface RecordUsageInput {
  userId: string
  type: UsageEventType
  /** Tokens LLM (jamais le contenu). */
  tokensIn?: number
  tokensOut?: number
  /** Compte dans la base billing freemium. Défaut : false (gratuit au MVP). */
  billable?: boolean
}

// ── Builders purs (testés) ───────────────────────────────────────────────────

/** Données de création de l'événement (forme Prisma). Pur. */
export function eventCreateData(input: RecordUsageInput, period: string) {
  return {
    userId: input.userId,
    type: EVENT_TYPE_TO_PRISMA[input.type] as PrismaUsageEventType,
    period,
    tokensIn: input.tokensIn ?? 0,
    tokensOut: input.tokensOut ?? 0,
    billable: input.billable ?? false,
  }
}

/** Données de création d'un compteur (première action de la période). Pur. */
export function counterCreateData(input: RecordUsageInput, period: string) {
  return {
    userId: input.userId,
    period,
    generationCount: input.type === 'generation' ? 1 : 0,
    exportPdfCount: input.type === 'export_pdf' ? 1 : 0,
    extractionCount: input.type === 'extraction' ? 1 : 0,
    tokensIn: input.tokensIn ?? 0,
    tokensOut: input.tokensOut ?? 0,
    billableCount: input.billable ? 1 : 0,
  }
}

/** Données d'incrément d'un compteur existant (opérateurs Prisma `increment`). Pur. */
export function counterUpdateData(input: RecordUsageInput) {
  const column: CounterColumn = COUNTER_COLUMN[input.type]
  return {
    [column]: { increment: 1 },
    tokensIn: { increment: input.tokensIn ?? 0 },
    tokensOut: { increment: input.tokensOut ?? 0 },
    billableCount: { increment: input.billable ? 1 : 0 },
  }
}

/** Snapshot agrégé à partir d'une ligne compteur (ou compteur vide si absente). Pur. */
export function snapshotFromRow(row: UsageCounterRow | null): UsageCounterSnapshot {
  if (!row) return { ...EMPTY_USAGE_SNAPSHOT }
  return {
    generation: row.generationCount,
    export_pdf: row.exportPdfCount,
    extraction: row.extractionCount,
    tokensIn: row.tokensIn,
    tokensOut: row.tokensOut,
    billableCount: row.billableCount,
  }
}

// ── Accès base (interface minimale → injectable / testable) ───────────────────

type CounterWhere = { userId_period: { userId: string; period: string } }

interface UsageCounterDelegate {
  findUnique(args: { where: CounterWhere }): Promise<UsageCounterRow | null>
  upsert(args: {
    where: CounterWhere
    create: ReturnType<typeof counterCreateData>
    update: ReturnType<typeof counterUpdateData>
  }): Promise<UsageCounterRow>
}

interface MeteringTx {
  usageEvent: { create(args: { data: ReturnType<typeof eventCreateData> }): Promise<unknown> }
  usageCounter: Pick<UsageCounterDelegate, 'upsert'>
}

/** Client minimal requis par le service (satisfait par le client Prisma). */
export interface MeteringClient {
  usageCounter: Pick<UsageCounterDelegate, 'findUnique'>
  $transaction<T>(fn: (tx: MeteringTx) => Promise<T>): Promise<T>
}

/**
 * Enregistre un événement d'usage et agrège le compteur de période, de façon
 * atomique (création de l'événement + upsert du compteur dans une transaction).
 */
export async function recordUsageEvent(
  client: MeteringClient,
  input: RecordUsageInput,
  now: Date,
): Promise<void> {
  const period = usagePeriod(now)
  const where: CounterWhere = { userId_period: { userId: input.userId, period } }
  await client.$transaction(async (tx) => {
    await tx.usageEvent.create({ data: eventCreateData(input, period) })
    await tx.usageCounter.upsert({
      where,
      create: counterCreateData(input, period),
      update: counterUpdateData(input),
    })
  })
}

/** Lit le snapshot d'usage d'un utilisateur pour la période en cours. */
export async function readSnapshot(
  client: MeteringClient,
  userId: string,
  now: Date,
): Promise<UsageCounterSnapshot> {
  const period = usagePeriod(now)
  const row = await client.usageCounter.findUnique({
    where: { userId_period: { userId, period } },
  })
  return snapshotFromRow(row)
}

/** Usage courant (snapshot + état des quotas) — réponse de l'endpoint. */
export async function readUsageSummary(
  client: MeteringClient,
  userId: string,
  quotas: UsageQuotas,
  now: Date,
): Promise<UsageSummary> {
  const snapshot = await readSnapshot(client, userId, now)
  return buildUsageSummary(usagePeriod(now), snapshot, quotas)
}

/**
 * Garde de quota : `true` si une action de ce type est encore permise pour la
 * période en cours. Les chemins génération/export DOIVENT l'appeler avant d'agir.
 */
export async function isUsageAllowed(
  client: MeteringClient,
  userId: string,
  type: UsageEventType,
  quotas: UsageQuotas,
  now: Date,
): Promise<boolean> {
  const snapshot = await readSnapshot(client, userId, now)
  return !isQuotaExceeded(type, snapshot[type], quotas)
}
