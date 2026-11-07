-- Allow more than one salary payment per employee per branch per month.
-- Existing records are unchanged; wallets/profit already sum all salary_records.
DROP INDEX IF EXISTS "salary_records_userId_regionId_month_year_key";

CREATE INDEX IF NOT EXISTS "salary_records_userId_regionId_month_year_idx"
  ON "salary_records"("userId", "regionId", "month", "year");
