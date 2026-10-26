-- AlterTable
ALTER TABLE "finance_expense_requests" ADD COLUMN IF NOT EXISTS "founderApprovedByName" TEXT;
ALTER TABLE "finance_expense_requests" ADD COLUMN IF NOT EXISTS "rejectedByName" TEXT;
