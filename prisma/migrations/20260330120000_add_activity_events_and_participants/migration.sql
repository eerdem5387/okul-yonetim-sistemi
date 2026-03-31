-- Faaliyet yönetimi: activity_events + activity_participants (schema’da vardı, migration eksikti)

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "ActivityMainType" AS ENUM ('EGITIM', 'GEZI', 'GORSEL_SANATLAR', 'MUZIK', 'PROJE', 'SPOR', 'TURNUVA');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "LanguageLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ActivityVerificationStatus" AS ENUM ('IMZA_SURECINDE', 'ONAY_BEKLIYOR', 'ONAYLANDI');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "mainType" "ActivityMainType" NOT NULL,
    "subtype" TEXT,
    "certificateType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "outcome" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "organizerName" TEXT NOT NULL,
    "durationHours" INTEGER,
    "durationDays" INTEGER,
    "durationMonths" INTEGER,
    "durationYears" INTEGER,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "teacherId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_participants" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" INTEGER,
    "languageLevel" "LanguageLevel",
    "participationPhotoUrl" TEXT,
    "artworkDescription" TEXT,
    "tournamentPlacement" TEXT,
    "projectRole" TEXT,
    "extraDocumentUrl" TEXT,
    "verificationStatus" "ActivityVerificationStatus" NOT NULL DEFAULT 'IMZA_SURECINDE',
    "signedDocumentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_mainType_idx" ON "activity_events"("mainType");

-- CreateIndex
CREATE INDEX "activity_events_teacherId_idx" ON "activity_events"("teacherId");

-- CreateIndex
CREATE INDEX "activity_events_startDate_idx" ON "activity_events"("startDate");

-- CreateIndex
CREATE INDEX "activity_events_createdAt_idx" ON "activity_events"("createdAt");

-- CreateIndex
CREATE INDEX "activity_participants_activityId_idx" ON "activity_participants"("activityId");

-- CreateIndex
CREATE INDEX "activity_participants_studentId_idx" ON "activity_participants"("studentId");

-- CreateIndex
CREATE INDEX "activity_participants_verificationStatus_idx" ON "activity_participants"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "activity_participants_activityId_studentId_key" ON "activity_participants"("activityId", "studentId");

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participants" ADD CONSTRAINT "activity_participants_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activity_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participants" ADD CONSTRAINT "activity_participants_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
