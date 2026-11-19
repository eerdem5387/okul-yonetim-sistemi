-- Neredeyiz? haftalık takip yapısı
-- Neredeyiz'deki ders/konu/ilerleme verisi deneme amaçlıydı (kullanıcı teyidi); ilerleme kayıtları taşınmaz.

-- 1) Konu planı: tarih yerine ders haftası numarası; tahmini süre kaldırılır
ALTER TABLE "topics" DROP COLUMN IF EXISTS "estimatedDuration";
DROP INDEX IF EXISTS "topics_plannedStartDate_idx";
DROP INDEX IF EXISTS "topics_plannedEndDate_idx";
ALTER TABLE "topics" DROP COLUMN IF EXISTS "plannedStartDate";
ALTER TABLE "topics" DROP COLUMN IF EXISTS "plannedEndDate";
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "plannedStartWeek" INTEGER;
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "plannedEndWeek" INTEGER;
CREATE INDEX IF NOT EXISTS "topics_plannedEndWeek_idx" ON "topics"("plannedEndWeek");

-- 2) Ekranı olmayan alt konu tablosu
DROP TABLE IF EXISTS "sub_topics";

-- 3) Onaylı ilerleme yerine konu tamamlama (onay yok, gecikmede sebep)
DROP TABLE IF EXISTS "progress";
DROP TYPE IF EXISTS "ProgressStatus";

CREATE TYPE "NeredeyizLateReason" AS ENUM ('IZIN', 'RAPOR', 'ETKINLIK', 'PROGRAM_DEGISIKLIGI', 'DIGER');

CREATE TABLE "topic_completions" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "completedBy" TEXT,
    "lateReason" "NeredeyizLateReason",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "topic_completions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "topic_completions_topicId_key" ON "topic_completions"("topicId");
CREATE INDEX "topic_completions_completedAt_idx" ON "topic_completions"("completedAt");
CREATE INDEX "topic_completions_completedBy_idx" ON "topic_completions"("completedBy");
ALTER TABLE "topic_completions" ADD CONSTRAINT "topic_completions_topicId_fkey"
    FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Rehberlik notları
CREATE TABLE "neredeyiz_notes" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topicId" TEXT,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "neredeyiz_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "neredeyiz_notes_subjectId_createdAt_idx" ON "neredeyiz_notes"("subjectId", "createdAt");
ALTER TABLE "neredeyiz_notes" ADD CONSTRAINT "neredeyiz_notes_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "neredeyiz_notes" ADD CONSTRAINT "neredeyiz_notes_topicId_fkey"
    FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Ders programı değişiklik kaydı (öğretmene bildirim + önce/sonra)
CREATE TYPE "ScheduleChangeKind" AS ENUM ('ADDED', 'REMOVED', 'MOVED');
CREATE TABLE "schedule_changes" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "kind" "ScheduleChangeKind" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "changedBy" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "schedule_changes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "schedule_changes_teacherId_createdAt_idx" ON "schedule_changes"("teacherId", "createdAt");

-- 6) Yeni bildirim türleri
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PROGRAM_DEGISTI';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'HATIRLATMA';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REHBERLIK_NOTU';
