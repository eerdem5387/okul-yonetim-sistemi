-- Faaliyet yönetimi: her faaliyet (activity_events) bir akademik yıla bağlanır.
-- Aktif yılın faaliyetleri ana ekranda, geçmiş yıllarınkiler Arşiv'de görünür.
ALTER TABLE "activity_events" ADD COLUMN IF NOT EXISTS "academicYearId" TEXT;

CREATE INDEX IF NOT EXISTS "activity_events_academicYearId_idx" ON "activity_events"("academicYearId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_events_academicYearId_fkey'
  ) THEN
    ALTER TABLE "activity_events"
      ADD CONSTRAINT "activity_events_academicYearId_fkey"
      FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Geri doldurma (backfill) — kural src/lib/activity-academic-year.ts ile aynı:
-- Faaliyet başlangıç tarihi, bitiş tarihi bu tarihten sonra olan İLK akademik yıla aittir
-- (yaz tatili ve okul açılışı öncesi günler yaklaşan yıla sayılır).
-- Hiçbir yılın bitişine düşmeyen (son yıldan sonraki) tarihler en son biten yıla bağlanır.
-- Kayıt yenileme dolgu kayıtları (parentActiveYearId dolu) ve tarihsiz taslak yıllar dikkate alınmaz.
UPDATE "activity_events" e
SET "academicYearId" = COALESCE(
  (
    SELECT ay."id" FROM "academic_years" ay
    WHERE ay."parentActiveYearId" IS NULL
      AND ay."endDate" IS NOT NULL
      AND e."startDate" < ay."endDate" + INTERVAL '1 day'
    ORDER BY ay."endDate" ASC
    LIMIT 1
  ),
  (
    SELECT ay."id" FROM "academic_years" ay
    WHERE ay."parentActiveYearId" IS NULL
      AND ay."endDate" IS NOT NULL
    ORDER BY ay."endDate" DESC
    LIMIT 1
  )
)
WHERE e."academicYearId" IS NULL;
