-- CreateEnum
CREATE TYPE "CreditReason" AS ENUM ('FREE_GRANT', 'PURCHASE', 'GENERATION', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "idempotencyKey" TEXT,
    "packKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_ledger_userId_idx" ON "credit_ledger"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_idempotencyKey_key" ON "credit_ledger"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

