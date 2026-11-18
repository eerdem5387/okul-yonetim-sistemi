-- Müdür onayı veren kişinin adı (çift onay kuralı)
ALTER TABLE "finance_expense_requests" ADD COLUMN IF NOT EXISTS "principalApprovedByName" TEXT;
