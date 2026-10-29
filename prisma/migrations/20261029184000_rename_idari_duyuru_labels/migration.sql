-- Seed / mevcut şablon başlığını görünen ada hizala
UPDATE "comms_templates"
SET
  "title" = 'Genel idari duyuru',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'seed_pers_duyuru'
   OR "title" ILIKE 'genel personel duyurusu';
