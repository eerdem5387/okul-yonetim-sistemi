-- İç haberleşme v2: geri çekme izi, hatırlatma, talep karar takibi, sohbet okundu, veli push cihazları.
ALTER TYPE "StaffCommsRequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ILETISIM';

ALTER TABLE "official_notices"
ADD COLUMN IF NOT EXISTS "remindedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "remindCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletedByStaffId" TEXT;

ALTER TABLE "staff_comms_requests"
ADD COLUMN IF NOT EXISTS "decisionNote" TEXT,
ADD COLUMN IF NOT EXISTS "viewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "decisionSeenAt" TIMESTAMP(3);

-- Mevcut kararlar "görüldü" sayılsın; eski talepler rozet üretmesin.
UPDATE "staff_comms_requests" SET "decisionSeenAt" = "decidedAt" WHERE "decidedAt" IS NOT NULL AND "decisionSeenAt" IS NULL;

ALTER TABLE "class_group_messages"
ADD COLUMN IF NOT EXISTS "attachmentName" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentType" TEXT;

CREATE TABLE IF NOT EXISTS "class_group_reads" (
    "id" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "staffId" TEXT,
    "parentId" TEXT,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "class_group_reads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "class_group_reads_classGroupId_staffId_key" ON "class_group_reads"("classGroupId", "staffId");
CREATE UNIQUE INDEX IF NOT EXISTS "class_group_reads_classGroupId_parentId_key" ON "class_group_reads"("classGroupId", "parentId");
CREATE INDEX IF NOT EXISTS "class_group_reads_staffId_idx" ON "class_group_reads"("staffId");
CREATE INDEX IF NOT EXISTS "class_group_reads_parentId_idx" ON "class_group_reads"("parentId");
DO $$ BEGIN
  ALTER TABLE "class_group_reads" ADD CONSTRAINT "class_group_reads_classGroupId_fkey"
    FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "parent_push_devices" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "parent_push_devices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "parent_push_devices_token_key" ON "parent_push_devices"("token");
CREATE INDEX IF NOT EXISTS "parent_push_devices_parentId_idx" ON "parent_push_devices"("parentId");
DO $$ BEGIN
  ALTER TABLE "parent_push_devices" ADD CONSTRAINT "parent_push_devices_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "official_notices_deletedAt_idx" ON "official_notices"("deletedAt");
