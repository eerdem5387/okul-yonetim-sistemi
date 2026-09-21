CREATE TABLE IF NOT EXISTS "schedule_courses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_courses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "schedule_courses_name_key" ON "schedule_courses"("name");
CREATE INDEX IF NOT EXISTS "schedule_courses_isActive_sortOrder_idx" ON "schedule_courses"("isActive", "sortOrder");
