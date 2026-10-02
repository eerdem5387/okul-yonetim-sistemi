-- AlterTable: pedagojik yaklaşım ve referanslar kaldırılır, çalışma geçmişi eklenir
-- clubsAndActivities TEXT -> JSONB (string[])

ALTER TABLE "hr_job_applications" ADD COLUMN "workHistory" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "hr_job_applications" DROP COLUMN "pedagogicalApproach";
ALTER TABLE "hr_job_applications" DROP COLUMN "references";

ALTER TABLE "hr_job_applications"
  ALTER COLUMN "clubsAndActivities" TYPE JSONB
  USING (
    CASE
      WHEN "clubsAndActivities" IS NULL OR btrim("clubsAndActivities") = '' THEN '[]'::jsonb
      ELSE jsonb_build_array("clubsAndActivities")
    END
  );

ALTER TABLE "hr_job_applications" ALTER COLUMN "clubsAndActivities" SET DEFAULT '[]'::jsonb;
