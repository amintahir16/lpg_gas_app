-- CreateTable
CREATE TABLE "public"."b2c_customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "houseNumber" TEXT,
    "sector" TEXT,
    "street" TEXT,
    "phase" TEXT,
    "area" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Hayatabad',
    "totalProfit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."b2c_cylinder_holdings" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "cylinderType" "public"."CylinderType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "securityAmount" DECIMAL(10,2) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnDate" TIMESTAMP(3),
    "isReturned" BOOLEAN NOT NULL DEFAULT false,
    "returnDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "b2c_cylinder_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."b2c_transactions" (
    "id" TEXT NOT NULL,
    "billSno" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "voidedBy" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "b2c_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."b2c_transaction_gas_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "cylinderType" "public"."CylinderType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerItem" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "b2c_transaction_gas_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."b2c_transaction_security_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "cylinderType" "public"."CylinderType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerItem" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "isReturn" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "b2c_transaction_security_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."b2c_transaction_accessory_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerItem" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "b2c_transaction_accessory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "b2c_transactions_billSno_key" ON "public"."b2c_transactions"("billSno");

-- AddForeignKey
ALTER TABLE "public"."b2c_cylinder_holdings" ADD CONSTRAINT "b2c_cylinder_holdings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."b2c_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."b2c_transactions" ADD CONSTRAINT "b2c_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."b2c_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."b2c_transaction_gas_items" ADD CONSTRAINT "b2c_transaction_gas_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."b2c_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."b2c_transaction_security_items" ADD CONSTRAINT "b2c_transaction_security_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."b2c_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."b2c_transaction_accessory_items" ADD CONSTRAINT "b2c_transaction_accessory_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."b2c_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
