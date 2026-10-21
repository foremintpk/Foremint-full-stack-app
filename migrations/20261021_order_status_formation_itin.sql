-- ─────────────────────────────────────────────────────────────────────────────
-- Order status overhaul: new formation stages + ITIN track
--
-- Final status list, in presentation order:
--   pending · initialized · submitted_in_state · formed_in_state · ein_pending ·
--   pending_payment · formation_completed ·
--   itin_initialized · itin_in_progress · itin_received · itin_payment_pending ·
--   itin_process_completed          (+ cancelled, not selectable in the UI)
--
-- What changes for existing data
--   • 'formed'          → renamed to 'formation_completed'
--   • 'payment_pending' → renamed to 'pending_payment'
--   RENAME VALUE rewrites the label in the enum itself, so every existing order
--   (and anything else typed order_status) follows automatically — no UPDATE of
--   orders is needed and nothing is left behind under the old name.
--   • 'formed_in_state' and the five ITIN values are new; no old order lands on
--     them.
--
-- Enum sort order: Postgres orders enum values by position, and 'pending_payment'
-- (renamed in place) sits after 'formation_completed'. The app presents statuses
-- from src/lib/orders/orderStatus.ts and never ORDER BYs the enum, so the stored
-- position is irrelevant. Do not add an ORDER BY status without revisiting this.
--
-- Safe to re-run: every step checks before acting.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Rename the two values that changed meaning ────────────────────────────
-- RENAME VALUE has no IF EXISTS form, so guard it against a second run.
do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'order_status' and e.enumlabel = 'formed'
  ) then
    alter type public.order_status rename value 'formed' to 'formation_completed';
  end if;

  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'order_status' and e.enumlabel = 'payment_pending'
  ) then
    alter type public.order_status rename value 'payment_pending' to 'pending_payment';
  end if;
end $$;

-- ── 2. New values ────────────────────────────────────────────────────────────
-- ADD VALUE cannot be rolled back, and a value added in a transaction cannot be
-- used until that transaction commits — nothing below uses them, so one script
-- is fine. IF NOT EXISTS makes each line safe to re-run.
alter type public.order_status add value if not exists 'formed_in_state' after 'submitted_in_state';

alter type public.order_status add value if not exists 'itin_initialized'       after 'formation_completed';
alter type public.order_status add value if not exists 'itin_in_progress'       after 'itin_initialized';
alter type public.order_status add value if not exists 'itin_received'          after 'itin_in_progress';
alter type public.order_status add value if not exists 'itin_payment_pending'   after 'itin_received';
alter type public.order_status add value if not exists 'itin_process_completed' after 'itin_payment_pending';

-- ── 3. Relabel the audit trail ───────────────────────────────────────────────
-- order_status_history stores statuses as text, so it does not follow the enum
-- rename. Without this, the history tab would show 'formed' / 'payment_pending'
-- for orders that now read 'formation_completed' / 'pending_payment'.
update public.order_status_history set old_status = 'formation_completed' where old_status = 'formed';
update public.order_status_history set new_status = 'formation_completed' where new_status = 'formed';
update public.order_status_history set old_status = 'pending_payment'     where old_status = 'payment_pending';
update public.order_status_history set new_status = 'pending_payment'     where new_status = 'payment_pending';

-- ── 4. Verify (read-only; run by hand after the migration) ───────────────────
-- 4a. The enum, in stored order — expect all 13 values and no 'formed' /
--     'payment_pending':
--       select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid
--       where t.typname = 'order_status' order by e.enumsortorder;
--
-- 4b. Database code that still names a renamed value as a text literal would now
--     fail at run time (Postgres does not validate those at rename). Expect no
--     rows from either query:
--       select proname from pg_proc
--       where prosrc ~* $q$'(formed|payment_pending)'$q$
--         and pronamespace = 'public'::regnamespace;
--
--       select schemaname, tablename, policyname from pg_policies
--       where coalesce(qual, '') || coalesce(with_check, '') ~* $q$(formed|payment_pending)$q$;
