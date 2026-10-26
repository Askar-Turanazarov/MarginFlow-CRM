-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('PHONE', 'SENSOR', 'SIMULATOR');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "planAt" TIMESTAMP(3),
ADD COLUMN     "planX" DOUBLE PRECISION,
ADD COLUMN     "planY" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LocationPoint" ADD COLUMN     "source" "LocationSource" NOT NULL DEFAULT 'PHONE';

-- AlterTable
ALTER TABLE "OfficeSettings" ADD COLUMN     "simulationEnabled" BOOLEAN NOT NULL DEFAULT false;
