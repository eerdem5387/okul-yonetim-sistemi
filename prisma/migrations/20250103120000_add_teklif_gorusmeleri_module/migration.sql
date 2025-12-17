-- CreateEnum
CREATE TYPE "TeklifGorusmeDurumu" AS ENUM ('OLUMLU', 'OLUMSUZ', 'BELIRSIZ');

-- CreateTable
CREATE TABLE "teklif_gorusmeleri" (
    "id" TEXT NOT NULL,
    "ogrenciAdSoyad" TEXT NOT NULL,
    "okul" TEXT NOT NULL,
    "sinif" TEXT NOT NULL,
    "veliAdSoyad" TEXT NOT NULL,
    "veliTelefon" TEXT NOT NULL,
    "veliEmail" TEXT,
    "veliMeslek" TEXT,
    "veliAdres" TEXT,
    "teklifEdilenFiyat" DOUBLE PRECISION NOT NULL,
    "okulFiyati" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "teklif_gorusmeleri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teklif_gorusme_kayitlari" (
    "id" TEXT NOT NULL,
    "teklifGorusmesiId" TEXT NOT NULL,
    "gorusmeTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gorusmeyiYapan" TEXT NOT NULL,
    "durum" "TeklifGorusmeDurumu" NOT NULL,
    "durumNotu" TEXT,
    "genelNot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teklif_gorusme_kayitlari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teklif_gorusmeleri_ogrenciAdSoyad_idx" ON "teklif_gorusmeleri"("ogrenciAdSoyad");

-- CreateIndex
CREATE INDEX "teklif_gorusmeleri_okul_idx" ON "teklif_gorusmeleri"("okul");

-- CreateIndex
CREATE INDEX "teklif_gorusmeleri_sinif_idx" ON "teklif_gorusmeleri"("sinif");

-- CreateIndex
CREATE INDEX "teklif_gorusmeleri_createdAt_idx" ON "teklif_gorusmeleri"("createdAt");

-- CreateIndex
CREATE INDEX "teklif_gorusme_kayitlari_teklifGorusmesiId_idx" ON "teklif_gorusme_kayitlari"("teklifGorusmesiId");

-- CreateIndex
CREATE INDEX "teklif_gorusme_kayitlari_gorusmeTarihi_idx" ON "teklif_gorusme_kayitlari"("gorusmeTarihi");

-- CreateIndex
CREATE INDEX "teklif_gorusme_kayitlari_durum_idx" ON "teklif_gorusme_kayitlari"("durum");

-- AddForeignKey
ALTER TABLE "teklif_gorusme_kayitlari" ADD CONSTRAINT "teklif_gorusme_kayitlari_teklifGorusmesiId_fkey" FOREIGN KEY ("teklifGorusmesiId") REFERENCES "teklif_gorusmeleri"("id") ON DELETE CASCADE ON UPDATE CASCADE;
