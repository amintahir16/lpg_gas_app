-- CreateTable
CREATE TABLE IF NOT EXISTS "bank_movements" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromMethod" TEXT,
    "toMethod" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "regionId" TEXT,

    CONSTRAINT "bank_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bank_movements_regionId_idx" ON "bank_movements"("regionId");
CREATE INDEX IF NOT EXISTS "bank_movements_movementDate_idx" ON "bank_movements"("movementDate");
CREATE INDEX IF NOT EXISTS "bank_movements_toMethod_idx" ON "bank_movements"("toMethod");
CREATE INDEX IF NOT EXISTS "bank_movements_fromMethod_idx" ON "bank_movements"("fromMethod");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bank_movements_regionId_fkey'
  ) THEN
    ALTER TABLE "bank_movements"
      ADD CONSTRAINT "bank_movements_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "regions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bank_movements_createdBy_fkey'
  ) THEN
    ALTER TABLE "bank_movements"
      ADD CONSTRAINT "bank_movements_createdBy_fkey"
      FOREIGN KEY ("createdBy") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
