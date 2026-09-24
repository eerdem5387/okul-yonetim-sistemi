-- ÖÇG: grup (isim+öğrenci) ile program atamasını ayır

CREATE TABLE "study_group_sessions" (
    "id" TEXT NOT NULL,
    "studyGroupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "topic" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_group_sessions_pkey" PRIMARY KEY ("id")
);

-- Mevcut gruplardan atama satırları oluştur
INSERT INTO "study_group_sessions" (
  "id", "studyGroupId", "teacherId", "dayOfWeek", "startTime", "endTime",
  "room", "topic", "notes", "isActive", "createdAt", "updatedAt"
)
SELECT
  'sgs_' || "id",
  "id",
  "teacherId",
  "dayOfWeek",
  "startTime",
  "endTime",
  "room",
  COALESCE(NULLIF(TRIM("subjectName"), ''), "name"),
  "notes",
  "isActive",
  "createdAt",
  "updatedAt"
FROM "study_groups"
WHERE "teacherId" IS NOT NULL
  AND "dayOfWeek" IS NOT NULL
  AND "startTime" IS NOT NULL
  AND "endTime" IS NOT NULL;

DROP INDEX IF EXISTS "study_groups_teacherId_idx";
DROP INDEX IF EXISTS "study_groups_dayOfWeek_idx";
DROP INDEX IF EXISTS "study_groups_teacherId_dayOfWeek_idx";

ALTER TABLE "study_groups" DROP CONSTRAINT IF EXISTS "study_groups_teacherId_fkey";

ALTER TABLE "study_groups" DROP COLUMN IF EXISTS "subjectName";
ALTER TABLE "study_groups" DROP COLUMN IF EXISTS "teacherId";
ALTER TABLE "study_groups" DROP COLUMN IF EXISTS "dayOfWeek";
ALTER TABLE "study_groups" DROP COLUMN IF EXISTS "startTime";
ALTER TABLE "study_groups" DROP COLUMN IF EXISTS "endTime";
ALTER TABLE "study_groups" DROP COLUMN IF EXISTS "room";

CREATE INDEX "study_groups_isActive_idx" ON "study_groups"("isActive");

CREATE INDEX "study_group_sessions_studyGroupId_idx" ON "study_group_sessions"("studyGroupId");
CREATE INDEX "study_group_sessions_teacherId_idx" ON "study_group_sessions"("teacherId");
CREATE INDEX "study_group_sessions_dayOfWeek_idx" ON "study_group_sessions"("dayOfWeek");
CREATE INDEX "study_group_sessions_teacherId_dayOfWeek_idx" ON "study_group_sessions"("teacherId", "dayOfWeek");

ALTER TABLE "study_group_sessions"
  ADD CONSTRAINT "study_group_sessions_studyGroupId_fkey"
  FOREIGN KEY ("studyGroupId") REFERENCES "study_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "study_group_sessions"
  ADD CONSTRAINT "study_group_sessions_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
