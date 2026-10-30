-- AlterTable
ALTER TABLE "OfficeSettings" ALTER COLUMN "locationRetentionDays" SET DEFAULT 30;

-- Offices still on the old default move to 30 days; a value set by hand stays.
UPDATE "OfficeSettings" SET "locationRetentionDays" = 30 WHERE "locationRetentionDays" = 90;
