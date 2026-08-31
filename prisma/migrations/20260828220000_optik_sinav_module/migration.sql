-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'CONFIGURED', 'READY_FOR_SCAN', 'SCANNING', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExamScanBatchStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "ExamScanMatchStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'MANUAL', 'LOW_CONFIDENCE');

-- AlterTable
ALTER TABLE "exams" ADD COLUMN "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "exams" ADD COLUMN "templateId" TEXT;
ALTER TABLE "exams" ADD COLUMN "definitionVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "exams" ADD COLUMN "lockedAt" TIMESTAMP(3);
ALTER TABLE "exams" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "exams" ADD COLUMN "expectedParticipantCount" INTEGER;
ALTER TABLE "exams" ADD COLUMN "scanTemplateId" TEXT;

-- AlterTable
ALTER TABLE "exam_results" ADD COLUMN "definitionVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "exam_results" ADD COLUMN "bookletVariant" TEXT;
ALTER TABLE "exam_results" ADD COLUMN "correctCount" INTEGER;
ALTER TABLE "exam_results" ADD COLUMN "wrongCount" INTEGER;
ALTER TABLE "exam_results" ADD COLUMN "blankCount" INTEGER;
ALTER TABLE "exam_results" ADD COLUMN "netScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "exam_outcomes" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "code" TEXT,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "learningOutcome" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_sections" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "questionStart" INTEGER NOT NULL,
    "questionEnd" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "sectionId" TEXT,
    "outcomeId" TEXT,
    "questionNo" INTEGER NOT NULL,
    "correctAnswer" TEXT,
    "bookletVariant" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_scan_templates" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "layoutJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_scan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_scan_batches" (
    "id" TEXT NOT NULL,
    "externalBatchId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "definitionVersion" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "ExamScanBatchStatus" NOT NULL DEFAULT 'PENDING',
    "operatorId" TEXT NOT NULL,
    "operatorNote" TEXT,
    "summaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_scan_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_scan_batch_items" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "tcNumber" TEXT,
    "studentNameRaw" TEXT,
    "studentId" TEXT,
    "bookletVariant" TEXT,
    "matchStatus" "ExamScanMatchStatus" NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "errorCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answersJson" JSONB NOT NULL,
    "examResultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_scan_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_result_answers" (
    "id" TEXT NOT NULL,
    "examResultId" TEXT NOT NULL,
    "questionId" TEXT,
    "questionNo" INTEGER NOT NULL,
    "givenAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "isBlank" BOOLEAN NOT NULL DEFAULT false,
    "isAmbiguous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_result_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_questions_examId_questionNo_bookletVariant_key" ON "exam_questions"("examId", "questionNo", "bookletVariant");
CREATE INDEX "exam_questions_examId_idx" ON "exam_questions"("examId");
CREATE INDEX "exam_questions_sectionId_idx" ON "exam_questions"("sectionId");
CREATE INDEX "exam_questions_outcomeId_idx" ON "exam_questions"("outcomeId");
CREATE INDEX "exam_outcomes_examId_idx" ON "exam_outcomes"("examId");
CREATE INDEX "exam_outcomes_examId_code_idx" ON "exam_outcomes"("examId", "code");
CREATE INDEX "exam_sections_examId_idx" ON "exam_sections"("examId");
CREATE UNIQUE INDEX "exam_scan_templates_templateKey_key" ON "exam_scan_templates"("templateKey");
CREATE UNIQUE INDEX "exam_scan_batches_externalBatchId_key" ON "exam_scan_batches"("externalBatchId");
CREATE INDEX "exam_scan_batches_examId_idx" ON "exam_scan_batches"("examId");
CREATE INDEX "exam_scan_batches_operatorId_idx" ON "exam_scan_batches"("operatorId");
CREATE INDEX "exam_scan_batches_status_idx" ON "exam_scan_batches"("status");
CREATE UNIQUE INDEX "exam_scan_batch_items_batchId_itemIndex_key" ON "exam_scan_batch_items"("batchId", "itemIndex");
CREATE UNIQUE INDEX "exam_scan_batch_items_examResultId_key" ON "exam_scan_batch_items"("examResultId");
CREATE INDEX "exam_scan_batch_items_batchId_idx" ON "exam_scan_batch_items"("batchId");
CREATE INDEX "exam_scan_batch_items_studentId_idx" ON "exam_scan_batch_items"("studentId");
CREATE INDEX "exam_scan_batch_items_tcNumber_idx" ON "exam_scan_batch_items"("tcNumber");
CREATE UNIQUE INDEX "exam_result_answers_examResultId_questionNo_key" ON "exam_result_answers"("examResultId", "questionNo");
CREATE INDEX "exam_result_answers_examResultId_idx" ON "exam_result_answers"("examResultId");
CREATE INDEX "exam_result_answers_questionId_idx" ON "exam_result_answers"("questionId");
CREATE INDEX "exams_status_idx" ON "exams"("status");
CREATE INDEX "exams_scanTemplateId_idx" ON "exams"("scanTemplateId");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_scanTemplateId_fkey" FOREIGN KEY ("scanTemplateId") REFERENCES "exam_scan_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_outcomes" ADD CONSTRAINT "exam_outcomes_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "exam_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "exam_outcomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_scan_batches" ADD CONSTRAINT "exam_scan_batches_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_scan_batches" ADD CONSTRAINT "exam_scan_batches_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_scan_batch_items" ADD CONSTRAINT "exam_scan_batch_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "exam_scan_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_scan_batch_items" ADD CONSTRAINT "exam_scan_batch_items_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_scan_batch_items" ADD CONSTRAINT "exam_scan_batch_items_examResultId_fkey" FOREIGN KEY ("examResultId") REFERENCES "exam_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_result_answers" ADD CONSTRAINT "exam_result_answers_examResultId_fkey" FOREIGN KEY ("examResultId") REFERENCES "exam_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_result_answers" ADD CONSTRAINT "exam_result_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "exam_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
