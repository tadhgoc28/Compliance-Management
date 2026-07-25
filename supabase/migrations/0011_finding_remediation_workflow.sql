-- 0011_finding_remediation_workflow.sql
-- Add remediation workflow tracking to findings: assignment and status enhancements

-- Add new status values to the finding_status enum
alter type public.finding_status add value 'assigned' after 'open';

-- Add columns to track finding assignment
alter table public.findings
  add column assigned_to uuid references public.profiles(id) on delete set null,
  add column assigned_at timestamptz;

-- Create indexes for assignment queries
create index findings_assigned_to_idx on public.findings(assigned_to);
create index findings_assigned_at_idx on public.findings(assigned_at);

-- Update findings_api view to include assigned_to information
drop view if exists public.findings_api;
create view public.findings_api as
select
  f.id,
  f.reference,
  f.asset_id,
  a.name as asset_name,
  f.inspection_id,
  f.discipline_id,
  d.code as discipline_code,
  d.name as discipline_name,
  f.title,
  f.description,
  f.severity,
  f.status,
  f.location_note,
  f.identified_at,
  f.remediated_at,
  f.assigned_to,
  p.full_name as assigned_to_name,
  f.assigned_at,
  f.payload,
  f.schema_version,
  f.org_id,
  f.created_at,
  f.updated_at
from public.findings f
left join public.assets a on f.asset_id = a.id
left join public.disciplines d on f.discipline_id = d.id
left join public.profiles p on f.assigned_to = p.id;

-- Grant access to authenticated users
grant select on public.findings_api to authenticated;
