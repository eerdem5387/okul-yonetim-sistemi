-- CreateTable
CREATE TABLE "staff_push_devices" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_push_devices_token_key" ON "staff_push_devices"("token");

-- CreateIndex
CREATE INDEX "staff_push_devices_staffId_idx" ON "staff_push_devices"("staffId");

-- AddForeignKey
ALTER TABLE "staff_push_devices" ADD CONSTRAINT "staff_push_devices_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
