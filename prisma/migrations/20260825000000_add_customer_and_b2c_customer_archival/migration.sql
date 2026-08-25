-- AlterTable "customers" (B2B)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customers_isArchived_idx" ON "customers"("isArchived");

-- AlterTable "b2c_customers" (B2C)
ALTER TABLE "b2c_customers" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "b2c_customers" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "b2c_customers_isArchived_idx" ON "b2c_customers"("isArchived");

