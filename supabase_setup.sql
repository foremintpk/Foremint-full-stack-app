-- ============================================================
-- FOREMINT DATABASE SCHEMA
-- Run this entire script in the Supabase SQL Editor
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- SECTION 1: USER PROFILES & ROLES
-- ============================================================

-- Roles enum
create type user_role as enum ('administrator', 'manager', 'customer');

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  phone         text,
  role          user_role not null default 'customer',
  avatar_url    text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create profile on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- SECTION 2: COMPANY INFORMATION
-- ============================================================

create type company_structure as enum (
  'single_member_llc',
  'multi_member_llc',
  'series_llc',
  'professional_llc'
);

create table public.companies (
  id                  uuid primary key default uuid_generate_v4(),
  owner_id            uuid not null references public.profiles(id) on delete cascade,
  company_name        text not null,
  dba_name            text,
  structure           company_structure,
  state_of_formation  text,
  ein                 text,                    -- Employer Identification Number
  registered_agent    text,
  business_address    jsonb,                   -- { street, city, state, zip, country }
  mailing_address     jsonb,
  industry            text,
  description         text,
  website             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- SECTION 3: ONBOARDING
-- ============================================================

create type onboarding_status as enum (
  'not_started',
  'in_progress',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'needs_revision'
);

create table public.onboarding_submissions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  company_id      uuid references public.companies(id) on delete set null,
  status          onboarding_status not null default 'not_started',
  current_step    integer not null default 1,  -- 1-4
  form_data       jsonb not null default '{}', -- Draft data per step
  submitted_at    timestamptz,
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  review_notes    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint one_submission_per_user unique (user_id)
);

-- ============================================================
-- SECTION 4: DOCUMENTS
-- ============================================================

create type document_type as enum (
  'identity',
  'articles_of_organization',
  'operating_agreement',
  'ein_letter',
  'annual_report',
  'contract',
  'invoice',
  'other'
);

create type storage_provider as enum ('supabase', 'cloudinary');

create table public.documents (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  company_id        uuid references public.companies(id) on delete set null,
  onboarding_id     uuid references public.onboarding_submissions(id) on delete set null,
  order_id          uuid,                       -- FK added after orders table
  name              text not null,
  original_filename text not null,
  file_type         text not null,              -- MIME type
  file_size         integer not null,           -- bytes
  provider          storage_provider not null,
  storage_path      text not null,              -- Supabase path OR Cloudinary public_id
  public_url        text,                       -- Direct access URL
  document_type     document_type not null default 'other',
  is_admin_upload   boolean not null default false,
  uploaded_by       uuid references public.profiles(id),
  created_at        timestamptz not null default now()
);

-- ============================================================
-- SECTION 5: SERVICES & ORDERS
-- ============================================================

create type order_status as enum (
  'pending',
  'confirmed',
  'in_progress',
  'awaiting_documents',
  'awaiting_payment',
  'completed',
  'cancelled',
  'refunded'
);

