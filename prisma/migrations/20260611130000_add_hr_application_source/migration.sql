-- CreateEnum
CREATE TYPE "HrApplicationSource" AS ENUM ('WEBSITE', 'MANUAL');

-- AlterTable
ALTER TABLE "hr_job_applications" ADD COLUMN "source" "HrApplicationSource" NOT NULL DEFAULT 'WEBSITE';

-- CreateIndex
CREATE INDEX "hr_job_applications_source_idx" ON "hr_job_applications"("source");
