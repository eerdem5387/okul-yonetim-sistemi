-- AlterEnum
ALTER TYPE "SchoolDaySlotKind" ADD VALUE IF NOT EXISTS 'ETUT';

-- CreateTable
CREATE TABLE IF NOT EXISTS "club_schedules" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "club_schedules_clubId_dayOfWeek_startTime_endTime_key"
  ON "club_schedules"("clubId", "dayOfWeek", "startTime", "endTime");

CREATE INDEX IF NOT EXISTS "club_schedules_clubId_idx" ON "club_schedules"("clubId");

CREATE INDEX IF NOT EXISTS "club_schedules_dayOfWeek_startTime_idx"
  ON "club_schedules"("dayOfWeek", "startTime");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'club_schedules_clubId_fkey'
  ) THEN
    ALTER TABLE "club_schedules"
      ADD CONSTRAINT "club_schedules_clubId_fkey"
      FOREIGN KEY ("clubId") REFERENCES "clubs"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
