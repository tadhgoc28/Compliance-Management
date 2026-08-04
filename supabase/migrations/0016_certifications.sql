-- 0016_certifications.sql
-- Compliance-officer feedback: an inspection, work order or photo shouldn't be
-- allowed to proceed if the person carrying it out lacks the training the
-- work requires (working at heights, confined space, asbestos operative,
-- etc). Nothing in the schema modelled a person's credentials at all before
-- this -- inspections only had a free-text, unvalidated `surveyor_licence`
-- string in the payload.
--
-- Same shape as disciplines: an extensible, org-customisable registry rather
-- than a hardcoded enum, because the list of recognised trainings is exactly
-- the kind of thing that grows without a code change.

-- ---------------------------------------------------------------------------
-- Certification types and who holds them
-- ---------------------------------------------------------------------------

create table public.certification_types (
  id          uuid primary key default extensions.uuid_generate_v4(),
  org_id      uuid references public.organisations (id) on delete cascade,
  code        text not null,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index certification_types_org_code_idx
  on public.certification_types (org_id, code) where org_id is not null;
create unique index certification_types_system_code_idx
  on public.certification_types (code) where org_id is null;

-- What a discipline requires the attending person to hold. Org-scoped even
-- for a system discipline: two organisations can reasonably disagree on
-- whether e.g. roof inspections need a working-at-heights ticket.
create table public.discipline_certification_requirements (
  id                    uuid primary key default extensions.uuid_generate_v4(),
  org_id                uuid not null references public.organisations (id) on delete cascade,
  discipline_id         uuid not null references public.disciplines (id) on delete cascade,
  certification_type_id uuid not null references public.certification_types (id) on delete cascade,
  created_at            timestamptz not null default now(),
  unique (org_id, discipline_id, certification_type_id)
);

create index discipline_cert_requirements_org_idx
  on public.discipline_certification_requirements (org_id);
create index discipline_cert_requirements_discipline_idx
  on public.discipline_certification_requirements (discipline_id);

-- A held certification. Evidence (a scanned card, a licence PDF) is an
-- ordinary document -- document_id is optional, not a second file pipeline.
create table public.certifications (
  id                    uuid primary key default extensions.uuid_generate_v4(),
  org_id                uuid not null references public.organisations (id) on delete cascade,
  profile_id            uuid not null references public.profiles (id) on delete cascade,
  certification_type_id uuid not null references public.certification_types (id) on delete restrict,
  reference             text,
  issued_at             date,
  expires_at            date,
  document_id           uuid references public.documents (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index certifications_org_idx on public.certifications (org_id);
create index certifications_profile_idx on public.certifications (profile_id);
create index certifications_type_idx on public.certifications (certification_type_id);

create trigger certification_types_set_updated_at
  before update on public.certification_types
  for each row execute function public.set_updated_at();

create trigger certifications_set_updated_at
  before update on public.certifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- The gate itself: what a check-in found missing
--
-- Deliberately a flag, not a block. The QR check-in still gets logged either
-- way -- refusing to record that someone turned up who wasn't qualified would
-- destroy exactly the evidence you'd need afterwards. What changes is that
-- the visit is now visibly flagged, everywhere the visit is shown.
-- ---------------------------------------------------------------------------

alter table public.site_visits
  add column compliance_flag text check (compliance_flag is null or compliance_flag in ('missing_training')),
  add column flag_details jsonb;

-- site_visits_api (0014_site_visits.sql) predates these columns; views don't
-- pick up new base-table columns on their own, so it's recreated here with
-- them appended.
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
  sv.created_at,
  sv.updated_at
from public.site_visits sv
join public.assets a on a.id = sv.asset_id
left join public.qr_codes qc on qc.id = sv.qr_code_id
left join public.profiles p on p.id = sv.user_id
left join public.inspections i on i.id = sv.inspection_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.certification_types                    enable row level security;
alter table public.discipline_certification_requirements   enable row level security;
alter table public.certifications                          enable row level security;

create policy certification_types_select on public.certification_types
  for select to authenticated
  using (org_id is null or org_id in (select public.user_org_ids()));

create policy certification_types_write on public.certification_types
  for all to authenticated
  using (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]))
  with check (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]));

create policy discipline_cert_requirements_select on public.discipline_certification_requirements
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

create policy discipline_cert_requirements_write on public.discipline_certification_requirements
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]));

-- Training records are visible org-wide (a manager checking who's qualified
-- for tomorrow's job needs to see everyone's, not just their own), but only
-- managers and above maintain them -- this is a training register, not a
-- self-reported profile field.
create policy certifications_select on public.certifications
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

create policy certifications_write on public.certifications
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]));

-- ---------------------------------------------------------------------------
-- API views
-- ---------------------------------------------------------------------------

create view public.certifications_api
with (security_invoker = true)
as
select
  c.id,
  c.org_id,
  c.profile_id,
  p.full_name as holder_name,
  c.certification_type_id,
  ct.code as certification_code,
  ct.name as certification_name,
  c.reference,
  c.issued_at,
  c.expires_at,
  c.document_id,
  c.created_at
