-- Kullanıcı başına kenar menü sırası (web + mobil ortak)
CREATE TABLE IF NOT EXISTS "staff_nav_preferences" (
    "staffId" TEXT NOT NULL,
    "order" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_nav_preferences_pkey" PRIMARY KEY ("staffId")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_nav_preferences_staffId_fkey'
  ) THEN
    ALTER TABLE "staff_nav_preferences"
      ADD CONSTRAINT "staff_nav_preferences_staffId_fkey"
      FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
