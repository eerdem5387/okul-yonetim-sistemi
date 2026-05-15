-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('PRIVATE', 'GROUP', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'DOCUMENT');

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "staffId" TEXT,
    "parentId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderStaffId" TEXT,
    "senderParentId" TEXT,
    "body" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_receipts" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "readerStaffId" TEXT,
    "readerParentId" TEXT,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_type_idx" ON "conversations"("type");

-- CreateIndex
CREATE INDEX "conversations_updatedAt_idx" ON "conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "conversation_participants_conversationId_idx" ON "conversation_participants"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_participants_staffId_idx" ON "conversation_participants"("staffId");

-- CreateIndex
CREATE INDEX "conversation_participants_parentId_idx" ON "conversation_participants"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_staffId_key" ON "conversation_participants"("conversationId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_parentId_key" ON "conversation_participants"("conversationId", "parentId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_senderStaffId_idx" ON "messages"("senderStaffId");

-- CreateIndex
CREATE INDEX "messages_senderParentId_idx" ON "messages"("senderParentId");

-- CreateIndex
CREATE INDEX "message_receipts_messageId_idx" ON "message_receipts"("messageId");

-- CreateIndex
CREATE INDEX "message_receipts_readerStaffId_idx" ON "message_receipts"("readerStaffId");

-- CreateIndex
CREATE INDEX "message_receipts_readerParentId_idx" ON "message_receipts"("readerParentId");

-- CreateIndex
CREATE UNIQUE INDEX "message_receipts_messageId_readerStaffId_key" ON "message_receipts"("messageId", "readerStaffId");

-- CreateIndex
CREATE UNIQUE INDEX "message_receipts_messageId_readerParentId_key" ON "message_receipts"("messageId", "readerParentId");

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderStaffId_fkey" FOREIGN KEY ("senderStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderParentId_fkey" FOREIGN KEY ("senderParentId") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_readerStaffId_fkey" FOREIGN KEY ("readerStaffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_readerParentId_fkey" FOREIGN KEY ("readerParentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
