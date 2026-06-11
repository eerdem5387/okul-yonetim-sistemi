-- CreateEnum
CREATE TYPE "HrApplicationMeetingOutcome" AS ENUM ('OLUMLU', 'KARARSIZ', 'OLUMSUZ', 'TEKLIF', 'ISE_ALINDI', 'RED');

-- AlterTable
ALTER TABLE "hr_job_applications" ADD COLUMN "lastMeetingAt" TIMESTAMP(3),
ADD COLUMN "lastMeetingOutcome" "HrApplicationMeetingOutcome";

-- CreateTable
CREATE TABLE "hr_job_application_meetings" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "meetingAt" TIMESTAMP(3) NOT NULL,
    "conductedById" TEXT,
    "outcome" "HrApplicationMeetingOutcome" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_job_application_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hr_job_application_meetings_applicationId_idx" ON "hr_job_application_meetings"("applicationId");

-- CreateIndex
CREATE INDEX "hr_job_application_meetings_meetingAt_idx" ON "hr_job_application_meetings"("meetingAt");

-- CreateIndex
CREATE INDEX "hr_job_applications_lastMeetingAt_idx" ON "hr_job_applications"("lastMeetingAt");

-- AddForeignKey
ALTER TABLE "hr_job_application_meetings" ADD CONSTRAINT "hr_job_application_meetings_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "hr_job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_job_application_meetings" ADD CONSTRAINT "hr_job_application_meetings_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
