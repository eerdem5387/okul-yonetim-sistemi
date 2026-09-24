-- ÖÇG gruplarına kademe (ortaokul / lise) — ders saati şablonu için

ALTER TABLE "study_groups" ADD COLUMN "band" "SchoolBand" NOT NULL DEFAULT 'ORTAOKUL';

-- Not alanından kaba geri doldurma
UPDATE "study_groups"
SET "band" = 'LISE'
WHERE "notes" ILIKE '%lise%'
   OR "notes" ~ '(^|[^0-9])(9|10|11|12)([^0-9]|$)';

CREATE INDEX "study_groups_band_idx" ON "study_groups"("band");
