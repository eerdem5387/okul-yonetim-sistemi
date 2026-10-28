ALTER TABLE "conversations" ADD COLUMN "membersCanPost" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "conversations" ADD COLUMN "createdByStaffId" TEXT;
ALTER TABLE "conversations" ADD COLUMN "studentId" TEXT;
ALTER TABLE "conversations" ADD COLUMN "classId" TEXT;
ALTER TABLE "conversations" ADD COLUMN "branchId" TEXT;
ALTER TABLE "conversations" ADD COLUMN "systemKey" TEXT;

CREATE UNIQUE INDEX "conversations_systemKey_key" ON "conversations"("systemKey");
CREATE INDEX "conversations_studentId_idx" ON "conversations"("studentId");
CREATE INDEX "conversations_classId_idx" ON "conversations"("classId");
CREATE INDEX "conversations_branchId_idx" ON "conversations"("branchId");
CREATE INDEX "conversations_createdByStaffId_idx" ON "conversations"("createdByStaffId");

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
