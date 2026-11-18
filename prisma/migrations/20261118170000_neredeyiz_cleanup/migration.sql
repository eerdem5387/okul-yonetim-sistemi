-- Neredeyiz? sadeleştirme
-- 1) Kullanılmayan alanlar: konu hafta numaraları ve tahmini süre (planlanan tarihlerle tekrar),
--    ilerleme kaydındaki plannedDate (konudaki planlanan tarihin tekrarı).
ALTER TABLE "topics" DROP COLUMN IF EXISTS "plannedStartWeek";
ALTER TABLE "topics" DROP COLUMN IF EXISTS "plannedEndWeek";
ALTER TABLE "topics" DROP COLUMN IF EXISTS "estimatedDuration";
ALTER TABLE "progress" DROP COLUMN IF EXISTS "plannedDate";

-- 2) Ekranı olmayan alt konu tablosu
DROP TABLE IF EXISTS "sub_topics";

-- 3) Konu başına tek ilerleme kaydı. Olası tekrarlarda en son güncellenen kayıt kalır.
DELETE FROM "progress" p
USING "progress" q
WHERE p."topicId" = q."topicId"
  AND (p."updatedAt" < q."updatedAt" OR (p."updatedAt" = q."updatedAt" AND p."id" < q."id"));

DROP INDEX IF EXISTS "progress_topicId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "progress_topicId_key" ON "progress"("topicId");
