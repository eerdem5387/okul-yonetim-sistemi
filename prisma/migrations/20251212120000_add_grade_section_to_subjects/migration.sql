-- AlterTable
-- Önce nullable olarak ekle
ALTER TABLE "subjects" ADD COLUMN "grade" INTEGER;
ALTER TABLE "subjects" ADD COLUMN "section" TEXT;

-- Mevcut derslere varsayılan sınıf atama (9. sınıf)
UPDATE "subjects" SET "grade" = 9 WHERE "grade" IS NULL;

-- Şimdi NOT NULL constraint ekle
ALTER TABLE "subjects" ALTER COLUMN "grade" SET NOT NULL;
ALTER TABLE "subjects" ALTER COLUMN "grade" SET DEFAULT 9;

-- Unique constraint ekle
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_academicYearId_name_grade_section_key" UNIQUE ("academicYearId", "name", "grade", "section");

-- Index'ler ekle
CREATE INDEX "subjects_academicYearId_grade_idx" ON "subjects"("academicYearId", "grade");
CREATE INDEX "subjects_academicYearId_grade_section_idx" ON "subjects"("academicYearId", "grade", "section");
CREATE INDEX "subjects_name_grade_idx" ON "subjects"("name", "grade");

-- Eski index'i kaldır (artık grade ile birlikte kullanılacak)
DROP INDEX IF EXISTS "subjects_name_idx";

