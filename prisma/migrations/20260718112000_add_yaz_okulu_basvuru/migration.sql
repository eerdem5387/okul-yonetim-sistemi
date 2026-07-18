-- CreateTable
CREATE TABLE "yaz_okulu_basvurular" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "ogrenciAdSoyad" TEXT NOT NULL,
    "ogrenciSinifi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactStatus" "ContactStatus" NOT NULL DEFAULT 'ILETISIME_GECILMEDI',
    "contactNote" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "lastContactedBy" TEXT,

    CONSTRAINT "yaz_okulu_basvurular_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "yaz_okulu_basvurular_externalId_key" ON "yaz_okulu_basvurular"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "yaz_okulu_basvurular_studentId_key" ON "yaz_okulu_basvurular"("studentId");

-- CreateIndex
CREATE INDEX "yaz_okulu_basvurular_externalId_idx" ON "yaz_okulu_basvurular"("externalId");

-- CreateIndex
CREATE INDEX "yaz_okulu_basvurular_studentId_idx" ON "yaz_okulu_basvurular"("studentId");

-- CreateIndex
CREATE INDEX "yaz_okulu_basvurular_createdAt_idx" ON "yaz_okulu_basvurular"("createdAt");
