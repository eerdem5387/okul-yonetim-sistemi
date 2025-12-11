-- AlterTable
-- Önce nullable olarak ekle (IF NOT EXISTS ile güvenli)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'grade') THEN
        ALTER TABLE "subjects" ADD COLUMN "grade" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'section') THEN
        ALTER TABLE "subjects" ADD COLUMN "section" TEXT;
    END IF;
END $$;

-- Mevcut derslere varsayılan sınıf atama (9. sınıf)
UPDATE "subjects" SET "grade" = 9 WHERE "grade" IS NULL;

-- Şimdi NOT NULL constraint ekle
ALTER TABLE "subjects" ALTER COLUMN "grade" SET NOT NULL;
ALTER TABLE "subjects" ALTER COLUMN "grade" SET DEFAULT 9;

-- Unique constraint ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subjects_academicYearId_name_grade_section_key'
    ) THEN
        ALTER TABLE "subjects" ADD CONSTRAINT "subjects_academicYearId_name_grade_section_key" 
        UNIQUE ("academicYearId", "name", "grade", "section");
    END IF;
END $$;

-- Index'ler ekle (eğer yoksa)
CREATE INDEX IF NOT EXISTS "subjects_academicYearId_grade_idx" ON "subjects"("academicYearId", "grade");
CREATE INDEX IF NOT EXISTS "subjects_academicYearId_grade_section_idx" ON "subjects"("academicYearId", "grade", "section");
CREATE INDEX IF NOT EXISTS "subjects_name_grade_idx" ON "subjects"("name", "grade");

-- Eski index'i kaldır (artık grade ile birlikte kullanılacak)
DROP INDEX IF EXISTS "subjects_name_idx";

