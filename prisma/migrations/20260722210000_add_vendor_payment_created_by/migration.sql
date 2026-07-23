-- AlterTable
ALTER TABLE "vendor_payments" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_payments_createdBy_idx" ON "vendor_payments"("createdBy");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_payments_createdBy_fkey'
  ) THEN
    ALTER TABLE "vendor_payments"
      ADD CONSTRAINT "vendor_payments_createdBy_fkey"
      FOREIGN KEY ("createdBy") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
