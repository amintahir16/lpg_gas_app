-- AlterEnum: add mobile-wallet payment methods used by B2B and vendor flows.
-- Legacy values (CHECK, CREDIT_CARD, DEBIT_CARD, WIRE_TRANSFER) are retained
-- so existing payment rows remain valid.

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'EASYPAISA';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'JAZZ_CASH';
