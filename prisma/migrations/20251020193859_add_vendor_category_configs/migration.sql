/*
  Warnings:

  - You are about to drop the column `category` on the `vendors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."vendors" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "public"."vendor_category_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_category_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_category_configs_name_key" ON "public"."vendor_category_configs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_category_configs_slug_key" ON "public"."vendor_category_configs"("slug");

-- AddForeignKey
ALTER TABLE "public"."vendors" ADD CONSTRAINT "vendors_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."vendor_category_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