create table public.services (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,
  description   text,
  price         numeric(10, 2) not null,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create table public.orders (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  company_id      uuid references public.companies(id) on delete set null,
  service_id      uuid not null references public.services(id),
  status          order_status not null default 'pending',
  amount          numeric(10, 2) not null,
  notes           text,
  admin_notes     text,
  assigned_to     uuid references public.profiles(id),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Add the order FK back to documents now that orders table exists
alter table public.documents
  add constraint documents_order_id_fkey
  foreign key (order_id) references public.orders(id) on delete set null;

-- ============================================================
-- SECTION 6: MESSAGES / QUERIES
-- ============================================================

create type query_status as enum ('open', 'in_progress', 'resolved', 'closed');

create table public.queries (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  order_id      uuid references public.orders(id) on delete set null,
  subject       text not null,
  status        query_status not null default 'open',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.query_messages (
  id          uuid primary key default uuid_generate_v4(),
  query_id    uuid not null references public.queries(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id),
  content     text not null,
  is_internal boolean not null default false,  -- admin-only notes
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SECTION 7: AUDIT LOGS
-- ============================================================

create table public.audit_logs (
  id            uuid primary key default uuid_generate_v4(),
  actor_id      uuid references public.profiles(id) on delete set null,
  action        text not null,                 -- e.g. 'order.created', 'user.role_changed'
  entity_type   text not null,                 -- 'order', 'user', 'document', etc.
  entity_id     uuid,
  metadata      jsonb not null default '{}',
  ip_address    text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- SECTION 8: UPDATED_AT TRIGGER (apply to all relevant tables)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.onboarding_submissions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.queries
  for each row execute function public.set_updated_at();

-- ============================================================
-- SECTION 9: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.onboarding_submissions enable row level security;
alter table public.documents enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.queries enable row level security;
alter table public.query_messages enable row level security;
alter table public.audit_logs enable row level security;

-- Helper function to get current user's role
create or replace function public.get_my_role()
returns user_role
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ── PROFILES ──
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Admins and managers can view all profiles"
  on public.profiles for select
  using (public.get_my_role() in ('administrator', 'manager'));

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.get_my_role() = 'administrator');

-- ── COMPANIES ──
create policy "Customers can manage own company"
  on public.companies for all
  using (owner_id = auth.uid());

create policy "Admins and managers can view all companies"
  on public.companies for select
  using (public.get_my_role() in ('administrator', 'manager'));

create policy "Admins can manage all companies"
  on public.companies for all
  using (public.get_my_role() = 'administrator');

-- ── ONBOARDING ──
create policy "Customers can manage own onboarding"
  on public.onboarding_submissions for all
  using (user_id = auth.uid());

create policy "Admins and managers can view all onboarding"
  on public.onboarding_submissions for select
  using (public.get_my_role() in ('administrator', 'manager'));

create policy "Admins can update onboarding status"
  on public.onboarding_submissions for update
  using (public.get_my_role() in ('administrator', 'manager'));

-- ── DOCUMENTS ──
create policy "Users can view own documents"
  on public.documents for select
  using (user_id = auth.uid());

create policy "Users can insert own documents"
  on public.documents for insert
  with check (user_id = auth.uid());

create policy "Admins can manage all documents"
  on public.documents for all
  using (public.get_my_role() in ('administrator', 'manager'));

-- ── SERVICES ──
create policy "Anyone authenticated can view active services"
  on public.services for select
  using (auth.uid() is not null and is_active = true);

create policy "Admins can manage services"
  on public.services for all
  using (public.get_my_role() = 'administrator');

-- ── ORDERS ──
create policy "Customers can view own orders"
  on public.orders for select
  using (user_id = auth.uid());

create policy "Customers can create orders"
  on public.orders for insert
  with check (user_id = auth.uid());

create policy "Admins and managers can manage all orders"
  on public.orders for all
  using (public.get_my_role() in ('administrator', 'manager'));

-- ── QUERIES ──
create policy "Customers can manage own queries"
  on public.queries for all
  using (user_id = auth.uid());

create policy "Admins and managers can manage all queries"
  on public.queries for all
  using (public.get_my_role() in ('administrator', 'manager'));

-- ── QUERY MESSAGES ──
create policy "Users can view messages for own queries"
  on public.query_messages for select
  using (
    exists (
      select 1 from public.queries q
      where q.id = query_id and q.user_id = auth.uid()
    )
    and is_internal = false
  );

create policy "Admins can view all messages including internal"
  on public.query_messages for select
  using (public.get_my_role() in ('administrator', 'manager'));

create policy "Users can insert messages for own queries"
  on public.query_messages for insert
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.queries q
      where q.id = query_id and q.user_id = auth.uid()
    )
  );

create policy "Admins can insert any message"
  on public.query_messages for insert
  with check (
    sender_id = auth.uid() and
    public.get_my_role() in ('administrator', 'manager')
  );

-- ── AUDIT LOGS ──
create policy "Admins can view audit logs"
  on public.audit_logs for select
  using (public.get_my_role() = 'administrator');

-- ============================================================
-- STORAGE SETUP
-- ============================================================

-- Create storage buckets
insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),   -- private — signed URLs only
  ('avatars', 'avatars', true);         -- public — profile pictures

-- Storage RLS: documents bucket
create policy "Users can upload own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own documents"
  on storage.objects for select
  using (
    bucket_id = 'documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Admins can access all documents"
  on storage.objects for all
  using (
    bucket_id = 'documents' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('administrator', 'manager')
    )
  );

-- Storage RLS: avatars bucket (public read, own write)
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- ============================================================
-- SEED DATA
-- ============================================================

insert into public.services (name, slug, description, price, sort_order) values
  ('LLC Formation', 'llc-formation', 'Complete LLC formation service including state filing', 299.00, 1),
  ('Registered Agent Service', 'registered-agent', 'Annual registered agent service', 99.00, 2),
  ('EIN Application', 'ein-application', 'Federal EIN / Tax ID number application', 79.00, 3),
  ('Operating Agreement', 'operating-agreement', 'Custom operating agreement drafting', 149.00, 4),
  ('Annual Report Filing', 'annual-report', 'State annual report filing service', 99.00, 5),
  ('Business License Research', 'business-license', 'Research required business licenses for your industry', 129.00, 6);
