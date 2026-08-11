-- AlterTable
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "registrationStatusOverride" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "registrationStatusPeriodLabel" TEXT;
