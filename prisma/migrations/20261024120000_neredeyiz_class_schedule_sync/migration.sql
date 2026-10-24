-- Neredeyiz ↔ sınıf / ders programı entegrasyonu:
-- 1) Subject.classId zorunlu (backfill + orphan sınıflar)
-- 2) Schedule.subjectId FK
-- 3) unique(classId, name)

-- --- Subject.classId backfill (grade + section + academic year) ---
UPDATE "subjects" s
SET "classId" = c.id
FROM "classes" c
WHERE s."classId" IS NULL
  AND c."academicYearId" = s."academicYearId"
  AND c.grade = s.grade
  AND (
    (s.section IS NULL AND c.section IS NOT NULL)
    OR (s.section IS NOT NULL AND c.section = s.section)
  );

-- Aynı yıl + grade, section eşleşmezse ilk sınıf
UPDATE "subjects" s
SET "classId" = sub.id
FROM (
  SELECT DISTINCT ON (c."academicYearId", c.grade)
    c.id,
    c."academicYearId",
    c.grade
  FROM "classes" c
  ORDER BY c."academicYearId", c.grade, c.section ASC
) sub
WHERE s."classId" IS NULL
  AND s."academicYearId" = sub."academicYearId"
  AND s.grade = sub.grade;

-- Hâlâ classId yoksa subject verisinden sınıf oluştur
INSERT INTO "classes" (
  id,
  name,
  grade,
  section,
  "academicYearId",
  "saturdayEnabled",
  "saturdayMode",
  "createdAt",
  "updatedAt"
)
SELECT DISTINCT ON (
  s."academicYearId",
  s.grade,
  COALESCE(NULLIF(TRIM(s.section), ''), 'X')
)
  md5(
    s."academicYearId" || ':' || s.grade::text || ':' || COALESCE(NULLIF(TRIM(s.section), ''), 'X')
  ),
  (s.grade::text || '/' || COALESCE(NULLIF(TRIM(s.section), ''), 'X')),
  s.grade,
  COALESCE(NULLIF(TRIM(s.section), ''), 'X'),
  s."academicYearId",
  false,
  'FULL'::"ClassSaturdayMode",
  NOW(),
  NOW()
FROM "subjects" s
WHERE s."classId" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "classes" c
    WHERE c."academicYearId" = s."academicYearId"
      AND c.grade = s.grade
      AND c.section = COALESCE(NULLIF(TRIM(s.section), ''), 'X')
  )
ORDER BY
  s."academicYearId",
  s.grade,
  COALESCE(NULLIF(TRIM(s.section), ''), 'X');

-- Yeni oluşturulan sınıflara bağla
UPDATE "subjects" s
SET "classId" = c.id
FROM "classes" c
WHERE s."classId" IS NULL
  AND c."academicYearId" = s."academicYearId"
  AND c.grade = s.grade
  AND c.section = COALESCE(NULLIF(TRIM(s.section), ''), 'X');

-- Son çare: aynı akademik yıldaki herhangi bir sınıf
UPDATE "subjects" s
SET "classId" = sub.id
FROM (
  SELECT DISTINCT ON (c."academicYearId")
    c.id,
    c."academicYearId"
  FROM "classes" c
  ORDER BY c."academicYearId", c.grade ASC, c.section ASC
) sub
WHERE s."classId" IS NULL
  AND s."academicYearId" = sub."academicYearId";

-- classId hâlâ null olan subject yoksa NOT NULL uygula
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "subjects" WHERE "classId" IS NULL) THEN
    RAISE EXCEPTION 'neredeyiz migration: subjects.classId backfill incomplete';
  END IF;
END $$;

-- Eski FK'yi kaldır (SetNull) ve yeniden oluştur (Cascade + NOT NULL)
ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "subjects_classId_fkey";
ALTER TABLE "subjects" ALTER COLUMN "classId" SET NOT NULL;
ALTER TABLE "subjects"
  ADD CONSTRAINT "subjects_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Aynı sınıf + aynı ders adı tekrarlarını ayır (unique öncesi)
UPDATE "subjects" s
SET name = s.name || ' (' || LEFT(s.id, 6) || ')'
FROM (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "classId", LOWER(TRIM(name))
           ORDER BY "createdAt" ASC, id ASC
         ) AS rn
  FROM "subjects"
) d
WHERE s.id = d.id
  AND d.rn > 1;

-- classId + name unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subjects_classId_name_key'
  ) THEN
    ALTER TABLE "subjects"
      ADD CONSTRAINT "subjects_classId_name_key" UNIQUE ("classId", "name");
  END IF;
END $$;

-- Schedule.subjectId
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;

-- Backfill: aynı class + isim
UPDATE "schedules" sch
SET "subjectId" = sub.id
FROM "subjects" sub
WHERE sch."subjectId" IS NULL
  AND sub."classId" = sch."classId"
  AND LOWER(TRIM(sub.name)) = LOWER(TRIM(sch."subjectName"));

CREATE INDEX IF NOT EXISTS "schedules_subjectId_idx" ON "schedules"("subjectId");

ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "schedules_subjectId_fkey";
ALTER TABLE "schedules"
  ADD CONSTRAINT "schedules_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "subjects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
