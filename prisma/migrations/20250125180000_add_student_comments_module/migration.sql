-- CreateEnum: CommentType
CREATE TYPE "CommentType" AS ENUM ('ACADEMIC', 'BEHAVIORAL', 'GENERAL');

-- CreateTable: student_comments (Öğrenci Görüşleri)
CREATE TABLE "student_comments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "commentType" "CommentType" NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "isPositive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_comments_studentId_idx" ON "student_comments"("studentId");

-- CreateIndex
CREATE INDEX "student_comments_staffId_idx" ON "student_comments"("staffId");

-- CreateIndex
CREATE INDEX "student_comments_commentType_idx" ON "student_comments"("commentType");

-- CreateIndex
CREATE INDEX "student_comments_createdAt_idx" ON "student_comments"("createdAt");

-- AddForeignKey
ALTER TABLE "student_comments" ADD CONSTRAINT "student_comments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_comments" ADD CONSTRAINT "student_comments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

