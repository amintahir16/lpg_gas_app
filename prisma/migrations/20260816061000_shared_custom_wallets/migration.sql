-- CreateTable
CREATE TABLE IF NOT EXISTS "bank_wallets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BANK',
    "accountNumber" TEXT,
    "accountTitle" TEXT,
    "bankName" TEXT,
    "gradient" TEXT DEFAULT 'from-indigo-500 to-indigo-600',
    "labelTone" TEXT DEFAULT 'text-indigo-100',
    "icon" TEXT DEFAULT 'BANK',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bank_wallets_name_key" ON "bank_wallets"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "bank_wallets_code_key" ON "bank_wallets"("code");
CREATE INDEX IF NOT EXISTS "bank_wallets_isActive_sortOrder_idx" ON "bank_wallets"("isActive", "sortOrder");

-- Alter columns from enum to text
ALTER TABLE "b2b_transactions" ALTER COLUMN "paymentMethod" TYPE VARCHAR(255) USING "paymentMethod"::TEXT;
ALTER TABLE "vendor_payments" ALTER COLUMN "method" TYPE VARCHAR(255) USING "method"::TEXT;

-- Seed default core wallets if not existing
INSERT INTO "bank_wallets" ("id", "name", "code", "type", "gradient", "labelTone", "icon", "description", "isActive", "isDefault", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('wallet_cash', 'Cash', 'CASH', 'CASH', 'from-amber-500 to-amber-600', 'text-amber-100', 'CASH', 'Physical cash float & counter collections', true, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wallet_bank_transfer', 'Bank Transfer', 'BANK_TRANSFER', 'BANK', 'from-indigo-500 to-indigo-600', 'text-indigo-100', 'BANK', 'Direct bank account transfer', true, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wallet_easypaisa', 'Easypaisa', 'EASYPAISA', 'MOBILE_WALLET', 'from-lime-500 to-green-600', 'text-lime-100', 'MOBILE', 'Easypaisa mobile wallet', true, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wallet_jazz_cash', 'Jazz Cash', 'JAZZ_CASH', 'MOBILE_WALLET', 'from-rose-500 to-rose-600', 'text-rose-100', 'MOBILE', 'Jazz Cash mobile wallet', true, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
