-- CreateEnum: ExamType (idempotent)
DO $$ BEGIN
    CREATE TYPE "ExamType" AS ENUM ('YKS', 'LGS', 'KPSS', 'DENEME', 'DIGER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: exams (Sınavlar)
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "examType" "ExamType" NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "grade" INTEGER,
    "description" TEXT,
    "classId" TEXT,
    "subjects" JSONB,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable: exam_results (Sınav Sonuçları)
CREATE TABLE "exam_results" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "totalScore" DOUBLE PRECISION,
    "ranking" INTEGER,
    "percentile" DOUBLE PRECISION,
    "notes" TEXT,
    "enteredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exams_createdById_idx" ON "exams"("createdById");

-- CreateIndex
CREATE INDEX "exams_grade_idx" ON "exams"("grade");

-- CreateIndex
CREATE INDEX "exams_classId_idx" ON "exams"("classId");

-- CreateIndex
CREATE INDEX "exams_examType_idx" ON "exams"("examType");

-- CreateIndex
CREATE INDEX "exams_examDate_idx" ON "exams"("examDate");

-- CreateIndex
CREATE UNIQUE INDEX "exam_results_examId_studentId_key" ON "exam_results"("examId", "studentId");

-- CreateIndex
CREATE INDEX "exam_results_examId_idx" ON "exam_results"("examId");

-- CreateIndex
CREATE INDEX "exam_results_studentId_idx" ON "exam_results"("studentId");

-- CreateIndex
CREATE INDEX "exam_results_totalScore_idx" ON "exam_results"("totalScore");

-- CreateIndex
CREATE INDEX "exam_results_ranking_idx" ON "exam_results"("ranking");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

