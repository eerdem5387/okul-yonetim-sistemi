-- CreateTable
CREATE TABLE IF NOT EXISTS "club_demand_requests" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_demand_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "club_demand_requests_clubId_studentId_key"
  ON "club_demand_requests"("clubId", "studentId");

CREATE INDEX IF NOT EXISTS "club_demand_requests_clubId_idx" ON "club_demand_requests"("clubId");

CREATE INDEX IF NOT EXISTS "club_demand_requests_studentId_idx" ON "club_demand_requests"("studentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'club_demand_requests_clubId_fkey'
  ) THEN
    ALTER TABLE "club_demand_requests"
      ADD CONSTRAINT "club_demand_requests_clubId_fkey"
      FOREIGN KEY ("clubId") REFERENCES "clubs"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'club_demand_requests_studentId_fkey'
  ) THEN
    ALTER TABLE "club_demand_requests"
      ADD CONSTRAINT "club_demand_requests_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "students"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
