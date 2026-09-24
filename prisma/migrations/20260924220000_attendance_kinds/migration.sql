-- Yoklama: ÖÇG + kulüp desteği

CREATE TYPE "AttendanceKind" AS ENUM ('CLASS', 'STUDY_GROUP', 'CLUB');

ALTER TABLE "attendances" ADD COLUMN "kind" "AttendanceKind" NOT NULL DEFAULT 'CLASS';
ALTER TABLE "attendances" ADD COLUMN "studyGroupSessionId" TEXT;
ALTER TABLE "attendances" ADD COLUMN "clubScheduleId" TEXT;

ALTER TABLE "attendances" ALTER COLUMN "classId" DROP NOT NULL;

CREATE INDEX "attendances_kind_idx" ON "attendances"("kind");
CREATE INDEX "attendances_studyGroupSessionId_idx" ON "attendances"("studyGroupSessionId");
CREATE INDEX "attendances_clubScheduleId_idx" ON "attendances"("clubScheduleId");
CREATE INDEX "attendances_kind_date_idx" ON "attendances"("kind", "date");

ALTER TABLE "attendances"
  ADD CONSTRAINT "attendances_studyGroupSessionId_fkey"
  FOREIGN KEY ("studyGroupSessionId") REFERENCES "study_group_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendances"
  ADD CONSTRAINT "attendances_clubScheduleId_fkey"
  FOREIGN KEY ("clubScheduleId") REFERENCES "club_schedules"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
