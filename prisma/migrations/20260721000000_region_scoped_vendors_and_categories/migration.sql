-- Region-scoped vendors & vendor categories.
--
-- Before: vendors and vendor_category_configs were GLOBAL (shared across all
-- regions), so deleting a vendor in one region removed it everywhere.
-- After: each region owns its own categories and vendors.
--
-- This migration is written to be idempotent (safe to re-run) and includes a
-- data backfill:
--   1. Adds nullable "regionId" to both tables (+ FKs, indexes).
--   2. Replaces the global unique constraints on category name/slug with
--      per-region unique constraints.
--   3. Adopts existing (regionId IS NULL) categories/vendors into the default
--      region, so nothing disappears for the main branch.
--   4. Duplicates those categories/vendors into every other active region so
--      each branch keeps seeing the same list it saw before — but now as its
--      own independent copies.
--   5. Re-points region-scoped activity rows (purchase entries, payments,
--      orders, inventories, financial reports) at the copy belonging to their
--      own region.

-- ============================================================
-- 1. Schema: add regionId columns, FKs and indexes
-- ============================================================

ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "vendor_category_configs" ADD COLUMN IF NOT EXISTS "regionId" TEXT;

ALTER TABLE "vendors" DROP CONSTRAINT IF EXISTS "vendors_regionId_fkey";
ALTER TABLE "vendors"
  ADD CONSTRAINT "vendors_regionId_fkey"
  FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vendor_category_configs" DROP CONSTRAINT IF EXISTS "vendor_category_configs_regionId_fkey";
ALTER TABLE "vendor_category_configs"
  ADD CONSTRAINT "vendor_category_configs_regionId_fkey"
  FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "vendors_regionId_idx" ON "vendors"("regionId");
CREATE INDEX IF NOT EXISTS "vendor_category_configs_regionId_idx" ON "vendor_category_configs"("regionId");

-- ============================================================
-- 2. Uniqueness: category name/slug unique PER REGION, not globally
-- ============================================================

DROP INDEX IF EXISTS "vendor_category_configs_name_key";
DROP INDEX IF EXISTS "vendor_category_configs_slug_key";
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_category_configs_regionId_name_key" ON "vendor_category_configs"("regionId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_category_configs_regionId_slug_key" ON "vendor_category_configs"("regionId", "slug");

-- ============================================================
-- 3. Adopt legacy (null-region) rows into the default region
-- ============================================================
-- The original rows stay attached to the default region so records without a
-- region column (invoices, bank details, support requests) keep pointing at a
-- valid vendor in the main branch.

UPDATE "vendor_category_configs"
SET "regionId" = (
  SELECT id FROM "regions"
  WHERE "isActive" = true
  ORDER BY "isDefault" DESC, "sortOrder" ASC, "createdAt" ASC
  LIMIT 1
)
WHERE "regionId" IS NULL
  AND EXISTS (SELECT 1 FROM "regions" WHERE "isActive" = true);

UPDATE "vendors"
SET "regionId" = (
  SELECT id FROM "regions"
  WHERE "isActive" = true
  ORDER BY "isDefault" DESC, "sortOrder" ASC, "createdAt" ASC
  LIMIT 1
)
WHERE "regionId" IS NULL
  AND EXISTS (SELECT 1 FROM "regions" WHERE "isActive" = true);

-- ============================================================
-- 4. Duplicate categories into every other active region
-- ============================================================

CREATE TEMPORARY TABLE "_region_cat_map" AS
SELECT
  c.id AS old_id,
  'vcc_' || md5(c.id || ':' || r.id) AS new_id,
  c.name, c.slug, c.description, c.icon,
  c."sortOrder", c."isActive",
  r.id AS region_id
FROM "vendor_category_configs" c
JOIN "regions" src ON src.id = c."regionId"
CROSS JOIN "regions" r
WHERE r."isActive" = true
  AND r.id <> c."regionId"
  AND src.id = (
    SELECT id FROM "regions"
    WHERE "isActive" = true
    ORDER BY "isDefault" DESC, "sortOrder" ASC, "createdAt" ASC
    LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM "vendor_category_configs" x
    WHERE x."regionId" = r.id AND x.slug = c.slug
  );

INSERT INTO "vendor_category_configs"
  (id, name, slug, description, icon, "sortOrder", "isActive", "createdAt", "updatedAt", "regionId")
SELECT new_id, name, slug, description, icon, "sortOrder", "isActive", NOW(), NOW(), region_id
FROM "_region_cat_map"
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Duplicate vendors into every other active region
-- ============================================================
-- Copied vendors get a region-suffixed vendor code (codes are globally unique).

CREATE TEMPORARY TABLE "_region_vendor_map" AS
SELECT
  v.id AS old_id,
  'vnd_' || md5(v.id || ':' || r.id) AS new_id,
  v."vendorCode" || '-' || UPPER(COALESCE(NULLIF(r.code, ''), SUBSTRING(r.id FROM 1 FOR 4))) AS new_code,
  v."companyName", v."contactPerson", v.email, v.phone, v.address, v."taxId",
  v."paymentTerms", v."isActive", v."categoryId" AS old_category_id,
  r.id AS region_id
FROM "vendors" v
JOIN "regions" src ON src.id = v."regionId"
CROSS JOIN "regions" r
WHERE r."isActive" = true
  AND r.id <> v."regionId"
  AND src.id = (
    SELECT id FROM "regions"
    WHERE "isActive" = true
    ORDER BY "isDefault" DESC, "sortOrder" ASC, "createdAt" ASC
    LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM "vendors" x
    WHERE x."regionId" = r.id AND x."companyName" = v."companyName"
  );

INSERT INTO "vendors"
  (id, "vendorCode", "companyName", "contactPerson", email, phone, address, "taxId",
   "paymentTerms", "isActive", "createdAt", "updatedAt", "categoryId", "regionId")
SELECT
  m.new_id, m.new_code, m."companyName", m."contactPerson", m.email, m.phone, m.address, m."taxId",
  m."paymentTerms", m."isActive", NOW(), NOW(),
  -- Point the copy at the category copy that lives in the same region
  regional_cat.id,
  m.region_id
FROM "_region_vendor_map" m
LEFT JOIN "vendor_category_configs" original_cat ON original_cat.id = m.old_category_id
LEFT JOIN "vendor_category_configs" regional_cat
  ON regional_cat."regionId" = m.region_id AND regional_cat.slug = original_cat.slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. Re-point region-scoped vendor activity at the regional copy
-- ============================================================

UPDATE "purchase_entries" t
SET "vendorId" = m.new_id
FROM "_region_vendor_map" m
WHERE t."vendorId" = m.old_id AND t."regionId" = m.region_id;

UPDATE "vendor_payments" t
SET "vendorId" = m.new_id
FROM "_region_vendor_map" m
WHERE t."vendorId" = m.old_id AND t."regionId" = m.region_id;

UPDATE "vendor_orders" t
SET "vendorId" = m.new_id
FROM "_region_vendor_map" m
WHERE t."vendorId" = m.old_id AND t."regionId" = m.region_id;

UPDATE "vendor_inventories" t
SET "vendorId" = m.new_id
FROM "_region_vendor_map" m
WHERE t."vendorId" = m.old_id AND t."regionId" = m.region_id;

UPDATE "vendor_financial_reports" t
SET "vendorId" = m.new_id
FROM "_region_vendor_map" m
WHERE t."vendorId" = m.old_id AND t."regionId" = m.region_id;

DROP TABLE IF EXISTS "_region_cat_map";
DROP TABLE IF EXISTS "_region_vendor_map";
