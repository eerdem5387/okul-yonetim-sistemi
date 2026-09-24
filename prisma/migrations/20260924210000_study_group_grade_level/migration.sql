-- ÖÇG: band (ortaokul/lise) → gradeLevel (5–12)

ALTER TABLE "study_groups" ADD COLUMN "gradeLevel" INTEGER;

-- Not alanından sınıf düzeyi (örn. "8. sınıf")
UPDATE "study_groups"
SET "gradeLevel" = CASE
  WHEN "notes" ~ '(^|[^0-9])5([^0-9]|$)' THEN 5
  WHEN "notes" ~ '(^|[^0-9])6([^0-9]|$)' THEN 6
  WHEN "notes" ~ '(^|[^0-9])7([^0-9]|$)' THEN 7
  WHEN "notes" ~ '(^|[^0-9])8([^0-9]|$)' THEN 8
  WHEN "notes" ~ '(^|[^0-9])9([^0-9]|$)' THEN 9
  WHEN "notes" ~ '(^|[^0-9])10([^0-9]|$)' THEN 10
  WHEN "notes" ~ '(^|[^0-9])11([^0-9]|$)' THEN 11
  WHEN "notes" ~ '(^|[^0-9])12([^0-9]|$)' THEN 12
  WHEN "band" = 'LISE' THEN 9
  ELSE 5
END
WHERE "gradeLevel" IS NULL;

ALTER TABLE "study_groups" ALTER COLUMN "gradeLevel" SET NOT NULL;

DROP INDEX IF EXISTS "study_groups_band_idx";
ALTER TABLE "study_groups" DROP COLUMN IF EXISTS "band";

CREATE INDEX "study_groups_gradeLevel_idx" ON "study_groups"("gradeLevel");
