-- 0017_work_orders.sql
-- Compliance-officer follow-up to the Site Visits page: rather than building
-- a full contractor rate book (a rate per person, per skill, over time -- a
-- project of its own), model the rate at the level site work is actually
-- agreed at -- a work order. A visit's logged hours multiplied by its work
-- order's agreed rate gives a payment/KPI figure without needing to know
-- anything about the contractor beyond what's written on that one job.

create table public.work_orders (
  id           uuid primary key default extensions.uuid_generate_v4(),
  org_id       uuid not null references public.organisations (id) on delete cascade,
  reference    text not null,
  description  text,
  asset_id     uuid references public.assets (id) on delete set null,
  agreed_rate  numeric(10, 2),
  rate_unit    text not null default 'hourly' check (rate_unit in ('hourly', 'daily', 'fixed')),
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, reference)
);

create index work_orders_org_idx on public.work_orders (org_id);
create index work_orders_asset_idx on public.work_orders (asset_id);

create trigger work_orders_set_updated_at
  before update on public.work_orders
  for each row execute function public.set_updated_at();

-- A visit is assigned to a work order after the fact (or at check-in, later),
-- same denormalisation reasoning as asset_id: the visit survives the work
-- order being deleted.
alter table public.site_visits
  add column work_order_id uuid references public.work_orders (id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.work_orders enable row level security;

create policy work_orders_select on public.work_orders
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

-- Same bar as the certifications register: a manager maintains it, not
-- every member -- this is the number a payment figure gets built on.
create policy work_orders_write on public.work_orders
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]));

-- ---------------------------------------------------------------------------
-- API views
-- ---------------------------------------------------------------------------

create view public.work_orders_api
with (security_invoker = true)
as
select
  wo.id,
  wo.org_id,
  wo.reference,
  wo.description,
  wo.asset_id,
  a.name as asset_name,
  wo.agreed_rate,
  wo.rate_unit,
  wo.created_by,
  p.full_name as created_by_name,
  wo.created_at,
  wo.updated_at
from public.work_orders wo
left join public.assets a on a.id = wo.asset_id
left join public.profiles p on p.id = wo.created_by;

grant select on public.work_orders_api to authenticated;

-- site_visits_api predates work_order_id; recreated here with it appended,
-- same reasoning as the 0016 update for compliance_flag/flag_details.
drop view public.site_visits_api;

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
  sv.compliance_flag,
  sv.flag_details,
  sv.work_order_id,
  wo.reference as work_order_reference,
  sv.created_at,
  sv.updated_at
from public.site_visits sv
join public.assets a on a.id = sv.asset_id
left join public.qr_codes qc on qc.id = sv.qr_code_id
left join public.profiles p on p.id = sv.user_id
left join public.inspections i on i.id = sv.inspection_id
left join public.work_orders wo on wo.id = sv.work_order_id;

grant select on public.site_visits_api to authenticated;
