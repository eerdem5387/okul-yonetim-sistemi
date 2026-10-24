-- Okul akademik takvim satırları + aksama kapsamı

ALTER TYPE "HolidayType" ADD VALUE IF NOT EXISTS 'SINAV_DONEMI';
ALTER TYPE "HolidayType" ADD VALUE IF NOT EXISTS 'OZEL_DONEM';

ALTER TABLE "holidays" ADD COLUMN IF NOT EXISTS "blocksTeaching" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisruptionScope') THEN
    CREATE TYPE "DisruptionScope" AS ENUM ('SCHOOL', 'CLASSES', 'SUBJECTS', 'TEACHER');
  END IF;
END $$;

ALTER TABLE "disruptions" ADD COLUMN IF NOT EXISTS "scope" "DisruptionScope" NOT NULL DEFAULT 'SUBJECTS';
ALTER TABLE "disruptions" ADD COLUMN IF NOT EXISTS "affectedClassIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "disruptions" ADD COLUMN IF NOT EXISTS "affectedStaffIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "disruptions"
SET "scope" = 'SCHOOL'
WHERE cardinality("affectedSubjects") = 0
  AND cardinality("affectedClassIds") = 0
  AND cardinality("affectedStaffIds") = 0;
