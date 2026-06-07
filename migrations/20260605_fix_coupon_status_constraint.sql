-- Ensure coupon soft-delete status is accepted in live databases.
-- Run this against the Supabase database that backs the app.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'coupons'
  ) THEN
    ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_status_check;
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_status_check
      CHECK (status IN ('active', 'inactive', 'deleted'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
