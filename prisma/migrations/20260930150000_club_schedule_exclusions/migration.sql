-- Öğrenci kulüp grubunda kalır; yalnızca belirli ClubSchedule oturumundan muaf tutulur

CREATE TABLE "club_schedule_exclusions" (
    "id" TEXT NOT NULL,
    "clubScheduleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_schedule_exclusions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "club_schedule_exclusions_clubScheduleId_studentId_key" ON "club_schedule_exclusions"("clubScheduleId", "studentId");
CREATE INDEX "club_schedule_exclusions_clubScheduleId_idx" ON "club_schedule_exclusions"("clubScheduleId");
CREATE INDEX "club_schedule_exclusions_studentId_idx" ON "club_schedule_exclusions"("studentId");

ALTER TABLE "club_schedule_exclusions" ADD CONSTRAINT "club_schedule_exclusions_clubScheduleId_fkey" FOREIGN KEY ("clubScheduleId") REFERENCES "club_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_schedule_exclusions" ADD CONSTRAINT "club_schedule_exclusions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
