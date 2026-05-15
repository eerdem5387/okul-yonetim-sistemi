-- HRM Modülü: İzin (StaffLeave), Nöbet (StaffDuty), Yönetici Notları (Staff.adminNotes)

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK_REPORT', 'EXCUSE', 'UNPAID', 'HOURLY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "staff"
    ADD COLUMN "adminNotes" JSONB,
    ADD COLUMN "adminNotesUpdatedAt" TIMESTAMP(3),
    ADD COLUMN "adminNotesUpdatedBy" TEXT;

-- CreateTable
CREATE TABLE "staff_leaves" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_leaves_staffId_idx" ON "staff_leaves"("staffId");

-- CreateIndex
CREATE INDEX "staff_leaves_status_idx" ON "staff_leaves"("status");

-- CreateIndex
CREATE INDEX "staff_leaves_startDate_endDate_idx" ON "staff_leaves"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "staff_leaves" ADD CONSTRAINT "staff_leaves_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leaves" ADD CONSTRAINT "staff_leaves_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "staff_duties" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_duties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_duties_staffId_idx" ON "staff_duties"("staffId");

-- CreateIndex
CREATE INDEX "staff_duties_dayOfWeek_idx" ON "staff_duties"("dayOfWeek");

-- AddForeignKey
ALTER TABLE "staff_duties" ADD CONSTRAINT "staff_duties_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
