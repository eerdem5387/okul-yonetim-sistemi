-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SchoolBand" AS ENUM ('ORTAOKUL', 'LISE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SchoolDaySlotKind" AS ENUM ('LESSON', 'BREAK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "school_day_templates" (
    "id" TEXT NOT NULL,
    "band" "SchoolBand" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_day_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "school_day_templates_band_key" ON "school_day_templates"("band");

CREATE TABLE IF NOT EXISTS "school_day_slots" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "SchoolDaySlotKind" NOT NULL DEFAULT 'LESSON',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "school_day_slots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "school_day_slots_templateId_idx" ON "school_day_slots"("templateId");
CREATE INDEX IF NOT EXISTS "school_day_slots_templateId_sortOrder_idx" ON "school_day_slots"("templateId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "school_day_slots"
    ADD CONSTRAINT "school_day_slots_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "school_day_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