from public.certifications c
join public.profiles p on p.id = c.profile_id
join public.certification_types ct on ct.id = c.certification_type_id;

create view public.discipline_certification_requirements_api
with (security_invoker = true)
as
select
  r.id,
  r.org_id,
  r.discipline_id,
  d.code as discipline_code,
  d.name as discipline_name,
  r.certification_type_id,
  ct.code as certification_code,
  ct.name as certification_name
from public.discipline_certification_requirements r
join public.disciplines d on d.id = r.discipline_id
join public.certification_types ct on ct.id = r.certification_type_id;

grant select on public.certifications_api to authenticated;
grant select on public.discipline_certification_requirements_api to authenticated;

-- ---------------------------------------------------------------------------
-- Seed: common UK/Ireland trade certifications, system-wide (org_id null),
-- same convention as the discipline seed in 0006. Which disciplines require
-- which of these is left to each org to set via the Requirements screen --
-- only a sensible starting default is seeded here.
-- ---------------------------------------------------------------------------

insert into public.certification_types (org_id, code, name, description) values
  (null, 'working_at_heights',       'Working at Heights',                 'Safe use of ladders, MEWPs, harnesses and fall protection.'),
  (null, 'confined_space',           'Confined Space Entry',               'Safe entry, monitoring and rescue procedures for confined spaces.'),
  (null, 'asbestos_licensed',        'Asbestos Operative (Licensed)',      'HSE/HSA licensed to work with licensable asbestos-containing materials.'),
  (null, 'asbestos_nonlicensed',     'Asbestos Non-Licensed Operative',    'Competent to work with non-licensable asbestos-containing materials.'),
  (null, 'legionella_risk_assessor', 'Legionella Risk Assessor',           'Competent person under ACOP L8 to carry out legionella risk assessments.'),
  (null, 'gas_safe',                 'Gas Safe Registered Engineer',       'Registered to carry out gas installation and safety work.'),
  (null, 'electrical_qualified',     'Electrical Qualified Supervisor',    '18th Edition wiring regulations qualified.'),
  (null, 'manual_handling',          'Manual Handling',                    'Safe lifting and manual handling technique.'),
  (null, 'first_aid',                'First Aid at Work',                  'Emergency first aid certification.'),
  (null, 'cscs_card',                'CSCS Card (or equivalent)',          'Construction Skills Certification Scheme card, or equivalent (e.g. Safe Pass), evidencing standard site access competency.'),
  (null, 'abrasive_wheels',          'Abrasive Wheels',                    'Safe mounting, use and inspection of abrasive wheels for cutting and grinding.'),
  (null, 'coshh',                    'COSHH',                              'Control of Substances Hazardous to Health -- safe handling, storage and use of hazardous substances.'),
  (null, 'ppe',                      'PPE Awareness',                      'Correct selection, use, maintenance and limitations of personal protective equipment.')
on conflict do nothing;

-- Default discipline -> required-training mapping, applied per organisation
-- for every org that exists at migration time. New orgs start with none set
-- and configure their own via the Requirements screen.
insert into public.discipline_certification_requirements (org_id, discipline_id, certification_type_id)
select o.id, d.id, ct.id
from public.organisations o
cross join (values
  ('roof',        'working_at_heights'),
  ('structural',  'working_at_heights'),
  ('ventilation', 'confined_space'),
  ('asbestos',    'asbestos_licensed'),
  ('gas',         'gas_safe'),
  ('electrical',  'electrical_qualified'),
  ('legionella',  'legionella_risk_assessor'),
  -- Baseline site-access and PPE training, required regardless of discipline.
  ('asbestos',    'cscs_card'),
  ('fire',        'cscs_card'),
  ('legionella',  'cscs_card'),
  ('electrical',  'cscs_card'),
  ('gas',         'cscs_card'),
  ('ventilation', 'cscs_card'),
  ('roof',        'cscs_card'),
  ('structural',  'cscs_card'),
  ('asbestos',    'ppe'),
  ('fire',        'ppe'),
  ('legionella',  'ppe'),
  ('electrical',  'ppe'),
  ('gas',         'ppe'),
  ('ventilation', 'ppe'),
  ('roof',        'ppe'),
  ('structural',  'ppe'),
  -- Hazardous-substance handling.
  ('asbestos',    'coshh'),
  ('legionella',  'coshh'),
  ('gas',         'coshh'),
  -- Cutting/grinding work.
  ('roof',        'abrasive_wheels'),
  ('structural',  'abrasive_wheels'),
  ('ventilation', 'abrasive_wheels')
) as defaults(discipline_code, cert_code)
join public.disciplines d on d.code = defaults.discipline_code and d.org_id is null
join public.certification_types ct on ct.code = defaults.cert_code and ct.org_id is null
on conflict do nothing;
