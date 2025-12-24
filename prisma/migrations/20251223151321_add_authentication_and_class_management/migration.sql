-- AlterTable: Staff - Authentication fields ekleme
ALTER TABLE "staff" ADD COLUMN "password" TEXT;
ALTER TABLE "staff" ADD COLUMN "isFirstLogin" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "staff" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "staff" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- CreateEnum: ApprovalStatus
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable: classes
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "counselorId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: class_students
CREATE TABLE "class_students" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable: schedules
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: schedule_approvals
CREATE TABLE "schedule_approvals" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "classId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_approvals_pkey" PRIMARY KEY ("id")
);

-- AlterTable: subjects - classId ekleme
ALTER TABLE "subjects" ADD COLUMN "classId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "classes_academicYearId_name_key" ON "classes"("academicYearId", "name");
CREATE INDEX "classes_academicYearId_idx" ON "classes"("academicYearId");
CREATE INDEX "classes_counselorId_idx" ON "classes"("counselorId");
CREATE INDEX "classes_grade_idx" ON "classes"("grade");
CREATE INDEX "classes_academicYearId_grade_idx" ON "classes"("academicYearId", "grade");

CREATE UNIQUE INDEX "class_students_classId_studentId_key" ON "class_students"("classId", "studentId");
CREATE INDEX "class_students_classId_idx" ON "class_students"("classId");
CREATE INDEX "class_students_studentId_idx" ON "class_students"("studentId");

CREATE INDEX "schedules_classId_idx" ON "schedules"("classId");
CREATE INDEX "schedules_teacherId_idx" ON "schedules"("teacherId");
CREATE INDEX "schedules_dayOfWeek_idx" ON "schedules"("dayOfWeek");
CREATE INDEX "schedules_classId_dayOfWeek_idx" ON "schedules"("classId", "dayOfWeek");

CREATE INDEX "schedule_approvals_scheduleId_idx" ON "schedule_approvals"("scheduleId");
CREATE INDEX "schedule_approvals_status_idx" ON "schedule_approvals"("status");
CREATE INDEX "schedule_approvals_requestedBy_idx" ON "schedule_approvals"("requestedBy");
CREATE INDEX "schedule_approvals_classId_idx" ON "schedule_approvals"("classId");
CREATE INDEX "schedule_approvals_status_classId_idx" ON "schedule_approvals"("status", "classId");

CREATE INDEX "subjects_classId_idx" ON "subjects"("classId");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "classes" ADD CONSTRAINT "classes_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "class_students" ADD CONSTRAINT "class_students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedules" ADD CONSTRAINT "schedules_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_approvals" ADD CONSTRAINT "schedule_approvals_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subjects" ADD CONSTRAINT "subjects_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

