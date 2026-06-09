import { describe, it, expect } from 'vitest'
import {
  counterCreateData,
  counterUpdateData,
  eventCreateData,
  isUsageAllowed,
  readUsageSummary,
  recordUsageEvent,
  snapshotFromRow,
  type MeteringClient,
  type RecordUsageInput,
  type UsageCounterRow,
} from '../server/utils/metering'

const NOW = new Date('2026-06-09T10:00:00.000Z') // période 202606

/**
 * Faux client de metering : simule un compteur en mémoire et applique les
 * opérateurs `increment` de l'upsert. Permet de prouver event + agrégat sans base.
 */
function makeFakeClient(initial: UsageCounterRow | null = null) {
  let counter = initial
  const events: ReturnType<typeof eventCreateData>[] = []

  const client: MeteringClient = {
    usageCounter: {
      findUnique: async () => counter,
    },
    $transaction: async (fn) =>
      fn({
        usageEvent: {
          create: async ({ data }) => {
            events.push(data)
          },
        },
        usageCounter: {
          upsert: async ({ create, update }) => {
            if (!counter) {
              counter = { ...create } as UsageCounterRow
            } else {
              // Applique chaque { increment: n } sur la colonne correspondante.
              for (const [key, op] of Object.entries(update)) {
                const inc = (op as { increment: number }).increment
                counter[key as keyof UsageCounterRow] += inc
              }
            }
            return counter
          },
        },
      }),
  }

  return { client, events, snapshot: () => counter }
}

describe('builders purs', () => {
  it('eventCreateData mappe le type vers l’enum Prisma et défaut les tokens', () => {
    const input: RecordUsageInput = { userId: 'u1', type: 'export_pdf' }
    expect(eventCreateData(input, '202606')).toEqual({
      userId: 'u1',
      type: 'EXPORT_PDF',
      period: '202606',
      tokensIn: 0,
      tokensOut: 0,
      billable: false,
    })
  })

  it('counterCreateData met à 1 la bonne colonne et 0 les autres', () => {
    const data = counterCreateData({ userId: 'u1', type: 'generation', billable: true }, '202606')
    expect(data.generationCount).toBe(1)
    expect(data.exportPdfCount).toBe(0)
    expect(data.extractionCount).toBe(0)
    expect(data.billableCount).toBe(1)
  })

  it('counterUpdateData incrémente la bonne colonne', () => {
    const data = counterUpdateData({ userId: 'u1', type: 'extraction', tokensIn: 12, tokensOut: 3 })
    expect(data).toMatchObject({
      extractionCount: { increment: 1 },
      tokensIn: { increment: 12 },
      tokensOut: { increment: 3 },
      billableCount: { increment: 0 },
    })
  })

  it('snapshotFromRow renvoie un compteur vide si la ligne est absente', () => {
    expect(snapshotFromRow(null)).toEqual({
      generation: 0,
      export_pdf: 0,
      extraction: 0,
      tokensIn: 0,
      tokensOut: 0,
      billableCount: 0,
    })
  })
})

describe('recordUsageEvent', () => {
  it('crée un usage_event et initialise le compteur à la première action', async () => {
    const fake = makeFakeClient()
    await recordUsageEvent(
      fake.client,
      { userId: 'u1', type: 'generation', tokensIn: 100, tokensOut: 200, billable: true },
      NOW,
    )

    expect(fake.events).toHaveLength(1)
    expect(fake.events[0]).toMatchObject({ userId: 'u1', type: 'GENERATION', period: '202606' })
    expect(fake.snapshot()).toMatchObject({
      generationCount: 1,
      tokensIn: 100,
      tokensOut: 200,
      billableCount: 1,
    })
  })

  it('agrège : deux générations incrémentent le compteur de période', async () => {
    const fake = makeFakeClient()
    await recordUsageEvent(fake.client, { userId: 'u1', type: 'generation', tokensIn: 10 }, NOW)
    await recordUsageEvent(fake.client, { userId: 'u1', type: 'generation', tokensIn: 5 }, NOW)
    await recordUsageEvent(fake.client, { userId: 'u1', type: 'export_pdf' }, NOW)

    expect(fake.events).toHaveLength(3)
    expect(fake.snapshot()).toMatchObject({ generationCount: 2, exportPdfCount: 1, tokensIn: 15 })
  })
})

describe('readUsageSummary & isUsageAllowed', () => {
  it('expose l’usage courant agrégé + l’état des quotas', async () => {
    const row: UsageCounterRow = {
      generationCount: 5,
      exportPdfCount: 1,
      extractionCount: 0,
      tokensIn: 1000,
      tokensOut: 2000,
      billableCount: 0,
    }
    const fake = makeFakeClient(row)
    const summary = await readUsageSummary(fake.client, 'u1', { generation: 5 }, NOW)
    expect(summary.period).toBe('202606')
    expect(summary.counter.generation).toBe(5)
    const gen = summary.quotas.find((q) => q.type === 'generation')!
    expect(gen.exceeded).toBe(true)
  })

  it('refuse une génération quand le quota de période est atteint', async () => {
    const row = { ...snapshotToRow(), generationCount: 5 }
    const fake = makeFakeClient(row)
    expect(await isUsageAllowed(fake.client, 'u1', 'generation', { generation: 5 }, NOW)).toBe(
      false,
    )
    expect(await isUsageAllowed(fake.client, 'u1', 'export_pdf', { generation: 5 }, NOW)).toBe(true)
  })
})

/** Ligne compteur à zéro, utilitaire de test. */
function snapshotToRow(): UsageCounterRow {
  return {
    generationCount: 0,
    exportPdfCount: 0,
    extractionCount: 0,
    tokensIn: 0,
    tokensOut: 0,
    billableCount: 0,
  }
}
