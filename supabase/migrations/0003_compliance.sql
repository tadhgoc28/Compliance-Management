-- 0003_compliance.sql
-- The discipline-agnostic compliance core.
--
-- Design rule for this file: no table here may contain a column that only makes
-- sense for one discipline. "material_type" and "door_rating" are payload keys,
-- not columns. If you ever feel the urge to add `asbestos_score` to findings,
-- add it to the asbestos JSON Schema instead.

-- ---------------------------------------------------------------------------
-- Disciplines and their schema registry
-- ---------------------------------------------------------------------------

-- org_id null means a system discipline available to every tenant. A non-null
-- org_id lets a customer define one of their own without a code change.
create table public.disciplines (
  id          uuid primary key default extensions.uuid_generate_v4(),
  org_id      uuid references public.organisations (id) on delete cascade,
  code        text not null,
  name        text not null,
  description text,
  -- Tailwind-friendly accent used consistently in the UI for this discipline.
  colour      text not null default 'slate',
  icon        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Unique per tenant, and unique globally for system disciplines.
create unique index disciplines_org_code_idx
  on public.disciplines (org_id, code) where org_id is not null;
create unique index disciplines_system_code_idx
  on public.disciplines (code) where org_id is null;

-- The registry that makes payloads safe. Each discipline declares the shape of
-- its inspection and finding payloads as a JSON Schema, versioned so historic
-- records stay readable after the schema evolves.
create table public.discipline_schemas (
  id            uuid primary key default extensions.uuid_generate_v4(),
  discipline_id uuid not null references public.disciplines (id) on delete cascade,
  target        text not null check (target in ('inspection', 'finding')),
  version       integer not null default 1,
  json_schema   jsonb not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (discipline_id, target, version)
);

-- Exactly one active schema per discipline/target at a time.
create unique index discipline_schemas_one_active_idx
  on public.discipline_schemas (discipline_id, target) where is_active;

-- ---------------------------------------------------------------------------
-- What is required, of which asset, how often
-- ---------------------------------------------------------------------------

-- The join that says "this building is subject to asbestos AND fire AND
-- legionella, at these frequencies". This table is what makes the dashboard
-- possible: without it you can only report on inspections that happened, never
-- on the ones that should have.
create table public.asset_disciplines (
  id                 uuid primary key default extensions.uuid_generate_v4(),
  org_id             uuid not null references public.organisations (id) on delete cascade,
  asset_id           uuid not null references public.assets (id) on delete cascade,
  discipline_id      uuid not null references public.disciplines (id) on delete restrict,
  frequency_months   integer check (frequency_months is null or frequency_months > 0),
  last_inspection_at date,
  next_due_date      date,
  is_required        boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (asset_id, discipline_id)
);

create index asset_disciplines_org_id_idx on public.asset_disciplines (org_id);
create index asset_disciplines_asset_id_idx on public.asset_disciplines (asset_id);
create index asset_disciplines_next_due_idx on public.asset_disciplines (org_id, next_due_date);

-- ---------------------------------------------------------------------------
-- Inspections and findings
-- ---------------------------------------------------------------------------

create table public.inspections (
  id             uuid primary key default extensions.uuid_generate_v4(),
  org_id         uuid not null references public.organisations (id) on delete cascade,
  asset_id       uuid not null references public.assets (id) on delete cascade,
  discipline_id  uuid not null references public.disciplines (id) on delete restrict,
  inspector_id   uuid references public.profiles (id) on delete set null,

  reference      text not null,
  status         public.inspection_status not null default 'scheduled',
  scheduled_for  date,
  started_at     timestamptz,
  completed_at   timestamptz,
  summary        text,

  -- Validated against discipline_schemas where target = 'inspection'.
  payload        jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (org_id, reference)
);

create index inspections_org_id_idx on public.inspections (org_id);
create index inspections_asset_id_idx on public.inspections (asset_id);
create index inspections_discipline_idx on public.inspections (org_id, discipline_id);
create index inspections_status_idx on public.inspections (org_id, status);
create index inspections_payload_idx on public.inspections using gin (payload);

create table public.findings (
  id             uuid primary key default extensions.uuid_generate_v4(),
  org_id         uuid not null references public.organisations (id) on delete cascade,
  inspection_id  uuid references public.inspections (id) on delete set null,
  -- Denormalised from the inspection so an asset's findings can be listed
  -- without a join, and so a finding can outlive the inspection that found it.
  asset_id       uuid not null references public.assets (id) on delete cascade,
  discipline_id  uuid not null references public.disciplines (id) on delete restrict,

  reference      text not null,
  title          text not null,
  description    text,
  severity       public.finding_severity not null default 'medium',
  status         public.finding_status not null default 'open',
  -- Free text for now ("Boiler room, north wall"). A future phase replaces this
  -- with a reference into the asset hierarchy or a BIM element id.
  location_note  text,

  identified_at  date not null default current_date,
  remediated_at  date,

  -- Validated against discipline_schemas where target = 'finding'.
  payload        jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (org_id, reference)
);

create index findings_org_id_idx on public.findings (org_id);
create index findings_asset_id_idx on public.findings (asset_id);
create index findings_inspection_id_idx on public.findings (inspection_id);
create index findings_discipline_idx on public.findings (org_id, discipline_id);
create index findings_open_severity_idx on public.findings (org_id, severity) where status not in ('closed', 'removed');
create index findings_payload_idx on public.findings using gin (payload);

alter table public.findings
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(reference, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(location_note, '')), 'C')
  ) stored;

create index findings_search_vector_idx on public.findings using gin (search_vector);

create trigger disciplines_set_updated_at
  before update on public.disciplines
  for each row execute function public.set_updated_at();

create trigger discipline_schemas_set_updated_at
  before update on public.discipline_schemas
  for each row execute function public.set_updated_at();

create trigger asset_disciplines_set_updated_at
  before update on public.asset_disciplines
  for each row execute function public.set_updated_at();

create trigger inspections_set_updated_at
  before update on public.inspections
  for each row execute function public.set_updated_at();

create trigger findings_set_updated_at
  before update on public.findings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Derived compliance status
-- ---------------------------------------------------------------------------

-- Overdue is computed, never stored: a stored flag is wrong the morning after
-- it's written. The dashboard reads this view.
create view public.asset_compliance_status
with (security_invoker = true)
as
select
  ad.org_id,
  ad.asset_id,
  ad.discipline_id,
  d.code   as discipline_code,
  d.name   as discipline_name,
  ad.frequency_months,
  ad.last_inspection_at,
  ad.next_due_date,
  ad.is_required,
  case
    when not ad.is_required             then 'not_applicable'
    when ad.next_due_date is null       then 'unknown'
    when ad.next_due_date < current_date then 'overdue'
    when ad.next_due_date < current_date + interval '30 days' then 'due_soon'
    else 'compliant'
  end as compliance_state,
  ad.next_due_date - current_date as days_until_due
from public.asset_disciplines ad
join public.disciplines d on d.id = ad.discipline_id;
