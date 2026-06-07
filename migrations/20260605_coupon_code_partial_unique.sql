-- Allow deleted coupons to free up their code for reuse.
-- Replaces the blanket unique constraint on coupons.code with a partial
-- unique index that only applies to non-deleted rows.

DO $$
BEGIN
  -- Drop the existing unique constraint (may be named coupons_code_key or similar)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'coupons'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'coupons_code_key'
  ) THEN
    ALTER TABLE public.coupons DROP CONSTRAINT coupons_code_key;
  END IF;

  -- Drop any old partial index if this migration is re-run
  DROP INDEX IF EXISTS public.coupons_code_unique_active;
END $$;

-- Only enforce uniqueness for rows that are NOT soft-deleted
CREATE UNIQUE INDEX coupons_code_unique_active
  ON public.coupons (code)
  WHERE status != 'deleted';

NOTIFY pgrst, 'reload schema';
