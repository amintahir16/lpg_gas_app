-- AlterTable
ALTER TABLE "public"."b2b_transaction_items" ALTER COLUMN "totalPrice" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "public"."customers" ALTER COLUMN "creditLimit" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "ledgerBalance" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "public"."invoices" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "public"."vendor_orders" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(15,2);
