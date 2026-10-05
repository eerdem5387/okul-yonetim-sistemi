-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FinanceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "finance_expense_requests" (
    "id" TEXT NOT NULL,
    "muhasebeTenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "requesterName" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "FinanceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdById" TEXT,
    "principalApprovedAt" TIMESTAMP(3),
    "principalApprovedBy" TEXT,
    "founderApprovedAt" TIMESTAMP(3),
    "founderApprovedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectReason" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_expense_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "finance_expense_requests_status_idx" ON "finance_expense_requests"("status");
CREATE INDEX IF NOT EXISTS "finance_expense_requests_syncedAt_idx" ON "finance_expense_requests"("syncedAt");

CREATE TABLE IF NOT EXISTS "finance_cashbook_entries" (
    "id" TEXT NOT NULL,
    "muhasebeTenantId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "bankName" TEXT,
    "checkInstallments" INTEGER,
    "incomeCategory" TEXT,
    "payerFirstName" TEXT,
    "payerLastName" TEXT,
    "payerIdentityNo" TEXT,
    "expenseTitle" TEXT,
    "payeeIdentityNo" TEXT,
    "invoiceNo" TEXT,
    "notes" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_cashbook_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "finance_cashbook_entries_yearMonth_side_idx" ON "finance_cashbook_entries"("yearMonth", "side");
CREATE INDEX IF NOT EXISTS "finance_cashbook_entries_occurredAt_idx" ON "finance_cashbook_entries"("occurredAt");
