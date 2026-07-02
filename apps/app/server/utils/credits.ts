/**
 * Service crédits — grand livre (ledger) append-only. Le solde = somme des `delta`.
 *
 * Invariant produit « jamais déficitaire » : aucune écriture directe du solde ;
 * chaque octroi (gratuit/achat) ou consommation est une ligne. L'idempotence est
 * portée par `idempotencyKey` (unique) :
 *   - FREE_GRANT : `free:<userId>`         → 1 octroi gratuit par utilisateur ;
 *   - PURCHASE   : id de session Stripe     → 1 crédit par paiement ;
 *   - GENERATION : null                     → plusieurs consommations autorisées.
 *
 * RGPD : aucune donnée carte ; on ne stocke qu'un id Stripe opaque.
 */
import { Prisma, type PrismaClient } from '@prisma/client'
import { FREE_GENERATIONS } from '../../config/pricing'
import { prisma as defaultPrisma } from './prisma'

/** Client Prisma ou client de transaction (les deux exposent `creditLedger`). */
type Db = PrismaClient | Prisma.TransactionClient

/** Erreur métier : solde insuffisant pour consommer un crédit. */
export class InsufficientCreditsError extends Error {
  constructor() {
    super('Solde de crédits insuffisant')
    this.name = 'InsufficientCreditsError'
  }
}

/** Clé d'idempotence de l'octroi gratuit (1 par utilisateur). Pur. */
export function freeGrantKey(userId: string): string {
  return `free:${userId}`
}

/** Solde courant = somme des deltas du ledger (≥ 0 par construction). */
export async function getCreditBalance(db: Db, userId: string): Promise<number> {
  const agg = await db.creditLedger.aggregate({ where: { userId }, _sum: { delta: true } })
  return agg._sum.delta ?? 0
}

/**
 * Octroie les crédits gratuits une seule fois par utilisateur (idempotent via la
 * contrainte unique sur `idempotencyKey`). No-op si déjà octroyés.
 */
export async function ensureFreeGrant(db: Db, userId: string): Promise<void> {
  if (FREE_GENERATIONS <= 0) return
  try {
    await db.creditLedger.create({
      data: {
        userId,
        delta: FREE_GENERATIONS,
        reason: 'FREE_GRANT',
        idempotencyKey: freeGrantKey(userId),
      },
    })
  } catch (err) {
    // P2002 = violation d'unicité ⇒ octroi déjà effectué : on ignore.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return
    throw err
  }
}

/** Octroi gratuit (si besoin) puis lecture du solde. */
export async function getOrInitBalance(userId: string, db: Db = defaultPrisma): Promise<number> {
  await ensureFreeGrant(db, userId)
  return getCreditBalance(db, userId)
}

/**
 * Consomme 1 crédit pour une génération RÉUSSIE, de façon atomique et sûre :
 * dans une transaction, on relit le solde puis on insère la ligne -1 seulement
 * s'il reste ≥ 1 crédit. Lève `InsufficientCreditsError` sinon (jamais déficitaire).
 */
export async function consumeOneCredit(userId: string, db: PrismaClient = defaultPrisma): Promise<number> {
  // Octroi gratuit AVANT la transaction : il s'appuie sur un catch de violation
  // d'unicité (P2002), or une erreur SQL dans une transaction Postgres l'avorte
  // entièrement (25P02). On le fait donc hors transaction (idempotent, sans risque).
  await ensureFreeGrant(db, userId)
  return db.$transaction(async (tx) => {
    const balance = await getCreditBalance(tx, userId)
    if (balance < 1) throw new InsufficientCreditsError()
    await tx.creditLedger.create({
      data: { userId, delta: -1, reason: 'GENERATION' },
    })
    return balance - 1
  })
}

/**
 * Crédite un achat (webhook Stripe), idempotent par id de session. Renvoie `true`
 * si l'achat a été appliqué, `false` s'il l'avait déjà été (rejeu de webhook).
 */
export async function grantPurchasedCredits(
  params: { userId: string; sessionId: string; packKey: string; credits: number },
  db: Db = defaultPrisma,
): Promise<boolean> {
  try {
    await db.creditLedger.create({
      data: {
        userId: params.userId,
        delta: params.credits,
        reason: 'PURCHASE',
        idempotencyKey: params.sessionId,
        packKey: params.packKey,
      },
    })
    return true
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false
    throw err
  }
}
