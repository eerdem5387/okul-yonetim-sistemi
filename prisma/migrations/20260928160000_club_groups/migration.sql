-- Kulüp grupları (ÖÇG mantığı) + program atamasına grup bağlama
CREATE TABLE IF NOT EXISTS "club_groups" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "club_group_students" (
  "id" TEXT NOT NULL,
  "clubGroupId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_group_students_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "club_groups_clubId_name_key" ON "club_groups"("clubId", "name");
CREATE INDEX IF NOT EXISTS "club_groups_clubId_idx" ON "club_groups"("clubId");
CREATE INDEX IF NOT EXISTS "club_groups_isActive_idx" ON "club_groups"("isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "club_group_students_clubGroupId_studentId_key" ON "club_group_students"("clubGroupId", "studentId");
CREATE INDEX IF NOT EXISTS "club_group_students_clubGroupId_idx" ON "club_group_students"("clubGroupId");
CREATE INDEX IF NOT EXISTS "club_group_students_studentId_idx" ON "club_group_students"("studentId");

ALTER TABLE "club_groups"
  DROP CONSTRAINT IF EXISTS "club_groups_clubId_fkey";
ALTER TABLE "club_groups"
  ADD CONSTRAINT "club_groups_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "club_group_students"
  DROP CONSTRAINT IF EXISTS "club_group_students_clubGroupId_fkey";
ALTER TABLE "club_group_students"
  ADD CONSTRAINT "club_group_students_clubGroupId_fkey"
  FOREIGN KEY ("clubGroupId") REFERENCES "club_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "club_group_students"
  DROP CONSTRAINT IF EXISTS "club_group_students_studentId_fkey";
ALTER TABLE "club_group_students"
  ADD CONSTRAINT "club_group_students_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "club_schedules" ADD COLUMN IF NOT EXISTS "clubGroupId" TEXT;

CREATE INDEX IF NOT EXISTS "club_schedules_clubGroupId_idx" ON "club_schedules"("clubGroupId");

ALTER TABLE "club_schedules"
  DROP CONSTRAINT IF EXISTS "club_schedules_clubGroupId_fkey";
ALTER TABLE "club_schedules"
  ADD CONSTRAINT "club_schedules_clubGroupId_fkey"
  FOREIGN KEY ("clubGroupId") REFERENCES "club_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
