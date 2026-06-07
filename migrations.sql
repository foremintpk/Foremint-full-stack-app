-- Create order_client_notifications table if it does not exist
CREATE TABLE IF NOT EXISTS public.order_client_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  category      TEXT NOT NULL DEFAULT 'general',
  title         TEXT NOT NULL,
  body          TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  send_email    BOOLEAN NOT NULL DEFAULT false,
  email_subject TEXT,
  email_body    TEXT,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-order lookups
CREATE INDEX IF NOT EXISTS idx_order_client_notifications_order_id
  ON public.order_client_notifications(order_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='cloudinary_resource_type') THEN
    ALTER TABLE public.documents ADD COLUMN cloudinary_resource_type TEXT DEFAULT NULL;
  END IF;
END $$;

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
      total_uses INTEGER NOT NULL DEFAULT -1 CHECK (total_uses = -1 OR total_uses >= 1),
      used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
      per_user_uses INTEGER NOT NULL DEFAULT -1 CHECK (per_user_uses = -1 OR per_user_uses >= 1),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coupons'
  ) THEN
    ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_total_uses_check;
    ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_used_count_check;
    ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_per_user_uses_check;
    ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_status_check;
    ALTER TABLE public.coupons ALTER COLUMN total_uses SET DEFAULT -1;
    ALTER TABLE public.coupons ALTER COLUMN per_user_uses SET DEFAULT -1;

    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_total_uses_check CHECK (total_uses = -1 OR total_uses >= 1),
      ADD CONSTRAINT coupons_used_count_check CHECK (used_count >= 0),
      ADD CONSTRAINT coupons_per_user_uses_check CHECK (per_user_uses = -1 OR per_user_uses >= 1),
      ADD CONSTRAINT coupons_status_check CHECK (status IN ('active', 'inactive', 'deleted'));
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

DO $$ BEGIN
  ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coupons'
      AND policyname = 'Admins and managers can manage coupons'
  ) THEN
    CREATE POLICY "Admins and managers can manage coupons"
      ON public.coupons
      FOR ALL
      USING (public.get_my_role() IN ('administrator', 'manager'))
      WITH CHECK (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coupons'
      AND policyname = 'Admins and managers can delete coupons'
  ) THEN
    CREATE POLICY "Admins and managers can delete coupons"
      ON public.coupons
      FOR DELETE
      USING (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coupon_usages'
      AND policyname = 'Admins and managers can view coupon usages'
  ) THEN
    CREATE POLICY "Admins and managers can view coupon usages"
      ON public.coupon_usages
      FOR SELECT
      USING (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

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

-- ============================================================
-- audit_logs: add INSERT policy (only SELECT existed before)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs'
      AND policyname = 'Admins and managers can insert audit logs'
  ) THEN
    CREATE POLICY "Admins and managers can insert audit logs"
      ON public.audit_logs FOR INSERT
      WITH CHECK (
        public.get_my_role() IN ('administrator', 'manager')
        OR auth.uid() IS NOT NULL  -- allow service-role actions (auth.uid() is NULL for service role, skip)
      );
  END IF;
END $$;

-- Also allow authenticated users to insert their own audit log entries
-- (needed for customer-facing server actions that log audits)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs'
      AND policyname = 'Authenticated users can insert own audit logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert own audit logs"
      ON public.audit_logs FOR INSERT
      WITH CHECK (actor_id = auth.uid());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- RLS policies for tables created outside the initial setup
-- ============================================================

