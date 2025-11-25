-- Add branch column to synced applications
ALTER TABLE "basvurular"
ADD COLUMN "ogrenciSube" TEXT NOT NULL DEFAULT 'Belirtilmedi';

-- Normalize existing nullable address data
UPDATE "basvurular"
SET "babaIsAdresi" = ''
WHERE "babaIsAdresi" IS NULL;

UPDATE "basvurular"
SET "anneIsAdresi" = ''
WHERE "anneIsAdresi" IS NULL;

-- Enforce NOT NULL + default on address columns
ALTER TABLE "basvurular"
ALTER COLUMN "babaIsAdresi" SET NOT NULL,
ALTER COLUMN "babaIsAdresi" SET DEFAULT '',
ALTER COLUMN "anneIsAdresi" SET NOT NULL,
ALTER COLUMN "anneIsAdresi" SET DEFAULT '';

