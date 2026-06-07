-- Creates billing_entries table for per-order payment/discount/charge history.
-- Safe to run multiple times (IF NOT EXISTS guards).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'billing_entries'
  ) THEN
    CREATE TABLE public.billing_entries (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
      type        TEXT NOT NULL CHECK (type IN ('discount', 'charge', 'payment')),
      created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

ALTER TABLE public.billing_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'billing_entries'
      AND policyname = 'Admins can manage billing entries'
  ) THEN
    CREATE POLICY "Admins can manage billing entries"
      ON public.billing_entries FOR ALL
      USING (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_billing_entries_order_id
  ON public.billing_entries (order_id);

NOTIFY pgrst, 'reload schema';