-- order_status_history
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_status_history') THEN
    ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_status_history' AND policyname='Admins and managers can manage order status history') THEN
    CREATE POLICY "Admins and managers can manage order status history"
      ON public.order_status_history FOR ALL
      USING (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_status_history' AND policyname='Customers can view own order status history') THEN
    CREATE POLICY "Customers can view own order status history"
      ON public.order_status_history FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = order_id AND o.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- order_internal_addons
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_internal_addons') THEN
    ALTER TABLE public.order_internal_addons ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_internal_addons' AND policyname='Admins and managers can manage internal addons') THEN
    CREATE POLICY "Admins and managers can manage internal addons"
      ON public.order_internal_addons FOR ALL
      USING (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

-- admin_order_views
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_order_views') THEN
    ALTER TABLE public.admin_order_views ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_order_views' AND policyname='Admins and managers can manage order views') THEN
    CREATE POLICY "Admins and managers can manage order views"
      ON public.admin_order_views FOR ALL
      USING (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

-- document_resubmission_requests
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='document_resubmission_requests') THEN
    ALTER TABLE public.document_resubmission_requests ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_resubmission_requests' AND policyname='Admins and managers can manage resubmission requests') THEN
    CREATE POLICY "Admins and managers can manage resubmission requests"
      ON public.document_resubmission_requests FOR ALL
      USING (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_resubmission_requests' AND policyname='Customers can view own resubmission requests') THEN
    CREATE POLICY "Customers can view own resubmission requests"
      ON public.document_resubmission_requests FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = order_id AND o.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- notifications
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Admins can manage all notifications') THEN
    CREATE POLICY "Admins can manage all notifications"
      ON public.notifications FOR ALL
      USING (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Authenticated users can insert notifications') THEN
    CREATE POLICY "Authenticated users can insert notifications"
      ON public.notifications FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- onboarding_drafts
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='onboarding_drafts') THEN
    ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='onboarding_drafts' AND policyname='Customers can manage own drafts') THEN
    CREATE POLICY "Customers can manage own drafts"
      ON public.onboarding_drafts FOR ALL
      USING (user_id = auth.uid());
  END IF;
END $$;

-- onboarding-documents storage bucket: create if missing
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-documents', 'onboarding-documents', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Admins can manage onboarding documents'
  ) THEN
    CREATE POLICY "Admins can manage onboarding documents"
      ON storage.objects FOR ALL
      USING (
        bucket_id = 'onboarding-documents' AND
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('administrator', 'manager')
        )
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- LLC Order Management Enhancement Tables
-- ============================================================

-- billing_entries: history of charges, discounts, and payments per order
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='billing_entries') THEN
    CREATE TABLE public.billing_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      type TEXT NOT NULL CHECK (type IN ('discount', 'charge', 'payment')),
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

ALTER TABLE public.billing_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_entries' AND policyname='Admins can manage billing entries') THEN
    CREATE POLICY "Admins can manage billing entries"
      ON public.billing_entries FOR ALL
      USING (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

-- order_client_notifications: notifications pushed to the client dashboard
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_client_notifications') THEN
    CREATE TABLE public.order_client_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('billing', 'documents', 'general', 'addons')),
      title TEXT NOT NULL,
      body TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      send_email BOOLEAN NOT NULL DEFAULT FALSE,
      email_subject TEXT,
      email_body TEXT,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    );
  END IF;
END $$;

ALTER TABLE public.order_client_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_client_notifications' AND policyname='Admins can manage order notifications') THEN
    CREATE POLICY "Admins can manage order notifications"
      ON public.order_client_notifications FOR ALL
      USING (public.get_my_role() IN ('administrator', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_client_notifications' AND policyname='Customers can view own order notifications') THEN
    CREATE POLICY "Customers can view own order notifications"
      ON public.order_client_notifications FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = order_id AND o.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add is_internal flag to query_messages if not present (for ticket system)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='query_messages' AND column_name='is_internal') THEN
    ALTER TABLE public.query_messages ADD COLUMN is_internal BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_billing_entries_order_id ON public.billing_entries (order_id);
CREATE INDEX IF NOT EXISTS idx_order_client_notifications_order_id ON public.order_client_notifications (order_id);

-- Add missing formation details columns to companies table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='filing_id') THEN
    ALTER TABLE public.companies ADD COLUMN filing_id TEXT;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='formation_date') THEN
    ALTER TABLE public.companies ADD COLUMN formation_date TEXT;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='state_renewal_date') THEN
    ALTER TABLE public.companies ADD COLUMN state_renewal_date TEXT;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='state_renewal_fees') THEN
    ALTER TABLE public.companies ADD COLUMN state_renewal_fees NUMERIC(10,2);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='trading_address') THEN
    ALTER TABLE public.companies ADD COLUMN trading_address JSONB;
  END IF;
END $$;

