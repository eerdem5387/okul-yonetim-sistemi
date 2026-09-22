-- Ortak branş katalogu + öğretmen çoklu branş ataması

CREATE TABLE IF NOT EXISTS "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "branches_name_key" ON "branches"("name");
CREATE INDEX IF NOT EXISTS "branches_isActive_sortOrder_idx" ON "branches"("isActive", "sortOrder");

CREATE TABLE IF NOT EXISTS "staff_branches" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "staff_branches_staffId_branchId_key" ON "staff_branches"("staffId", "branchId");
CREATE INDEX IF NOT EXISTS "staff_branches_branchId_idx" ON "staff_branches"("branchId");
CREATE INDEX IF NOT EXISTS "staff_branches_staffId_idx" ON "staff_branches"("staffId");

DO $$ BEGIN
  ALTER TABLE "staff_branches"
    ADD CONSTRAINT "staff_branches_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "staff_branches"
    ADD CONSTRAINT "staff_branches_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "schedule_courses"
  ADD COLUMN IF NOT EXISTS "branchId" TEXT;

CREATE INDEX IF NOT EXISTS "schedule_courses_branchId_idx" ON "schedule_courses"("branchId");

DO $$ BEGIN
  ALTER TABLE "schedule_courses"
    ADD CONSTRAINT "schedule_courses_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "subjects"
  ADD COLUMN IF NOT EXISTS "branchId" TEXT;

CREATE INDEX IF NOT EXISTS "subjects_branchId_idx" ON "subjects"("branchId");

DO $$ BEGIN
  ALTER TABLE "subjects"
    ADD CONSTRAINT "subjects_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
