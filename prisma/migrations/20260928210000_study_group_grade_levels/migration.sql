-- ÖÇG: tek gradeLevel → çoklu gradeLevels (boş = tüm sınıflar)

ALTER TABLE "study_groups" ADD COLUMN "gradeLevels" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "study_groups"
SET "gradeLevels" = ARRAY["gradeLevel"]
WHERE "gradeLevel" IS NOT NULL;

DROP INDEX IF EXISTS "study_groups_gradeLevel_idx";
ALTER TABLE "study_groups" DROP COLUMN "gradeLevel";
