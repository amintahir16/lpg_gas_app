-- CreateEnum
CREATE TYPE "WebsiteInquiryType" AS ENUM ('CONTACT', 'SHOP_ORDER');

-- CreateEnum
CREATE TYPE "WebsiteInquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ShopCatalogIcon" AS ENUM ('HOME', 'BUILDING', 'FACTORY', 'FLAME', 'PACKAGE', 'TRUCK');

-- CreateTable
CREATE TABLE "website_inquiries" (
    "id" TEXT NOT NULL,
    "type" "WebsiteInquiryType" NOT NULL,
    "status" "WebsiteInquiryStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT,
    "deliveryAddress" TEXT,
    "cartItems" JSONB,
    "totalAmount" DECIMAL(15,2),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_catalog_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sizeLabel" TEXT,
    "deliveryTimeNote" TEXT,
    "icon" "ShopCatalogIcon" NOT NULL DEFAULT 'PACKAGE',
    "accentColor" TEXT NOT NULL DEFAULT '#f36523',
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_inquiries_type_status_createdAt_idx" ON "website_inquiries"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "shop_catalog_items_isActive_sortOrder_idx" ON "shop_catalog_items"("isActive", "sortOrder");
