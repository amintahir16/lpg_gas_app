-- CreateTable
CREATE TABLE IF NOT EXISTS "salary_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "paidDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "regionId" TEXT,

    CONSTRAINT "salary_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "salary_records_userId_regionId_month_year_key"
  ON "salary_records"("userId", "regionId", "month", "year");
CREATE INDEX IF NOT EXISTS "salary_records_regionId_idx" ON "salary_records"("regionId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salary_records_userId_fkey'
  ) THEN
    ALTER TABLE "salary_records"
      ADD CONSTRAINT "salary_records_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salary_records_regionId_fkey'
  ) THEN
    ALTER TABLE "salary_records"
      ADD CONSTRAINT "salary_records_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "regions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
