-- CreateTable
CREATE TABLE "staff_permissions" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_permissions_staffId_module_action_key" ON "staff_permissions"("staffId", "module", "action");

-- CreateIndex
CREATE INDEX "staff_permissions_staffId_idx" ON "staff_permissions"("staffId");

-- CreateIndex
CREATE INDEX "staff_permissions_module_idx" ON "staff_permissions"("module");

-- AddForeignKey
ALTER TABLE "staff_permissions" ADD CONSTRAINT "staff_permissions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
