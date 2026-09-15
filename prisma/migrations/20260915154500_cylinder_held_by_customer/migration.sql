-- Store the B2B customer that physically holds a cylinder (source of truth).
ALTER TABLE "cylinders" ADD COLUMN "heldByCustomerId" TEXT;

CREATE INDEX "cylinders_heldByCustomerId_idx" ON "cylinders"("heldByCustomerId");

ALTER TABLE "cylinders" ADD CONSTRAINT "cylinders_heldByCustomerId_fkey" FOREIGN KEY ("heldByCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 1. Backfill rows whose location already embeds the customer id.
UPDATE "cylinders" AS cyl
SET "heldByCustomerId" = cust."id"
FROM "customers" AS cust
WHERE cyl."heldByCustomerId" IS NULL
  AND cyl."currentStatus" = 'WITH_CUSTOMER'
  AND cyl."location" IS NOT NULL
  AND cust."type" = 'B2B'
  AND position(cust."id" in cyl."location") > 0;

-- 2. Backfill existing WITH_CUSTOMER rows using exact location "Customer: <name>"
-- Handles whitespace trimming and duplicate names by prioritizing the active
-- customer record with transactions and recent updates.
UPDATE "cylinders" AS cyl
SET "heldByCustomerId" = ranked_cust.id
FROM (
  SELECT c."id", c."name", c."regionId",
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(c."name"))
      ORDER BY 
        (SELECT COUNT(*) FROM "b2b_transactions" tx WHERE tx."customerId" = c."id") DESC,
        c."isActive" DESC,
        c."updatedAt" DESC
    ) AS rank
  FROM "customers" c
  WHERE c."type" = 'B2B'
) AS ranked_cust
WHERE cyl."heldByCustomerId" IS NULL
  AND cyl."currentStatus" = 'WITH_CUSTOMER'
  AND cyl."location" IS NOT NULL
  AND ranked_cust.rank = 1
  AND (
    lower(trim(cyl."location")) = lower('customer: ' || trim(ranked_cust."name"))
    OR lower(trim(cyl."location")) = lower(trim(ranked_cust."name"))
  );

-- 3. Reassign CM-1182 to Black Cafe hayatabad (crossed over during earlier fuzzy return)
UPDATE "cylinders"
SET "location" = 'Customer: Black Cafe hayatabad',
    "heldByCustomerId" = 'cmtmg0jpy001eky04bmek2wqi'
WHERE "code" = 'CM-1182'
  AND "currentStatus" = 'WITH_CUSTOMER';

