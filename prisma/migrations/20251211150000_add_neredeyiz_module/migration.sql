-- CreateEnum
CREATE TYPE "DisruptionType" AS ENUM ('PLANLI_OKUL', 'PLANDISI_DOGAL', 'OGRETMEN_KAYNAKLI');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('RESMI_TATIL', 'YARILYIL_TATILI', 'ARA_TATIL', 'DIGER');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('PLANLANDI', 'DEVAM_EDIYOR', 'TAMAMLANDI', 'ERTELENDI');

-- CreateTable
CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_assignments" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "plannedStartWeek" INTEGER,
    "plannedEndWeek" INTEGER,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "estimatedDuration" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_topics" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HolidayType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disruptions" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "type" "DisruptionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "affectedSubjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "disruptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'PLANLANDI',
    "plannedDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "reportedBy" TEXT,
    "markedBy" TEXT,
    "markedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_years_isActive_idx" ON "academic_years"("isActive");

-- CreateIndex
CREATE INDEX "academic_years_startDate_endDate_idx" ON "academic_years"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "subjects_academicYearId_idx" ON "subjects"("academicYearId");

-- CreateIndex
CREATE INDEX "subjects_name_idx" ON "subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subject_assignments_subjectId_staffId_key" ON "subject_assignments"("subjectId", "staffId");

-- CreateIndex
CREATE INDEX "subject_assignments_subjectId_idx" ON "subject_assignments"("subjectId");

-- CreateIndex
CREATE INDEX "subject_assignments_staffId_idx" ON "subject_assignments"("staffId");

-- CreateIndex
CREATE INDEX "units_subjectId_idx" ON "units"("subjectId");

-- CreateIndex
CREATE INDEX "units_subjectId_order_idx" ON "units"("subjectId", "order");

-- CreateIndex
CREATE INDEX "topics_unitId_idx" ON "topics"("unitId");

-- CreateIndex
CREATE INDEX "topics_unitId_order_idx" ON "topics"("unitId", "order");

-- CreateIndex
CREATE INDEX "topics_plannedStartDate_idx" ON "topics"("plannedStartDate");

-- CreateIndex
CREATE INDEX "topics_plannedEndDate_idx" ON "topics"("plannedEndDate");

-- CreateIndex
CREATE INDEX "sub_topics_topicId_idx" ON "sub_topics"("topicId");

-- CreateIndex
CREATE INDEX "sub_topics_topicId_order_idx" ON "sub_topics"("topicId", "order");

-- CreateIndex
CREATE INDEX "holidays_academicYearId_idx" ON "holidays"("academicYearId");

-- CreateIndex
CREATE INDEX "holidays_startDate_endDate_idx" ON "holidays"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "holidays_type_idx" ON "holidays"("type");

-- CreateIndex
CREATE INDEX "disruptions_academicYearId_idx" ON "disruptions"("academicYearId");

-- CreateIndex
CREATE INDEX "disruptions_startDate_endDate_idx" ON "disruptions"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "disruptions_type_idx" ON "disruptions"("type");

-- CreateIndex
CREATE INDEX "progress_topicId_idx" ON "progress"("topicId");

-- CreateIndex
CREATE INDEX "progress_status_idx" ON "progress"("status");

-- CreateIndex
CREATE INDEX "progress_actualEndDate_idx" ON "progress"("actualEndDate");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_assignments" ADD CONSTRAINT "subject_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_assignments" ADD CONSTRAINT "subject_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_topics" ADD CONSTRAINT "sub_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disruptions" ADD CONSTRAINT "disruptions_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

