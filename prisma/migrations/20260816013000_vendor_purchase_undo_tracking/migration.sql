-- CreateEnum
CREATE TYPE "VendorPurchaseBatchStatus" AS ENUM ('ACTIVE', 'UNDONE');

-- CreateEnum
CREATE TYPE "PurchaseInventoryEffectType" AS ENUM (
  'CYLINDER_STATUS_CHANGE',
  'CYLINDER_CREATED',
  'CUSTOM_ITEM_UPDATED',
  'CUSTOM_ITEM_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_CREATED'
);

-- CreateEnum
CREATE TYPE "PurchaseInventoryEntityType" AS ENUM ('CYLINDER', 'CUSTOM_ITEM', 'PRODUCT');

-- CreateTable
CREATE TABLE "vendor_purchase_batches" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "category" "VendorCategory" NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "status" "VendorPurchaseBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "regionId" TEXT,
    "undoneAt" TIMESTAMP(3),
    "undoneBy" TEXT,
    "undoReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_purchase_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_inventory_effects" (
    "id" TEXT NOT NULL,
    "purchaseBatchId" TEXT NOT NULL,
    "effectType" "PurchaseInventoryEffectType" NOT NULL,
    "entityType" "PurchaseInventoryEntityType" NOT NULL,
    "entityId" TEXT,
    "itemName" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "beforeState" JSONB,
    "afterState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_inventory_effects_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "purchase_entries" ADD COLUMN "purchaseBatchId" TEXT;

-- AlterTable
ALTER TABLE "vendor_payments" ADD COLUMN "purchaseBatchId" TEXT;

-- CreateIndex
CREATE INDEX "vendor_purchase_batches_vendorId_invoiceNumber_idx" ON "vendor_purchase_batches"("vendorId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "vendor_purchase_batches_vendorId_status_idx" ON "vendor_purchase_batches"("vendorId", "status");

-- CreateIndex
CREATE INDEX "vendor_purchase_batches_regionId_idx" ON "vendor_purchase_batches"("regionId");

-- CreateIndex
CREATE INDEX "vendor_purchase_batches_createdBy_idx" ON "vendor_purchase_batches"("createdBy");

-- CreateIndex
CREATE INDEX "vendor_purchase_batches_undoneBy_idx" ON "vendor_purchase_batches"("undoneBy");

-- CreateIndex
CREATE INDEX "purchase_inventory_effects_purchaseBatchId_idx" ON "purchase_inventory_effects"("purchaseBatchId");

-- CreateIndex
CREATE INDEX "purchase_inventory_effects_entityType_entityId_idx" ON "purchase_inventory_effects"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "purchase_entries_purchaseBatchId_idx" ON "purchase_entries"("purchaseBatchId");

-- CreateIndex
CREATE INDEX "vendor_payments_purchaseBatchId_idx" ON "vendor_payments"("purchaseBatchId");

-- AddForeignKey
ALTER TABLE "vendor_purchase_batches" ADD CONSTRAINT "vendor_purchase_batches_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_purchase_batches" ADD CONSTRAINT "vendor_purchase_batches_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_purchase_batches" ADD CONSTRAINT "vendor_purchase_batches_undoneBy_fkey" FOREIGN KEY ("undoneBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_purchase_batches" ADD CONSTRAINT "vendor_purchase_batches_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_inventory_effects" ADD CONSTRAINT "purchase_inventory_effects_purchaseBatchId_fkey" FOREIGN KEY ("purchaseBatchId") REFERENCES "vendor_purchase_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_entries" ADD CONSTRAINT "purchase_entries_purchaseBatchId_fkey" FOREIGN KEY ("purchaseBatchId") REFERENCES "vendor_purchase_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_purchaseBatchId_fkey" FOREIGN KEY ("purchaseBatchId") REFERENCES "vendor_purchase_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
