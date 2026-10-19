DO $$ BEGIN
  ALTER TYPE "FinanceRequestStatus" ADD VALUE 'COMPLETED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "finance_expense_requests" ALTER COLUMN "total" DROP NOT NULL;

ALTER TABLE "finance_expense_requests" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "finance_expense_requests" ADD COLUMN IF NOT EXISTS "completedById" TEXT;

ALTER TABLE "finance_expense_requests" DROP COLUMN IF EXISTS "quantity";
ALTER TABLE "finance_expense_requests" DROP COLUMN IF EXISTS "unitPrice";