-- Allow customers to read companies that are linked to their own orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='companies' AND policyname='Customers can read own companies') THEN
    CREATE POLICY "Customers can read own companies"
      ON public.companies FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.company_id = id AND o.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── Ticketing RLS: customers can create & reply to their own support tickets ──
DROP POLICY IF EXISTS "Customers can manage own queries" ON public.queries;
DROP POLICY IF EXISTS "Customers can create own queries" ON public.queries;
DROP POLICY IF EXISTS "Customers can view own queries"   ON public.queries;
DROP POLICY IF EXISTS "Customers can update own queries" ON public.queries;

CREATE POLICY "Customers can create own queries"
  ON public.queries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Customers can view own queries"
  ON public.queries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Customers can update own queries"
  ON public.queries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert messages for own queries" ON public.query_messages;
DROP POLICY IF EXISTS "Customers can insert own query messages"    ON public.query_messages;

CREATE POLICY "Customers can insert own query messages"
  ON public.query_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.queries q
      WHERE q.id = query_id AND q.user_id = auth.uid()
    )
  );

-- ─── Customer READ access: notifications + ticket messages ────────────────────
-- Without these SELECT policies the customer's RLS client returns ZERO rows,
-- so notifications never appear and ticket messages are invisible.
DROP POLICY IF EXISTS "Customers can read own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Customers can update own notifications" ON public.notifications;

CREATE POLICY "Customers can read own notifications"
  ON public.notifications FOR SELECT
  USING (
    recipient_id = auth.uid()
    OR (recipient_id IS NULL AND target_role = 'customer')
  );

CREATE POLICY "Customers can update own notifications"
  ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can view messages for own queries" ON public.query_messages;
DROP POLICY IF EXISTS "Customers can view own query messages"   ON public.query_messages;

CREATE POLICY "Customers can view own query messages"
  ON public.query_messages FOR SELECT
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.queries q
      WHERE q.id = query_id AND q.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';

-- ─── Admin Support Queries & Messages Policies ──────────────────────────────

-- Allow admins/managers to do select, insert, update, delete on queries
DROP POLICY IF EXISTS "Admins and managers can view all queries" ON public.queries;
CREATE POLICY "Admins and managers can view all queries"
  ON public.queries FOR SELECT
  USING (public.get_my_role() IN ('administrator', 'manager'));

DROP POLICY IF EXISTS "Admins and managers can update all queries" ON public.queries;
CREATE POLICY "Admins and managers can update all queries"
  ON public.queries FOR UPDATE
  USING (public.get_my_role() IN ('administrator', 'manager'))
  WITH CHECK (public.get_my_role() IN ('administrator', 'manager'));

DROP POLICY IF EXISTS "Admins and managers can insert queries" ON public.queries;
CREATE POLICY "Admins and managers can insert queries"
  ON public.queries FOR INSERT
  WITH CHECK (public.get_my_role() IN ('administrator', 'manager'));

DROP POLICY IF EXISTS "Admins and managers can delete queries" ON public.queries;
CREATE POLICY "Admins and managers can delete queries"
  ON public.queries FOR DELETE
  USING (public.get_my_role() IN ('administrator', 'manager'));

-- Allow admins/managers to do select, insert, update, delete on query_messages
DROP POLICY IF EXISTS "Admins and managers can view all query messages" ON public.query_messages;
CREATE POLICY "Admins and managers can view all query messages"
  ON public.query_messages FOR SELECT
  USING (public.get_my_role() IN ('administrator', 'manager'));

DROP POLICY IF EXISTS "Admins and managers can insert query messages" ON public.query_messages;
CREATE POLICY "Admins and managers can insert query messages"
  ON public.query_messages FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('administrator', 'manager')
    AND sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins and managers can update query messages" ON public.query_messages;
CREATE POLICY "Admins and managers can update query messages"
  ON public.query_messages FOR UPDATE
  USING (public.get_my_role() IN ('administrator', 'manager'))
  WITH CHECK (public.get_my_role() IN ('administrator', 'manager'));

DROP POLICY IF EXISTS "Admins and managers can delete query messages" ON public.query_messages;
CREATE POLICY "Admins and managers can delete query messages"
  ON public.query_messages FOR DELETE
  USING (public.get_my_role() IN ('administrator', 'manager'));

-- Add queries table to the supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'queries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queries;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';


