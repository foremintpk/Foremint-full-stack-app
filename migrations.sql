DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='addons_total') THEN
    ALTER TABLE public.orders ADD COLUMN addons_total NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='formation_total') THEN
    ALTER TABLE public.orders ADD COLUMN formation_total NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='grand_total') THEN
    ALTER TABLE public.orders ADD COLUMN grand_total NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='state_fee') THEN
    ALTER TABLE public.orders ADD COLUMN state_fee NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='package_price') THEN
    ALTER TABLE public.orders ADD COLUMN package_price NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status') THEN
    ALTER TABLE public.orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='pricing_snapshot') THEN
    ALTER TABLE public.orders ADD COLUMN pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='addons_snapshot') THEN
    ALTER TABLE public.orders ADD COLUMN addons_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='selected_addons') THEN
    ALTER TABLE public.orders ADD COLUMN selected_addons TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='entity_type') THEN
    ALTER TABLE public.orders ADD COLUMN entity_type TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='member_type') THEN
    ALTER TABLE public.orders ADD COLUMN member_type TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='formation_state') THEN
    ALTER TABLE public.orders ADD COLUMN formation_state TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='formation_state_name') THEN
    ALTER TABLE public.orders ADD COLUMN formation_state_name TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='formation_package') THEN
    ALTER TABLE public.orders ADD COLUMN formation_package TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='submitted_at') THEN
    ALTER TABLE public.orders ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='onboarding_drafts' AND column_name='status') THEN
    ALTER TABLE public.onboarding_drafts ADD COLUMN status TEXT NOT NULL DEFAULT 'in_progress'
      CHECK (status IN ('in_progress', 'submitted', 'expired'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupons') THEN
    CREATE TABLE public.coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'amount')),
      discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_uses INTEGER NOT NULL DEFAULT 0,
      used_count INTEGER NOT NULL DEFAULT 0,
      per_user_uses INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupon_usages') THEN
    CREATE TABLE public.coupon_usages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      order_id UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
      discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON public.coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON public.coupon_usages (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order_id ON public.coupon_usages (order_id);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Ensure admin_overview_stats runs with the querying user's privileges.
-- SECURITY INVOKER makes Postgres apply the caller's SELECT grants and RLS policies
-- on the underlying tables instead of the view owner's privileges.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'admin_overview_stats'
      AND c.relkind = 'v'
  ) THEN
    ALTER VIEW public.admin_overview_stats SET (security_invoker = true);
    REVOKE ALL ON public.admin_overview_stats FROM PUBLIC;
    GRANT SELECT ON public.admin_overview_stats TO authenticated;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
