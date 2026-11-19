-- Yıl devri her akademik yıl için en fazla bir kez çalışsın.
ALTER TABLE "academic_years" ADD COLUMN "rolloverAppliedAt" TIMESTAMP(3);

-- Aktif yıl ve ondan önce başlayan yıllar "geçilmiş" sayılır: bunlara tekrar geçişte devir çalışmaz.
UPDATE "academic_years" AS y
SET "rolloverAppliedAt" = NOW()
WHERE EXISTS (
  SELECT 1 FROM "academic_years" a
  WHERE a."isActive" = true
    AND (y."id" = a."id" OR (y."startDate" IS NOT NULL AND a."startDate" IS NOT NULL AND y."startDate" <= a."startDate"))
);
