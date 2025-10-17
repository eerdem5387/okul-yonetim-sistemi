/*
  Warnings:

  - Added the required column `grade` to the `students` table without a default value. This is not possible if the table is not empty.
  - Made the column `address` on table `students` required. This step will fail if there are existing NULL values in that column.
  - Made the column `parentEmail` on table `students` required. This step will fail if there are existing NULL values in that column.

*/
-- Add new columns first
ALTER TABLE "students" ADD COLUMN "grade" TEXT;
ALTER TABLE "students" ADD COLUMN "parent2Email" TEXT;
ALTER TABLE "students" ADD COLUMN "parent2Name" TEXT;
ALTER TABLE "students" ADD COLUMN "parent2Phone" TEXT;

-- Update existing records with default values
UPDATE "students" SET "grade" = '9. Sınıf' WHERE "grade" IS NULL;
UPDATE "students" SET "address" = 'Adres bilgisi girilmemiş' WHERE "address" IS NULL;
UPDATE "students" SET "parentEmail" = 'email@example.com' WHERE "parentEmail" IS NULL;

-- Make columns NOT NULL
ALTER TABLE "students" ALTER COLUMN "grade" SET NOT NULL;
ALTER TABLE "students" ALTER COLUMN "address" SET NOT NULL;
ALTER TABLE "students" ALTER COLUMN "parentEmail" SET NOT NULL;
