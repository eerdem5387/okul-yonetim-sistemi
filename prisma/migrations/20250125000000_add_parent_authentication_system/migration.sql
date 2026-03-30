-- CreateEnum: ParentRelation (idempotent)
DO $$ BEGIN
    CREATE TYPE "ParentRelation" AS ENUM ('ANNE', 'BABA', 'VASI');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: parents (Öğrenci TC bazlı veli hesapları)
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "studentTcNumber" TEXT NOT NULL,
    "password" TEXT,
    "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: parent_students (Veli bilgileri ve ilişkileri)
CREATE TABLE "parent_students" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relation" "ParentRelation" NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentTcNumber" TEXT NOT NULL,
    "parentPhone" TEXT,
    "parentEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parents_studentTcNumber_key" ON "parents"("studentTcNumber");

-- CreateIndex
CREATE INDEX "parents_studentTcNumber_idx" ON "parents"("studentTcNumber");

-- CreateIndex
CREATE INDEX "parents_isActive_idx" ON "parents"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "parent_students_parentId_studentId_relation_key" ON "parent_students"("parentId", "studentId", "relation");

-- CreateIndex
CREATE INDEX "parent_students_parentId_idx" ON "parent_students"("parentId");

-- CreateIndex
CREATE INDEX "parent_students_studentId_idx" ON "parent_students"("studentId");

-- CreateIndex
CREATE INDEX "parent_students_parentTcNumber_idx" ON "parent_students"("parentTcNumber");

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

