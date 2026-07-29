-- 0014_site_visits.sql
-- QR-coded check-ins, requested by an external compliance-officer review: a
-- way to show a contractor or inspector was physically on site, at a specific
-- location, for a specific piece of scheduled work. This is the raw evidence
-- an attendance/KPI/payment process would later be built on top of -- this
-- migration only lays down the log, not the reporting on top of it.
--
-- QR codes point at an asset, which is already a self-referencing hierarchy
-- (building -> floor -> room), so "a QR code for the third floor plant room"
-- is a QR code against that floor's asset row. No separate locations table.

create table public.qr_codes (
  id          uuid primary key default extensions.uuid_generate_v4(),
  org_id      uuid not null references public.organisations (id) on delete cascade,
  asset_id    uuid not null references public.assets (id) on delete cascade,
  -- e.g. "Floor 2 -- plant room entrance". Optional: the asset name alone is
  -- often enough at building level.
  label       text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index qr_codes_org_id_idx on public.qr_codes (org_id);
create index qr_codes_asset_id_idx on public.qr_codes (asset_id);

-- A visit is denormalised onto the asset (not just the QR code) so history
-- survives a code being deleted and reissued, same reasoning as findings
-- keeping asset_id after their inspection is gone.
create table public.site_visits (
  id              uuid primary key default extensions.uuid_generate_v4(),
  org_id          uuid not null references public.organisations (id) on delete cascade,
  asset_id        uuid not null references public.assets (id) on delete cascade,
  qr_code_id      uuid references public.qr_codes (id) on delete set null,
  user_id         uuid references public.profiles (id) on delete set null,
  inspection_id   uuid references public.inspections (id) on delete set null,
  checked_in_at   timestamptz not null default now(),
  checked_out_at  timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index site_visits_org_id_idx on public.site_visits (org_id);
create index site_visits_asset_id_idx on public.site_visits (asset_id);
create index site_visits_user_id_idx on public.site_visits (user_id);
create index site_visits_checked_in_at_idx on public.site_visits (org_id, checked_in_at desc);

-- Enforces "check out before you check in again" at the database level,
-- rather than trusting the API to get the toggle right.
create unique index site_visits_one_open_per_user_code_idx
  on public.site_visits (user_id, qr_code_id)
  where checked_out_at is null;

create trigger site_visits_set_updated_at
  before update on public.site_visits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.qr_codes    enable row level security;
alter table public.site_visits enable row level security;

create policy qr_codes_select on public.qr_codes
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

-- Generating or removing a QR code shapes the register -- same bar as sites
-- and asset_disciplines.
create policy qr_codes_write on public.qr_codes
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]));

create policy site_visits_select on public.site_visits
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

-- Checking in/out is a personal action, not a register change: any member can
-- log their own presence, but only ever for themselves.
create policy site_visits_insert_self on public.site_visits
  for insert to authenticated
  with check (org_id in (select public.user_org_ids()) and user_id = auth.uid());

create policy site_visits_update_self on public.site_visits
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Managers can correct a visit after the fact. The insurance/liability case
-- for this log depends on it being auditable and correctable, not merely
-- append-only with no recourse for a mis-scan.
create policy site_visits_update_manager on public.site_visits
  for update to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]));

-- ---------------------------------------------------------------------------
-- API views
-- ---------------------------------------------------------------------------

create view public.qr_codes_api
with (security_invoker = true)
as
select
  qc.id,
  qc.org_id,
  qc.asset_id,
  a.name as asset_name,
  a.reference as asset_reference,
  qc.label,
  qc.created_by,
  p.full_name as created_by_name,
  qc.created_at
from public.qr_codes qc
join public.assets a on a.id = qc.asset_id
left join public.profiles p on p.id = qc.created_by;

create view public.site_visits_api
with (security_invoker = true)
as
select
  sv.id,
  sv.org_id,
  sv.asset_id,
  a.name as asset_name,
  sv.qr_code_id,
  qc.label as qr_code_label,
  sv.user_id,
  p.full_name as visitor_name,
  sv.inspection_id,
  i.reference as inspection_reference,
  sv.checked_in_at,
  sv.checked_out_at,
  sv.notes,
  sv.created_at,
  sv.updated_at
from public.site_visits sv
join public.assets a on a.id = sv.asset_id
left join public.qr_codes qc on qc.id = sv.qr_code_id
left join public.profiles p on p.id = sv.user_id
left join public.inspections i on i.id = sv.inspection_id;

grant select on public.qr_codes_api to authenticated;
grant select on public.site_visits_api to authenticated;
