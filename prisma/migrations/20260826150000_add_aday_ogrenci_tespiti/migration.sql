-- CreateEnum
CREATE TYPE "AdayOgrenciTespitDurumu" AS ENUM ('OLUMLU', 'OLUMSUZ', 'BELIRSIZ');

-- CreateTable
CREATE TABLE "aday_ogrenci_tespitleri" (
    "id" TEXT NOT NULL,
    "ogrenciAdSoyad" TEXT NOT NULL,
    "okul" TEXT NOT NULL,
    "sinif" TEXT NOT NULL,
    "veliAdSoyad" TEXT NOT NULL,
    "veliTelefon" TEXT NOT NULL,
    "veliMeslek" TEXT,
    "referansAdSoyad" TEXT NOT NULL,
    "referansTelefon" TEXT NOT NULL,
    "referansKanali" TEXT NOT NULL,
    "referansNot" TEXT,
    "sonlandirildi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "aday_ogrenci_tespitleri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aday_ogrenci_tespit_kayitlari" (
    "id" TEXT NOT NULL,
    "adayOgrenciTespitiId" TEXT NOT NULL,
    "gorusmeTarihi" TIMESTAMP(3) NOT NULL,
    "gorusmeyiYapan" TEXT NOT NULL,
    "durum" "AdayOgrenciTespitDurumu" NOT NULL,
    "durumNotu" TEXT,
    "genelNot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aday_ogrenci_tespit_kayitlari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aday_ogrenci_tespitleri_ogrenciAdSoyad_idx" ON "aday_ogrenci_tespitleri"("ogrenciAdSoyad");

-- CreateIndex
CREATE INDEX "aday_ogrenci_tespitleri_okul_idx" ON "aday_ogrenci_tespitleri"("okul");

-- CreateIndex
CREATE INDEX "aday_ogrenci_tespitleri_sinif_idx" ON "aday_ogrenci_tespitleri"("sinif");

-- CreateIndex
CREATE INDEX "aday_ogrenci_tespitleri_createdAt_idx" ON "aday_ogrenci_tespitleri"("createdAt");

-- CreateIndex
CREATE INDEX "aday_ogrenci_tespitleri_sonlandirildi_idx" ON "aday_ogrenci_tespitleri"("sonlandirildi");

-- CreateIndex
CREATE INDEX "aday_ogrenci_tespit_kayitlari_adayOgrenciTespitiId_idx" ON "aday_ogrenci_tespit_kayitlari"("adayOgrenciTespitiId");

-- CreateIndex
CREATE INDEX "aday_ogrenci_tespit_kayitlari_gorusmeTarihi_idx" ON "aday_ogrenci_tespit_kayitlari"("gorusmeTarihi");

-- CreateIndex
CREATE INDEX "aday_ogrenci_tespit_kayitlari_durum_idx" ON "aday_ogrenci_tespit_kayitlari"("durum");

-- AddForeignKey
ALTER TABLE "aday_ogrenci_tespit_kayitlari" ADD CONSTRAINT "aday_ogrenci_tespit_kayitlari_adayOgrenciTespitiId_fkey" FOREIGN KEY ("adayOgrenciTespitiId") REFERENCES "aday_ogrenci_tespitleri"("id") ON DELETE CASCADE ON UPDATE CASCADE;
