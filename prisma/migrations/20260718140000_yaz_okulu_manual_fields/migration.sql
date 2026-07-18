-- Recreate yaz okulu table with manual form fields
DROP TABLE IF EXISTS "yaz_okulu_basvurular";

CREATE TABLE "yaz_okulu_basvurular" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "ogrenciAd" TEXT NOT NULL,
    "ogrenciSoyad" TEXT NOT NULL,
    "okul" TEXT NOT NULL,
    "ogrenciSinifi" TEXT NOT NULL,
    "veliAd" TEXT NOT NULL,
    "veliSoyad" TEXT NOT NULL,
    "veliTelefon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactStatus" "ContactStatus" NOT NULL DEFAULT 'ILETISIME_GECILMEDI',
    "contactNote" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "lastContactedBy" TEXT,

    CONSTRAINT "yaz_okulu_basvurular_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "yaz_okulu_basvurular_externalId_key" ON "yaz_okulu_basvurular"("externalId");
CREATE INDEX "yaz_okulu_basvurular_externalId_idx" ON "yaz_okulu_basvurular"("externalId");
CREATE INDEX "yaz_okulu_basvurular_veliTelefon_idx" ON "yaz_okulu_basvurular"("veliTelefon");
CREATE INDEX "yaz_okulu_basvurular_createdAt_idx" ON "yaz_okulu_basvurular"("createdAt");
