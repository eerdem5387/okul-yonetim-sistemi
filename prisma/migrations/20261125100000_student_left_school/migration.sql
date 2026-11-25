-- Okuldan ayrılan öğrenciler: silmek yerine işaretlenir, geçmiş kayıtlar korunur.
ALTER TABLE "students"
ADD COLUMN IF NOT EXISTS "leftAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "leftReason" TEXT,
ADD COLUMN IF NOT EXISTS "leftBy" TEXT,
ADD COLUMN IF NOT EXISTS "leftClassId" TEXT,
ADD COLUMN IF NOT EXISTS "leftClassName" TEXT;

CREATE INDEX IF NOT EXISTS "students_leftAt_idx" ON "students"("leftAt");
