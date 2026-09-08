-- AlterTable
ALTER TABLE "exam_scan_templates" ADD COLUMN IF NOT EXISTS "fmtRaw" TEXT;
ALTER TABLE "exam_scan_templates" ADD COLUMN IF NOT EXISTS "fmtFileName" TEXT;
