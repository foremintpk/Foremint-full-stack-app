-- Migration: SS-4 / EIN generation pipeline
--
-- Brings the standalone ss4-app (project mywtgluivmrozhpmngsh) into Foremint as
-- a first-class admin section. Four concerns, four tables:
--
--   ss4_documents          one row per generated packet, with its Cloudinary URL
--   ss4_batch_attempts     the attempt ladder, CAPPED AT 6 (see below)
--   ss4_articles_cache     parsed Articles, so a filing is read at most once
--   ss4_name_verifications responsible-party names read off identity documents
--   ss4_settings           automation schedule + the Fazita API key
--
-- The three cache/state tables keep the column shapes they had in ss4-app so the
-- existing rows port across unchanged (see _ss4_seed_data.sql).
--
-- ATTEMPT CAP. ss4-app let the ladder climb without limit. Here it stops at 6:
-- an order already at 6 keeps generating documents, but the counter and the
-- banner stay pinned, so the 7th run reproduces the 6th packet byte for byte.
-- The cap is enforced in three places on purpose - a CHECK constraint here, the
-- least() in record_ss4_attempt(), and the service layer - because the counter
-- decides what gets printed on a filed federal form.

-- ---------------------------------------------------------------------------
-- 1. Attempt ladder
-- ---------------------------------------------------------------------------

create table if not exists public.ss4_batch_attempts (
  order_number      text primary key,
  -- Attempts already SENT. A missing row means "never submitted", so the next
  -- packet is attempt 1 - the plain, unbannered form.
  attempt           integer not null default 0 check (attempt >= 0 and attempt <= 6),
  last_company_name text,
  updated_at        timestamptz not null default now()
);

comment on table public.ss4_batch_attempts is
  'SS-4 attempt ladder. attempt = packets already sent for this order, hard-capped at 6.';
comment on column public.ss4_batch_attempts.attempt is
  'Capped at 6. Generation past 6 is allowed but never increments, so output stays identical.';

-- Advances the ladder atomically and returns the attempt number that was
-- actually recorded. Doing this in SQL rather than read-then-write keeps two
-- concurrent batch runs from both claiming the same attempt number.
--
-- At 6 it is a no-op that still returns 6, which is what pins the banner.
create or replace function public.record_ss4_attempt(
  p_order_number text,
  p_company_name text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt integer;
begin
  insert into public.ss4_batch_attempts (order_number, attempt, last_company_name, updated_at)
  values (p_order_number, 1, p_company_name, now())
  on conflict (order_number) do update
    set attempt           = least(public.ss4_batch_attempts.attempt + 1, 6),
        last_company_name = coalesce(excluded.last_company_name, public.ss4_batch_attempts.last_company_name),
        updated_at        = now()
  returning attempt into v_attempt;

  return v_attempt;
end;
$$;

comment on function public.record_ss4_attempt(text, text) is
  'Advances an order''s SS-4 attempt ladder and returns the recorded attempt. Saturates at 6.';

-- ---------------------------------------------------------------------------
-- 2. Parsed-document caches
-- ---------------------------------------------------------------------------

-- Keyed by document URL. Cloudinary URLs are version-stamped, so a re-uploaded
-- filing arrives under a new URL and misses the cache - which is what we want.
create table if not exists public.ss4_articles_cache (
  articles_url text primary key,
  extraction   jsonb not null,
  -- 'text-layer' when parsed locally for free, 'vision' when a model read it.
  source       text,
  created_at   timestamptz not null default now()
);

comment on table public.ss4_articles_cache is
  'Parsed Articles of Organization, so each filing is read at most once.';

create index if not exists ss4_articles_cache_source_idx
  on public.ss4_articles_cache (source);

create table if not exists public.ss4_name_verifications (
  document_url text primary key,
  -- Name exactly as printed on the ID, preserving its spelling and case.
  id_name      text,
  -- 'id-document' | 'operating-agreement' | 'order-form'
  source       text not null,
  -- 'verified' | 'ambiguous' | 'unverified'
  status       text not null,
  note         text,
  created_at   timestamptz not null default now()
);

comment on table public.ss4_name_verifications is
  'Responsible-party names read off identity documents, so each ID is read at most once.';

create index if not exists ss4_name_verifications_status_idx
  on public.ss4_name_verifications (status);

-- ---------------------------------------------------------------------------
-- 3. Generated document records
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'ss4_status') then
    create type public.ss4_status as enum ('pending', 'passed', 'failed');
  end if;
end $$;

