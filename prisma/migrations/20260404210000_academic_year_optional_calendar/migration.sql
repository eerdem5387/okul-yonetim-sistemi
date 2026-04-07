-- Taslak akademik yıl: yalnızca ad; takvim alanları sonra doldurulur.
ALTER TABLE "academic_years" ALTER COLUMN "startDate" DROP NOT NULL;
ALTER TABLE "academic_years" ALTER COLUMN "endDate" DROP NOT NULL;
