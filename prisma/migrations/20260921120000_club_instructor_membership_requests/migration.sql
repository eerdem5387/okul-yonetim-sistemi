-- AlterTable
ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "instructorId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "clubs_instructorId_idx" ON "clubs"("instructorId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "clubs"
    ADD CONSTRAINT "clubs_instructorId_fkey"
    FOREIGN KEY ("instructorId") REFERENCES "staff"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ClubMembershipChangeType" AS ENUM ('ADD', 'REMOVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "club_membership_requests" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "changeType" "ClubMembershipChangeType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_membership_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "club_membership_requests_status_idx" ON "club_membership_requests"("status");
CREATE INDEX IF NOT EXISTS "club_membership_requests_clubId_status_idx" ON "club_membership_requests"("clubId", "status");
CREATE INDEX IF NOT EXISTS "club_membership_requests_requestedById_idx" ON "club_membership_requests"("requestedById");

DO $$ BEGIN
  ALTER TABLE "club_membership_requests"
    ADD CONSTRAINT "club_membership_requests_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "club_membership_requests"
    ADD CONSTRAINT "club_membership_requests_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "club_membership_requests"
    ADD CONSTRAINT "club_membership_requests_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "club_membership_requests"
    ADD CONSTRAINT "club_membership_requests_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
