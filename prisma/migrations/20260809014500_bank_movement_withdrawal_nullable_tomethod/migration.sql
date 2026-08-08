-- Allow WITHDRAWAL movements with no destination wallet (toMethod null).
-- DEPOSIT / TRANSFER still set toMethod; WITHDRAWAL only sets fromMethod.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bank_movements'
      AND column_name = 'toMethod'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "bank_movements" ALTER COLUMN "toMethod" DROP NOT NULL;
  END IF;
END $$;
