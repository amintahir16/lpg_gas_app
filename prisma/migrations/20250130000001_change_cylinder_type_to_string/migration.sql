-- AlterTable: Change cylinderType from enum to String for all tables
-- This migration converts all cylinderType enum columns to TEXT/String type

-- 1. Update cylinders table
ALTER TABLE "cylinders" ADD COLUMN "cylinderType_temp" TEXT;
UPDATE "cylinders" SET "cylinderType_temp" = "cylinderType"::TEXT;
ALTER TABLE "cylinders" DROP COLUMN "cylinderType";
ALTER TABLE "cylinders" RENAME COLUMN "cylinderType_temp" TO "cylinderType";
ALTER TABLE "cylinders" ALTER COLUMN "cylinderType" SET NOT NULL;

-- 2. Update b2c_cylinder_holdings table
ALTER TABLE "b2c_cylinder_holdings" ADD COLUMN "cylinderType_temp" TEXT;
UPDATE "b2c_cylinder_holdings" SET "cylinderType_temp" = "cylinderType"::TEXT;
ALTER TABLE "b2c_cylinder_holdings" DROP COLUMN "cylinderType";
ALTER TABLE "b2c_cylinder_holdings" RENAME COLUMN "cylinderType_temp" TO "cylinderType";
ALTER TABLE "b2c_cylinder_holdings" ALTER COLUMN "cylinderType" SET NOT NULL;

-- 3. Update b2c_transaction_gas_items table
ALTER TABLE "b2c_transaction_gas_items" ADD COLUMN "cylinderType_temp" TEXT;
UPDATE "b2c_transaction_gas_items" SET "cylinderType_temp" = "cylinderType"::TEXT;
ALTER TABLE "b2c_transaction_gas_items" DROP COLUMN "cylinderType";
ALTER TABLE "b2c_transaction_gas_items" RENAME COLUMN "cylinderType_temp" TO "cylinderType";
ALTER TABLE "b2c_transaction_gas_items" ALTER COLUMN "cylinderType" SET NOT NULL;

-- 4. Update b2c_transaction_security_items table
ALTER TABLE "b2c_transaction_security_items" ADD COLUMN "cylinderType_temp" TEXT;
UPDATE "b2c_transaction_security_items" SET "cylinderType_temp" = "cylinderType"::TEXT;
ALTER TABLE "b2c_transaction_security_items" DROP COLUMN "cylinderType";
ALTER TABLE "b2c_transaction_security_items" RENAME COLUMN "cylinderType_temp" TO "cylinderType";
ALTER TABLE "b2c_transaction_security_items" ALTER COLUMN "cylinderType" SET NOT NULL;

