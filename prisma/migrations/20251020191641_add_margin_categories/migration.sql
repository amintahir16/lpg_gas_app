-- AlterTable
ALTER TABLE "public"."b2c_customers" ADD COLUMN     "marginCategoryId" TEXT;

-- AlterTable
ALTER TABLE "public"."customers" ADD COLUMN     "marginCategoryId" TEXT;

-- CreateTable
CREATE TABLE "public"."margin_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerType" TEXT NOT NULL,
    "marginPerKg" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "margin_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "margin_categories_name_key" ON "public"."margin_categories"("name");

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_marginCategoryId_fkey" FOREIGN KEY ("marginCategoryId") REFERENCES "public"."margin_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."b2c_customers" ADD CONSTRAINT "b2c_customers_marginCategoryId_fkey" FOREIGN KEY ("marginCategoryId") REFERENCES "public"."margin_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
