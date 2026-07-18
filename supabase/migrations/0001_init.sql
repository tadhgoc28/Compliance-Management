-- 0001_init.sql
-- Extensions, shared enums, tenancy primitives and common triggers.

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
--
-- These are deliberately discipline-neutral. Anything that only makes sense for
-- one discipline (asbestos material types, fire door ratings) belongs in a
-- payload, never here. See 0003_compliance.sql.
-- ---------------------------------------------------------------------------

create type public.org_role as enum ('owner', 'admin', 'manager', 'surveyor', 'viewer');

create type public.asset_status as enum ('planned', 'active', 'inactive', 'demolished');

create type public.inspection_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');

create type public.finding_status as enum ('open', 'monitoring', 'in_remediation', 'remediated', 'removed', 'closed');

-- Normalised across every discipline so the dashboard can rank findings without
-- knowing what they are. Discipline-native scoring (e.g. an asbestos material
-- assessment score) lives in the payload and maps onto this.
create type public.finding_severity as enum ('critical', 'high', 'medium', 'low', 'info');

create type public.document_kind as enum ('report', 'certificate', 'drawing', 'photo', 'permit', 'other');

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------

create table public.organisations (
  id          uuid primary key default extensions.uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.organisations is
  'Tenant root. Every business row in this database carries an org_id back to here.';

-- Mirrors auth.users. Kept separate so we can attach profile data without
-- touching the auth schema.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A user may belong to several organisations. This matters for the commercial
-- case: a surveying consultancy works across many client estates, and modelling
-- it as one-org-per-user would force duplicate accounts later.
create table public.memberships (
  id          uuid primary key default extensions.uuid_generate_v4(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  org_id      uuid not null references public.organisations (id) on delete cascade,
  role        public.org_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, org_id)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_org_id_idx on public.memberships (org_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so that RLS policies on other tables can consult memberships
-- without recursing back through memberships' own policies.
create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.memberships where user_id = auth.uid();
$$;

create or replace function public.has_org_role(target_org uuid, allowed public.org_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.org_id = target_org
      and m.role = any (allowed)
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create a profile row automatically whenever Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger organisations_set_updated_at
  before update on public.organisations
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();
