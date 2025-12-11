-- AlterEnum: ProgressStatus enum'ına PENDING_APPROVAL ekle
ALTER TYPE "ProgressStatus" ADD VALUE 'PENDING_APPROVAL';

-- AlterTable: Progress tablosuna yeni alanlar ekle
ALTER TABLE "progress" ADD COLUMN IF NOT EXISTS "reportedAt" TIMESTAMP(3);
ALTER TABLE "progress" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "progress" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

-- Index'ler ekle
CREATE INDEX IF NOT EXISTS "progress_reportedBy_idx" ON "progress"("reportedBy");
CREATE INDEX IF NOT EXISTS "progress_approvedBy_idx" ON "progress"("approvedBy");

