-- CreateTable
CREATE TABLE "public"."daily_plant_prices" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "plantPrice118kg" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_plant_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_plant_prices_date_key" ON "public"."daily_plant_prices"("date");

-- AddForeignKey
ALTER TABLE "public"."daily_plant_prices" ADD CONSTRAINT "daily_plant_prices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
