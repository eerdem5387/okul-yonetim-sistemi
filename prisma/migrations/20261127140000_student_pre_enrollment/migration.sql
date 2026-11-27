-- Sonraki akademik yıl için ön kaydı olan (henüz okulda olmayan) öğrenciler
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "preEnrollment" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "students_preEnrollment_idx" ON "students"("preEnrollment");
