-- Bursluluk başvurusunda seçilen sınav oturumu
ALTER TABLE "basvurular" ADD COLUMN IF NOT EXISTS "oturum" TEXT NOT NULL DEFAULT '';
