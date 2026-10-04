-- CreateTable
CREATE TABLE "grade_etut_exams" (
    "id" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Deneme Sınavı',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_etut_exams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grade_etut_exams_grade_dayOfWeek_idx" ON "grade_etut_exams"("grade", "dayOfWeek");

-- CreateIndex
CREATE INDEX "grade_etut_exams_dayOfWeek_startTime_idx" ON "grade_etut_exams"("dayOfWeek", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "grade_etut_exams_grade_dayOfWeek_startTime_endTime_key" ON "grade_etut_exams"("grade", "dayOfWeek", "startTime", "endTime");
