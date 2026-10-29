-- Drop old chat tables (data intentionally discarded)
DROP TABLE IF EXISTS "message_receipts" CASCADE;
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "conversation_participants" CASCADE;
DROP TABLE IF EXISTS "conversations" CASCADE;

DROP TYPE IF EXISTS "ConversationType";
DROP TYPE IF EXISTS "ParticipantRole";
DROP TYPE IF EXISTS "MessageType";

-- CreateEnum
CREATE TYPE "CommsTemplateKind" AS ENUM ('IHTAR', 'TALIMAT', 'PERSONEL_DUYURU', 'PERSONEL_TALEP', 'SINIF_DUYURU');
CREATE TYPE "OfficialNoticeType" AS ENUM ('IHTAR', 'TALIMAT', 'PERSONEL_DUYURU');
CREATE TYPE "StaffCommsRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ClassGroupMemberRole" AS ENUM ('COUNSELOR', 'TEACHER', 'PARENT');

-- CreateTable
CREATE TABLE "comms_templates" (
    "id" TEXT NOT NULL,
    "kind" "CommsTemplateKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comms_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "official_notices" (
    "id" TEXT NOT NULL,
    "type" "OfficialNoticeType" NOT NULL,
    "templateId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "senderStaffId" TEXT NOT NULL,
    "recipientStaffId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_notices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_comms_requests" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "requesterStaffId" TEXT NOT NULL,
    "status" "StaffCommsRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByStaffId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_comms_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_groups" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "counselorStaffId" TEXT,
    "createdByStaffId" TEXT,
    "parentsCanPost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_group_members" (
    "id" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "role" "ClassGroupMemberRole" NOT NULL,
    "staffId" TEXT,
    "parentId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_group_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_group_messages" (
    "id" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "senderStaffId" TEXT,
    "senderParentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_group_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_announcements" (
    "id" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "templateId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "senderStaffId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_announcements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_announcement_acks" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_announcement_acks_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "comms_templates_kind_isActive_idx" ON "comms_templates"("kind", "isActive");
CREATE INDEX "official_notices_recipientStaffId_createdAt_idx" ON "official_notices"("recipientStaffId", "createdAt");
CREATE INDEX "official_notices_senderStaffId_createdAt_idx" ON "official_notices"("senderStaffId", "createdAt");
CREATE INDEX "official_notices_batchId_idx" ON "official_notices"("batchId");
CREATE INDEX "official_notices_type_createdAt_idx" ON "official_notices"("type", "createdAt");
CREATE INDEX "staff_comms_requests_status_createdAt_idx" ON "staff_comms_requests"("status", "createdAt");
CREATE INDEX "staff_comms_requests_requesterStaffId_createdAt_idx" ON "staff_comms_requests"("requesterStaffId", "createdAt");
CREATE INDEX "class_groups_classId_idx" ON "class_groups"("classId");
CREATE INDEX "class_groups_counselorStaffId_idx" ON "class_groups"("counselorStaffId");
CREATE INDEX "class_group_members_classGroupId_idx" ON "class_group_members"("classGroupId");
CREATE INDEX "class_group_members_staffId_idx" ON "class_group_members"("staffId");
CREATE INDEX "class_group_members_parentId_idx" ON "class_group_members"("parentId");
CREATE INDEX "class_group_messages_classGroupId_createdAt_idx" ON "class_group_messages"("classGroupId", "createdAt");
CREATE INDEX "class_announcements_classGroupId_createdAt_idx" ON "class_announcements"("classGroupId", "createdAt");
CREATE INDEX "class_announcements_senderStaffId_createdAt_idx" ON "class_announcements"("senderStaffId", "createdAt");
CREATE INDEX "class_announcements_batchId_idx" ON "class_announcements"("batchId");
CREATE INDEX "class_announcement_acks_parentId_seenAt_idx" ON "class_announcement_acks"("parentId", "seenAt");

CREATE UNIQUE INDEX "class_group_members_classGroupId_staffId_key" ON "class_group_members"("classGroupId", "staffId");
CREATE UNIQUE INDEX "class_group_members_classGroupId_parentId_key" ON "class_group_members"("classGroupId", "parentId");
CREATE UNIQUE INDEX "class_announcement_acks_announcementId_parentId_key" ON "class_announcement_acks"("announcementId", "parentId");

-- FKs
ALTER TABLE "comms_templates" ADD CONSTRAINT "comms_templates_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "official_notices" ADD CONSTRAINT "official_notices_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "comms_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "official_notices" ADD CONSTRAINT "official_notices_senderStaffId_fkey" FOREIGN KEY ("senderStaffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "official_notices" ADD CONSTRAINT "official_notices_recipientStaffId_fkey" FOREIGN KEY ("recipientStaffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_comms_requests" ADD CONSTRAINT "staff_comms_requests_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "comms_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "staff_comms_requests" ADD CONSTRAINT "staff_comms_requests_requesterStaffId_fkey" FOREIGN KEY ("requesterStaffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_comms_requests" ADD CONSTRAINT "staff_comms_requests_decidedByStaffId_fkey" FOREIGN KEY ("decidedByStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_counselorStaffId_fkey" FOREIGN KEY ("counselorStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_group_members" ADD CONSTRAINT "class_group_members_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_group_members" ADD CONSTRAINT "class_group_members_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_group_members" ADD CONSTRAINT "class_group_members_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_group_messages" ADD CONSTRAINT "class_group_messages_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_group_messages" ADD CONSTRAINT "class_group_messages_senderStaffId_fkey" FOREIGN KEY ("senderStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_group_messages" ADD CONSTRAINT "class_group_messages_senderParentId_fkey" FOREIGN KEY ("senderParentId") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_announcements" ADD CONSTRAINT "class_announcements_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_announcements" ADD CONSTRAINT "class_announcements_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "comms_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_announcements" ADD CONSTRAINT "class_announcements_senderStaffId_fkey" FOREIGN KEY ("senderStaffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_announcement_acks" ADD CONSTRAINT "class_announcement_acks_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "class_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_announcement_acks" ADD CONSTRAINT "class_announcement_acks_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed starter templates
INSERT INTO "comms_templates" ("id", "kind", "title", "body", "isActive", "createdAt", "updatedAt") VALUES
('seed_ihtar_gec', 'IHTAR', 'Derse geç girme ihtarı', E'Sayın Öğretmenimiz,\n\nDersinize geç girdiğiniz / girmediğiniz tespit edilmiştir. Bu durum resmi olarak kayıt altına alınmıştır.\n\nGereğinin yapılmasını rica ederiz.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed_talimat_genel', 'TALIMAT', 'Genel talimat', E'Sayın Personelimiz,\n\nAşağıdaki talimatın yerine getirilmesi gerekmektedir:\n\n[Talimat metni]\n\nSaygılarımızla.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed_pers_duyuru', 'PERSONEL_DUYURU', 'Genel personel duyurusu', E'Sayın Personelimiz,\n\nAşağıdaki duyuruyu bilgilerinize sunarız:\n\n[Duyuru metni]\n\nSaygılarımızla.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed_talep_genel', 'PERSONEL_TALEP', 'Genel personel talebi', E'Sayın Yönetim,\n\nAşağıdaki talebimi bilgilerinize sunarım:\n\n[Talep metni]\n\nSaygılarımla.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed_sinif_duyuru', 'SINIF_DUYURU', 'Genel sınıf duyurusu', E'Sayın Velimiz,\n\nAşağıdaki duyuruyu bilgilerinize sunarız:\n\n[Duyuru metni]\n\nSaygılarımızla.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
