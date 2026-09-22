-- Cumartesi sınıf ayarı + gün şablonu kapsamı (hafta içi / cumartesi)

DO $$ BEGIN
  CREATE TYPE "ClassSaturdayMode" AS ENUM ('FULL', 'EXAM_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DayTemplateScope" AS ENUM ('WEEKDAY', 'SATURDAY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "classes"
  ADD COLUMN IF NOT EXISTS "saturdayEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "classes"
  ADD COLUMN IF NOT EXISTS "saturdayMode" "ClassSaturdayMode" NOT NULL DEFAULT 'FULL';

ALTER TABLE "school_day_templates"
  ADD COLUMN IF NOT EXISTS "scope" "DayTemplateScope" NOT NULL DEFAULT 'WEEKDAY';

DROP INDEX IF EXISTS "school_day_templates_band_key";

CREATE UNIQUE INDEX IF NOT EXISTS "school_day_templates_band_scope_key"
  ON "school_day_templates"("band", "scope");
