ALTER TABLE "activity_participants"
ADD COLUMN "signedCurriculumUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
