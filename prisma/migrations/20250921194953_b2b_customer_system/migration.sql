-- CreateEnum
CREATE TYPE "public"."VendorOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."InventoryStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'WIRE_TRANSFER');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SupportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."SupportCategory" AS ENUM ('GENERAL', 'TECHNICAL', 'BILLING', 'DELIVERY', 'SAFETY', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN', 'VENDOR');

-- CreateEnum
CREATE TYPE "public"."CustomerType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "public"."ProductCategory" AS ENUM ('GAS_CYLINDER', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "public"."StockType" AS ENUM ('FILLED', 'EMPTY', 'PARTIAL');

-- CreateEnum
CREATE TYPE "public"."B2BTransactionType" AS ENUM ('SALE', 'PAYMENT', 'BUYBACK', 'RETURN_EMPTY', 'ADJUSTMENT', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "public"."ReturnCondition" AS ENUM ('EMPTY', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "public"."CylinderType" AS ENUM ('DOMESTIC_11_8KG', 'STANDARD_15KG', 'COMMERCIAL_45_4KG');

-- CreateEnum
CREATE TYPE "public"."CylinderStatus" AS ENUM ('FULL', 'EMPTY', 'MAINTENANCE', 'RETIRED', 'WITH_CUSTOMER');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('SALE', 'PAYMENT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."RentalStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."ExpenseCategory" AS ENUM ('SALARY', 'FUEL', 'MEALS', 'MAINTENANCE', 'UTILITIES', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."InvoiceType" AS ENUM ('SALE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SupportRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."VendorCategory" AS ENUM ('CYLINDER_PURCHASE', 'GAS_PURCHASE', 'VAPORIZER_PURCHASE', 'ACCESSORIES_PURCHASE', 'VALVES_PURCHASE');

-- CreateEnum
CREATE TYPE "public"."PurchaseEntryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('CYLINDER_ADDED', 'CYLINDER_UPDATED', 'CYLINDER_DELETED', 'CYLINDER_STATUS_CHANGED', 'VENDOR_ADDED', 'VENDOR_UPDATED', 'VENDOR_DELETED', 'VENDOR_STATUS_CHANGED', 'CUSTOMER_ADDED', 'CUSTOMER_UPDATED', 'CUSTOMER_DELETED', 'CUSTOMER_STATUS_CHANGED', 'EXPENSE_ADDED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED', 'EXPENSE_STATUS_CHANGED', 'PAYMENT_RECEIVED', 'PAYMENT_UPDATED', 'PAYMENT_DELETED', 'RENTAL_CREATED', 'RENTAL_UPDATED', 'RENTAL_COMPLETED', 'LOW_INVENTORY', 'MAINTENANCE_DUE', 'SYSTEM_ALERT', 'USER_ACTIVITY');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'B2B',
    "contactPerson" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "creditLimit" DECIMAL(10,2),
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "ledgerBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "domestic118kgDue" INTEGER NOT NULL DEFAULT 0,
    "standard15kgDue" INTEGER NOT NULL DEFAULT 0,
    "commercial454kgDue" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."ProductCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "stockQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stockType" "public"."StockType" NOT NULL DEFAULT 'FILLED',
    "remainingKg" DECIMAL(5,2),
    "priceSoldToCustomer" DECIMAL(10,2) NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."b2b_transactions" (
    "id" TEXT NOT NULL,
    "transactionType" "public"."B2BTransactionType" NOT NULL,
    "billSno" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "voidedBy" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "b2b_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."b2b_transaction_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "pricePerItem" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "cylinderType" TEXT,
    "returnedCondition" "public"."ReturnCondition",
    "remainingKg" DECIMAL(5,2),
    "originalSoldPrice" DECIMAL(10,2),
    "buybackRate" DECIMAL(3,2),
    "buybackPricePerItem" DECIMAL(10,2),
    "buybackTotal" DECIMAL(10,2),

    CONSTRAINT "b2b_transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bill_sequences" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cylinders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cylinderType" "public"."CylinderType" NOT NULL,
    "capacity" DECIMAL(5,2) NOT NULL,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DECIMAL(10,2),
    "currentStatus" "public"."CylinderStatus" NOT NULL DEFAULT 'FULL',
    "location" TEXT,
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "storeId" TEXT,
    "vehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cylinders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_ledger" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "transactionType" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceBefore" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cylinder_rentals" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "cylinderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rentalDate" TIMESTAMP(3) NOT NULL,
    "expectedReturnDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "rentalAmount" DECIMAL(10,2),
    "depositAmount" DECIMAL(10,2),
    "status" "public"."RentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cylinder_rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expenses" (
    "id" TEXT NOT NULL,
    "category" "public"."ExpenseCategory" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "receiptUrl" TEXT,
    "status" "public"."ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendors" (
    "id" TEXT NOT NULL,
    "vendorCode" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "category" "public"."VendorCategory",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_bank_details" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "swiftCode" TEXT,
    "routingNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_inventories" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "cylinderId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "status" "public"."InventoryStatus" NOT NULL DEFAULT 'IN_STOCK',
    "description" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_payments" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "vendorId" TEXT,
    "invoiceType" "public"."InvoiceType" NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(10,2) NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_requests" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."SupportRequestStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."SupportPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "public"."SupportCategory" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_orders" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."VendorOrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_support_requests" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."SupportRequestStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."SupportPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "public"."SupportCategory" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "metadata" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_entries" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "category" "public"."VendorCategory" NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemDescription" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "status" "public"."PurchaseEntryStatus" NOT NULL DEFAULT 'PENDING',
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_financial_reports" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "netBalance" DECIMAL(10,2) NOT NULL,
    "cashIn" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cashOut" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "previousBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_financial_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicles" (
    "id" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "driverName" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."regulators" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "costPerPiece" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gas_pipes" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gas_pipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stoves" (
    "id" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "costPerPiece" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stoves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_transactions_billSno_key" ON "public"."b2b_transactions"("billSno");

-- CreateIndex
CREATE UNIQUE INDEX "bill_sequences_date_key" ON "public"."bill_sequences"("date");

-- CreateIndex
CREATE UNIQUE INDEX "cylinders_code_key" ON "public"."cylinders"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_vendorCode_key" ON "public"."vendors"("vendorCode");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "public"."invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "public"."system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_financial_reports_vendorId_reportDate_key" ON "public"."vendor_financial_reports"("vendorId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicleNumber_key" ON "public"."vehicles"("vehicleNumber");

-- AddForeignKey
ALTER TABLE "public"."b2b_transactions" ADD CONSTRAINT "b2b_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."b2b_transactions" ADD CONSTRAINT "b2b_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."b2b_transaction_items" ADD CONSTRAINT "b2b_transaction_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."b2b_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."b2b_transaction_items" ADD CONSTRAINT "b2b_transaction_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cylinders" ADD CONSTRAINT "cylinders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cylinders" ADD CONSTRAINT "cylinders_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_ledger" ADD CONSTRAINT "customer_ledger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cylinder_rentals" ADD CONSTRAINT "cylinder_rentals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cylinder_rentals" ADD CONSTRAINT "cylinder_rentals_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "public"."cylinders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cylinder_rentals" ADD CONSTRAINT "cylinder_rentals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_bank_details" ADD CONSTRAINT "vendor_bank_details_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_inventories" ADD CONSTRAINT "vendor_inventories_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_inventories" ADD CONSTRAINT "vendor_inventories_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "public"."cylinders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_payments" ADD CONSTRAINT "vendor_payments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_requests" ADD CONSTRAINT "support_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_orders" ADD CONSTRAINT "vendor_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_support_requests" ADD CONSTRAINT "vendor_support_requests_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_entries" ADD CONSTRAINT "purchase_entries_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_entries" ADD CONSTRAINT "purchase_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_financial_reports" ADD CONSTRAINT "vendor_financial_reports_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
