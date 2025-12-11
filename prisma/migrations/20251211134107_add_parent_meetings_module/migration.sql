-- CreateTable
CREATE TABLE "parent_meetings" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL,
    "counselorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "parent_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parent_meetings_studentId_idx" ON "parent_meetings"("studentId");

-- CreateIndex
CREATE INDEX "parent_meetings_meetingDate_idx" ON "parent_meetings"("meetingDate");

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "parent_meetings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

