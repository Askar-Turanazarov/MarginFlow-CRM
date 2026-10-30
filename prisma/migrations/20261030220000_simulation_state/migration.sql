-- AlterTable
ALTER TABLE "OfficeSettings" ADD COLUMN     "simulationState" JSONB,
ADD COLUMN     "simulationTickAt" TIMESTAMP(3);
