-- ─────────────────────────────────────────────────────────────────────────────
-- Payment Pending status + payment reminder send log
--
-- 1. Adds `payment_pending` to the order_status enum. It sits after `formed`
--    because it describes an order whose formation work is finished and is
--    waiting only on the customer's outstanding balance.
--
-- 2. Creates payment_reminder_log so the bulk reminder in the LLC Registrations
--    list can show when a customer was last contacted and avoid emailing the
--    same person twice by accident.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Enum value ────────────────────────────────────────────────────────────
-- ADD VALUE cannot run inside a transaction block in older Postgres, and cannot
-- be rolled back. IF NOT EXISTS makes the migration safe to re-run.
alter type public.order_status add value if not exists 'payment_pending' after 'formed';

-- ── 2. Reminder send log ─────────────────────────────────────────────────────
create table if not exists public.payment_reminder_log (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  sent_to       text not null,
  sent_by       uuid references public.profiles(id) on delete set null,
  -- 'sent' or 'failed'; failures are recorded so an admin can retry knowingly.
  status        text not null default 'sent',
  error_message text,
  sent_at       timestamptz not null default now()
);

-- The list view reads "when was this order last reminded", so order_id leads.
create index if not exists payment_reminder_log_order_id_sent_at_idx
  on public.payment_reminder_log (order_id, sent_at desc);

alter table public.payment_reminder_log enable row level security;

-- Staff-only. Customers never read their own reminder history, and all writes
-- go through the service-role client in the server action.
drop policy if exists "Staff can read payment reminder log" on public.payment_reminder_log;
create policy "Staff can read payment reminder log"
  on public.payment_reminder_log
  for select
  to authenticated
  using (
    public.get_my_role() = any (
      array['administrator'::user_role, 'manager'::user_role, 'account_manager'::user_role]
    )
  );
