-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "assignedAt" TIMESTAMP(3);

-- Existing assignments: best known time is the last update.
UPDATE "Request" SET "assignedAt" = "updatedAt" WHERE "assigneeId" IS NOT NULL;
