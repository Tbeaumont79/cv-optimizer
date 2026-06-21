-- CreateEnum
CREATE TYPE "candidature_status" AS ENUM ('DRAFT', 'SUBMITTED', 'INTERVIEW', 'REJECTED', 'ACCEPTED');

-- CreateTable
CREATE TABLE "candidatures" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "candidature_status" NOT NULL DEFAULT 'DRAFT',
    "offerSnapshot" JSONB NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "matchReport" JSONB NOT NULL,
    "generatedCv" JSONB NOT NULL,
    "design" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "candidatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidatures_userId_deletedAt_idx" ON "candidatures"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "candidatures_deletedAt_idx" ON "candidatures"("deletedAt");
