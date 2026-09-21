-- CreateTable
CREATE TABLE IF NOT EXISTS "study_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectName" TEXT,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_groups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "study_groups_teacherId_idx" ON "study_groups"("teacherId");
CREATE INDEX IF NOT EXISTS "study_groups_dayOfWeek_idx" ON "study_groups"("dayOfWeek");
CREATE INDEX IF NOT EXISTS "study_groups_teacherId_dayOfWeek_idx" ON "study_groups"("teacherId", "dayOfWeek");

DO $$ BEGIN
  ALTER TABLE "study_groups"
    ADD CONSTRAINT "study_groups_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "study_group_students" (
    "id" TEXT NOT NULL,
    "studyGroupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_group_students_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "study_group_students_studyGroupId_studentId_key"
  ON "study_group_students"("studyGroupId", "studentId");
CREATE INDEX IF NOT EXISTS "study_group_students_studyGroupId_idx" ON "study_group_students"("studyGroupId");
CREATE INDEX IF NOT EXISTS "study_group_students_studentId_idx" ON "study_group_students"("studentId");

DO $$ BEGIN
  ALTER TABLE "study_group_students"
    ADD CONSTRAINT "study_group_students_studyGroupId_fkey"
    FOREIGN KEY ("studyGroupId") REFERENCES "study_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "study_group_students"
    ADD CONSTRAINT "study_group_students_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
