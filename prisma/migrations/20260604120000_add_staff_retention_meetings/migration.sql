-- CreateEnum
CREATE TYPE "StaffRetentionOutcome" AS ENUM ('WILL_CONTINUE', 'UNCERTAIN', 'WILL_NOT_CONTINUE');

-- CreateTable
CREATE TABLE "staff_retention_cycles" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "targetAcademicYearId" TEXT,
    "targetAcademicYearLabel" TEXT NOT NULL,
    "currentOutcome" "StaffRetentionOutcome",
    "lastMeetingAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_retention_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_retention_meetings" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "meetingAt" TIMESTAMP(3) NOT NULL,
    "conductedById" TEXT,
    "outcome" "StaffRetentionOutcome" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_retention_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_retention_cycles_currentOutcome_idx" ON "staff_retention_cycles"("currentOutcome");

-- CreateIndex
CREATE INDEX "staff_retention_cycles_targetAcademicYearLabel_idx" ON "staff_retention_cycles"("targetAcademicYearLabel");

-- CreateIndex
CREATE UNIQUE INDEX "staff_retention_cycles_staffId_targetAcademicYearLabel_key" ON "staff_retention_cycles"("staffId", "targetAcademicYearLabel");

-- CreateIndex
CREATE INDEX "staff_retention_meetings_cycleId_idx" ON "staff_retention_meetings"("cycleId");

-- CreateIndex
CREATE INDEX "staff_retention_meetings_meetingAt_idx" ON "staff_retention_meetings"("meetingAt");

-- AddForeignKey
ALTER TABLE "staff_retention_cycles" ADD CONSTRAINT "staff_retention_cycles_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_retention_meetings" ADD CONSTRAINT "staff_retention_meetings_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "staff_retention_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_retention_meetings" ADD CONSTRAINT "staff_retention_meetings_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
