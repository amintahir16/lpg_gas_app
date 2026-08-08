-- Quota: speed date-range + per-customer ledger scans (additive indexes only)
CREATE INDEX IF NOT EXISTS "b2b_transactions_regionId_date_idx" ON "b2b_transactions"("regionId", "date");
CREATE INDEX IF NOT EXISTS "b2b_transactions_customerId_createdAt_idx" ON "b2b_transactions"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "b2b_transactions_customerId_date_idx" ON "b2b_transactions"("customerId", "date");

CREATE INDEX IF NOT EXISTS "b2c_transactions_regionId_date_idx" ON "b2c_transactions"("regionId", "date");
CREATE INDEX IF NOT EXISTS "b2c_transactions_customerId_createdAt_idx" ON "b2c_transactions"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "b2c_transactions_customerId_date_idx" ON "b2c_transactions"("customerId", "date");

CREATE INDEX IF NOT EXISTS "b2b_transaction_items_transactionId_idx" ON "b2b_transaction_items"("transactionId");

CREATE INDEX IF NOT EXISTS "office_expenses_regionId_expenseDate_idx" ON "office_expenses"("regionId", "expenseDate");
CREATE INDEX IF NOT EXISTS "personal_expenses_regionId_expenseDate_idx" ON "personal_expenses"("regionId", "expenseDate");
