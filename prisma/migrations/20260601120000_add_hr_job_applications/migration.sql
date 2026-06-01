-- CreateEnum
CREATE TYPE "HrApplicationStatus" AS ENUM ('YENI', 'INCELENDI', 'GORUSME', 'RED', 'ISE_ALINDI');

-- CreateTable
CREATE TABLE "hr_job_applications" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "residence" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "universityDepartment" TEXT NOT NULL,
    "formationStatus" TEXT NOT NULL,
    "appliedBranch" TEXT NOT NULL,
    "experienceLevels" JSONB NOT NULL,
    "totalExperience" TEXT NOT NULL,
    "hasPrivateSchoolExperience" BOOLEAN NOT NULL,
    "pedagogicalApproach" TEXT NOT NULL,
    "clubsAndActivities" TEXT NOT NULL,
    "references" JSONB NOT NULL,
    "cvUrl" TEXT NOT NULL,
    "cvFileName" TEXT NOT NULL,
    "status" "HrApplicationStatus" NOT NULL DEFAULT 'YENI',
    "internalNote" TEXT,
    "assignedToStaffId" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hr_job_applications_externalId_key" ON "hr_job_applications"("externalId");

-- CreateIndex
CREATE INDEX "hr_job_applications_externalId_idx" ON "hr_job_applications"("externalId");

-- CreateIndex
CREATE INDEX "hr_job_applications_appliedBranch_idx" ON "hr_job_applications"("appliedBranch");

-- CreateIndex
CREATE INDEX "hr_job_applications_status_idx" ON "hr_job_applications"("status");

-- CreateIndex
CREATE INDEX "hr_job_applications_createdAt_idx" ON "hr_job_applications"("createdAt");
