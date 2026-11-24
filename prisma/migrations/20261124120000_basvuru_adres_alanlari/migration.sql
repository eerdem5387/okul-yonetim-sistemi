-- Bursluluk başvurusu: ikamet adresi alanları; e-posta artık zorunlu değil.
ALTER TABLE "basvurular"
ADD COLUMN IF NOT EXISTS "adresIl" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "adresIlce" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "adresMahalle" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "adresDetay" TEXT NOT NULL DEFAULT '';

ALTER TABLE "basvurular" ALTER COLUMN "email" SET DEFAULT '';

-- Dönem: mevcut tüm kayıtlar geçen yılın (2026-2027) bursluluk sınavına aittir.
ALTER TABLE "basvurular" ADD COLUMN IF NOT EXISTS "donem" TEXT NOT NULL DEFAULT '2026-2027';
CREATE INDEX IF NOT EXISTS "basvurular_donem_idx" ON "basvurular"("donem");
