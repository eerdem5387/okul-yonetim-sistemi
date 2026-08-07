-- AlterTable
ALTER TABLE "academic_years" ADD COLUMN IF NOT EXISTS "isRenewalPeriod" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "academic_years_isRenewalPeriod_idx" ON "academic_years"("isRenewalPeriod");
