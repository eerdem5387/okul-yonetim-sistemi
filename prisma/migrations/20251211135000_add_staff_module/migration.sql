-- CreateEnum
CREATE TYPE "StaffDepartment" AS ENUM ('OGRETMEN', 'OGRENCI_ISLERI', 'MUDUR', 'MUDUR_YARDIMCISI', 'REHBERLIK', 'MUHASEBE', 'GUZEL_SANATLAR', 'SPOR', 'KUTUPHANE', 'TEKNIK', 'TEMIZLIK', 'GUVENLIK', 'DIGER');

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "tcNumber" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "department" "StaffDepartment" NOT NULL,
    "position" TEXT,
    "subject" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hireDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_tcNumber_key" ON "staff"("tcNumber");

-- CreateIndex
CREATE INDEX "staff_tcNumber_idx" ON "staff"("tcNumber");

-- CreateIndex
CREATE INDEX "staff_department_idx" ON "staff"("department");

-- CreateIndex
CREATE INDEX "staff_isActive_idx" ON "staff"("isActive");

-- CreateIndex
CREATE INDEX "staff_firstName_lastName_idx" ON "staff"("firstName", "lastName");

