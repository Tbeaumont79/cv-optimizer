-- CreateEnum
CREATE TYPE "DataGovernanceAction" AS ENUM ('RETENTION_APPLIED', 'ERASURE_REQUESTED', 'EXPORT_REQUESTED');

-- CreateTable
CREATE TABLE "data_governance_event" (
    "id" TEXT NOT NULL,
    "action" "DataGovernanceAction" NOT NULL,
    "subjectRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_governance_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_governance_event_action_idx" ON "data_governance_event"("action");
