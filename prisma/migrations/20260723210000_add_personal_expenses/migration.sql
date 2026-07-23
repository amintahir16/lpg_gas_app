-- Personal expenses (owner/self spend) — separate from office_expenses.

CREATE TABLE IF NOT EXISTS "personal_expenses" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "regionId" TEXT,

    CONSTRAINT "personal_expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "personal_expenses_regionId_idx" ON "personal_expenses"("regionId");
CREATE INDEX IF NOT EXISTS "personal_expenses_expenseDate_idx" ON "personal_expenses"("expenseDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'personal_expenses_regionId_fkey'
  ) THEN
    ALTER TABLE "personal_expenses"
      ADD CONSTRAINT "personal_expenses_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "regions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