create table if not exists public.ss4_documents (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  -- Denormalised so a record survives and stays searchable even if the order
  -- number is later edited; the batch keys on order_number throughout.
  order_number    text not null,

  status          public.ss4_status not null default 'pending',
  -- Populated only when status = 'failed'; the operator-facing reason.
  failure_reason  text,

  -- What actually went onto the form, kept for the records table so an admin
  -- can see the address used without reopening the PDF.
  company_name    text,
  address_used    text,
  member_count    integer check (member_count is null or member_count > 0),
  attempt_count   integer not null default 1 check (attempt_count >= 1 and attempt_count <= 6),

  -- Cloudinary secure URL of the generated packet (SS-4 + Articles).
  document_url    text,
  document_public_id text,
  page_count      integer,
  -- 0 means the Articles could not be appended; surfaced as a warning.
  articles_pages  integer,

  -- Full extraction + verification payloads, so a record is self-describing
  -- and the admin edit view can show what was read and from where.
  extraction      jsonb,
  verification    jsonb,

  -- Which run produced this, so a batch can be reviewed as a unit.
  batch_id        uuid,
  -- 'manual' | 'automatic'
  trigger_source  text not null default 'manual',
  generated_by    uuid references public.profiles(id) on delete set null,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.ss4_documents is
  'One row per generated SS-4 packet. The admin EIN section reads from here.';

create index if not exists ss4_documents_order_idx      on public.ss4_documents (order_id);
create index if not exists ss4_documents_order_num_idx  on public.ss4_documents (order_number);
create index if not exists ss4_documents_status_idx     on public.ss4_documents (status);
create index if not exists ss4_documents_batch_idx      on public.ss4_documents (batch_id);
create index if not exists ss4_documents_created_idx    on public.ss4_documents (created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Automation settings
-- ---------------------------------------------------------------------------

-- Single-row settings table. Vercel's cron schedule is static and committed at
-- deploy time, so it cannot express an admin-editable schedule. Instead the
-- cron fires hourly and this row decides whether a run is actually due.
create table if not exists public.ss4_settings (
  id                 boolean primary key default true check (id),

  -- false = manual only. The hourly cron checks this before doing anything.
  automation_enabled boolean not null default false,
  -- 0 = Sunday .. 6 = Saturday. Default: Monday and Thursday.
  schedule_days      smallint[] not null default array[1, 4]::smallint[],
  -- Local hour/minute in schedule_timezone. Default: 00:00.
  schedule_hour      smallint not null default 0  check (schedule_hour between 0 and 23),
  schedule_minute    smallint not null default 0  check (schedule_minute between 0 and 59),
  schedule_timezone  text not null default 'UTC',

  -- Guards against a double-run when the cron fires twice inside one window.
  last_run_at        timestamptz,
  last_run_batch_id  uuid,

  -- Fazita vision gateway, used to read Articles layouts the local parser
  -- cannot. Stored here rather than in env so an admin can rotate it without a
  -- redeploy. The table is service-role-only; the key never reaches a browser.
  vision_api_key     text,
  vision_model       text not null default 'claude-opus-5',

  -- Which uploaded template to fill. Null = the bundled default.
  active_template_id uuid,

  updated_at         timestamptz not null default now(),
  updated_by         uuid references public.profiles(id) on delete set null
);

comment on table public.ss4_settings is
  'Single-row SS-4 automation config: schedule, vision credentials, active template.';
comment on column public.ss4_settings.vision_api_key is
  'Fazita API key. Service-role only - never expose through PostgREST or a client component.';

insert into public.ss4_settings (id) values (true) on conflict (id) do nothing;

-- Uploaded SS-4 base templates. The bundled templates/ss4.pdf and multiss4.pdf
-- remain the fallback; a row here overrides them.
create table if not exists public.ss4_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  -- 'single' fills the disregarded-entity base, 'multi' the Partnership base.
  variant       text not null default 'single' check (variant in ('single', 'multi')),
  document_url  text not null,
  public_id     text,
  file_name     text,
  file_size     integer,
  is_active     boolean not null default false,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

comment on table public.ss4_templates is
  'Admin-uploaded SS-4 base templates. Falls back to the bundled templates/ when empty.';

create index if not exists ss4_templates_active_idx on public.ss4_templates (variant, is_active);

-- ---------------------------------------------------------------------------
-- 5. updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.ss4_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ss4_documents_touch on public.ss4_documents;
create trigger ss4_documents_touch
  before update on public.ss4_documents
  for each row execute function public.ss4_touch_updated_at();

drop trigger if exists ss4_settings_touch on public.ss4_settings;
create trigger ss4_settings_touch
  before update on public.ss4_settings
  for each row execute function public.ss4_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Row-level security
-- ---------------------------------------------------------------------------
--
-- These rows carry client PII (company name, mailing address, responsible
-- party) and, in ss4_settings, a live API key. Everything the browser sees goes
-- through server-side routes that already check the administrator role, so the
-- tables themselves are locked to the service role: RLS on, no policies, no
-- grants. That denies anon and authenticated outright while the service role
-- bypasses RLS entirely.
--
-- ss4_documents is the one exception: administrators read it directly through
-- the admin client, so it gets an explicit administrator-only SELECT policy.
-- The EIN section is administrator-only, matching /admin/settings.

alter table public.ss4_batch_attempts     enable row level security;
alter table public.ss4_articles_cache     enable row level security;
alter table public.ss4_name_verifications enable row level security;
alter table public.ss4_documents          enable row level security;
alter table public.ss4_settings           enable row level security;
alter table public.ss4_templates          enable row level security;

revoke all on public.ss4_batch_attempts     from anon, authenticated;
revoke all on public.ss4_articles_cache     from anon, authenticated;
revoke all on public.ss4_name_verifications from anon, authenticated;
revoke all on public.ss4_settings           from anon, authenticated;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ss4_documents'
      and policyname = 'Administrators can read ss4 documents'
  ) then
    create policy "Administrators can read ss4 documents"
      on public.ss4_documents for select
      using (public.get_my_role() = 'administrator');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ss4_templates'
      and policyname = 'Administrators can read ss4 templates'
  ) then
    create policy "Administrators can read ss4 templates"
      on public.ss4_templates for select
      using (public.get_my_role() = 'administrator');
  end if;
end $$;

-- The RPC is service-role only; nothing in the browser may advance the ladder.
revoke all on function public.record_ss4_attempt(text, text) from anon, authenticated, public;

notify pgrst, 'reload schema';
