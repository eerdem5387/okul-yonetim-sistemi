-- Mevcut resmi ileti şablonlarında sabit hitabı alıcı ad soyad yer tutucusuna çevir
UPDATE "comms_templates"
SET
  "body" = replace("body", 'Sayın Personelimiz', 'Sayın {{ALICI_AD_SOYAD}}'),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "body" LIKE '%Sayın Personelimiz%';

UPDATE "comms_templates"
SET
  "body" = replace("body", 'Sayın Öğretmenimiz', 'Sayın {{ALICI_AD_SOYAD}}'),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "body" LIKE '%Sayın Öğretmenimiz%';
