-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('ETKINLIK', 'GEZI', 'PROJE', 'SINAV', 'YARISMA', 'SEMINER', 'WORKSHOP', 'SPORT', 'SANAT', 'SOSYAL', 'DIL', 'BILIM', 'DEGER', 'DIGER');

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "organizer" TEXT,
    "duration" INTEGER,
    "participants" INTEGER,
    "outcome" TEXT,
    "evidence" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ib_viewers" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "organization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ib_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activities_studentId_idx" ON "activities"("studentId");

-- CreateIndex
CREATE INDEX "activities_activityDate_idx" ON "activities"("activityDate");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "activities"("type");

-- CreateIndex
CREATE INDEX "activities_isVerified_idx" ON "activities"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "ib_viewers_username_key" ON "ib_viewers"("username");

-- CreateIndex
CREATE INDEX "ib_viewers_username_idx" ON "ib_viewers"("username");

-- CreateIndex
CREATE INDEX "ib_viewers_isActive_idx" ON "ib_viewers"("isActive");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

