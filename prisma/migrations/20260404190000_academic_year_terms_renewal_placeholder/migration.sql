-- AlterTable
ALTER TABLE "academic_years" ADD COLUMN     "term1Start" TIMESTAMP(3),
ADD COLUMN     "term1End" TIMESTAMP(3),
ADD COLUMN     "term2Start" TIMESTAMP(3),
ADD COLUMN     "term2End" TIMESTAMP(3),
ADD COLUMN     "parentActiveYearId" TEXT;

-- CreateIndex
CREATE INDEX "academic_years_parentActiveYearId_idx" ON "academic_years"("parentActiveYearId");

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_parentActiveYearId_fkey" FOREIGN KEY ("parentActiveYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
