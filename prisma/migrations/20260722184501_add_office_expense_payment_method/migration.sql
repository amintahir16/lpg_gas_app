-- AlterTable
ALTER TABLE "office_expenses" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'CASH';
