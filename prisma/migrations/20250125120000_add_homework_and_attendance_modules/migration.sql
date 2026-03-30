-- CreateEnum: AttendanceStatus (idempotent — DB'de zaten varsa atla)
DO $$ BEGIN
    CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: homeworks (Ödevler)
CREATE TABLE "homeworks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subject" TEXT,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT,
    "attachmentUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homeworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: homework_assignments (Ödev Atamaları)
CREATE TABLE "homework_assignments" (
    "id" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homework_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: attendances (Yoklamalar)
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lessonName" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "homeworks_teacherId_idx" ON "homeworks"("teacherId");

-- CreateIndex
CREATE INDEX "homeworks_classId_idx" ON "homeworks"("classId");

-- CreateIndex
CREATE INDEX "homeworks_dueDate_idx" ON "homeworks"("dueDate");

-- CreateIndex
CREATE INDEX "homeworks_isActive_idx" ON "homeworks"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "homework_assignments_homeworkId_studentId_key" ON "homework_assignments"("homeworkId", "studentId");

-- CreateIndex
CREATE INDEX "homework_assignments_homeworkId_idx" ON "homework_assignments"("homeworkId");

-- CreateIndex
CREATE INDEX "homework_assignments_studentId_idx" ON "homework_assignments"("studentId");

-- CreateIndex
CREATE INDEX "homework_assignments_isCompleted_idx" ON "homework_assignments"("isCompleted");

-- CreateIndex
CREATE INDEX "attendances_scheduleId_idx" ON "attendances"("scheduleId");

-- CreateIndex
CREATE INDEX "attendances_classId_idx" ON "attendances"("classId");

-- CreateIndex
CREATE INDEX "attendances_teacherId_idx" ON "attendances"("teacherId");

-- CreateIndex
CREATE INDEX "attendances_studentId_idx" ON "attendances"("studentId");

-- CreateIndex
CREATE INDEX "attendances_date_idx" ON "attendances"("date");

-- CreateIndex
CREATE INDEX "attendances_status_idx" ON "attendances"("status");

-- AddForeignKey
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_assignments" ADD CONSTRAINT "homework_assignments_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_assignments" ADD CONSTRAINT "homework_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

