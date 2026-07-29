-- 0008_audit_trail.sql
-- Audit trail infrastructure for compliance tracking
-- Logs all changes to inspections, findings, and asset_disciplines for legal/compliance purposes

-- Create audit_logs table
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null, -- 'inspection', 'finding', 'asset_discipline'
  entity_id uuid not null,
  action text not null, -- 'insert', 'update', 'delete'
  old_values jsonb, -- Previous state (null for inserts)
  new_values jsonb, -- Current state (null for deletes)
  changed_fields text[], -- Array of field names that changed
  metadata jsonb default '{}', -- Additional context (ip, user_agent, reason, etc.)
  created_at timestamp with time zone default now(),

  constraint valid_action check (action in ('insert', 'update', 'delete')),
  constraint valid_entity_type check (entity_type in ('inspection', 'finding', 'asset_discipline'))
);

-- Indexes for performance
create index if not exists idx_audit_logs_org_id on public.audit_logs(org_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);

-- RLS: Managers and above can read audit logs; no writes (append-only via triggers)
alter table public.audit_logs enable row level security;

create policy "Managers can read audit logs for their org"
  on public.audit_logs for select
  using (
    auth.uid() = user_id or -- Always see own actions
    exists (
      select 1 from public.memberships m
      where m.org_id = audit_logs.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'manager')
    )
  );

-- Create audit_retention_policy table
create table if not exists public.audit_retention_policies (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null unique references public.organisations (id) on delete cascade,
  retention_days integer default 365 check (retention_days > 0),
  auto_purge_enabled boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.audit_retention_policies enable row level security;

create policy "Org admins manage retention policy"
  on public.audit_retention_policies for all
  using (
    exists (
      select 1 from public.memberships m
      where m.org_id = audit_retention_policies.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- Helper function to calculate diff between old and new values
create or replace function public.jsonb_diff(old_value jsonb, new_value jsonb)
returns text[] as $$
declare
  old_keys text[];
  new_keys text[];
  all_keys text[];
  changed_fields text[];
begin
  if old_value is null then
    return array(select jsonb_object_keys(new_value));
  end if;

  if new_value is null then
    return array(select jsonb_object_keys(old_value));
  end if;

  old_keys := array(select jsonb_object_keys(old_value));
  new_keys := array(select jsonb_object_keys(new_value));
  all_keys := array(select distinct unnest(old_keys || new_keys));

  select array_agg(key)
  into changed_fields
  from unnest(all_keys) as key
  where old_value->key is distinct from new_value->key;

  return coalesce(changed_fields, array[]::text[]);
end;
$$ language plpgsql immutable;

-- Trigger function for auditing inspections
create or replace function public.audit_inspections_changes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (org_id, user_id, entity_type, entity_id, action, new_values, changed_fields, metadata)
    values (
      new.org_id,
      auth.uid(),
      'inspection',
      new.id,
      'insert',
      to_jsonb(new) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      array[]::text[],
      jsonb_build_object('table', 'inspections')
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (org_id, user_id, entity_type, entity_id, action, old_values, new_values, changed_fields, metadata)
    values (
      new.org_id,
      auth.uid(),
      'inspection',
      new.id,
      'update',
      to_jsonb(old) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      to_jsonb(new) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      public.jsonb_diff(
        to_jsonb(old) - 'org_id' - 'id' - 'created_at' - 'updated_at',
        to_jsonb(new) - 'org_id' - 'id' - 'created_at' - 'updated_at'
      ),
      jsonb_build_object('table', 'inspections')
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (org_id, user_id, entity_type, entity_id, action, old_values, metadata)
    values (
      old.org_id,
      auth.uid(),
      'inspection',
      old.id,
      'delete',
      to_jsonb(old) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      jsonb_build_object('table', 'inspections')
    );
    return old;
  end if;
end;
$$ language plpgsql;

-- Trigger function for auditing findings
create or replace function public.audit_findings_changes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (org_id, user_id, entity_type, entity_id, action, new_values, changed_fields, metadata)
    values (
      new.org_id,
      auth.uid(),
      'finding',
      new.id,
      'insert',
      to_jsonb(new) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      array[]::text[],
      jsonb_build_object('table', 'findings')
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (org_id, user_id, entity_type, entity_id, action, old_values, new_values, changed_fields, metadata)
    values (
      new.org_id,
      auth.uid(),
      'finding',
      new.id,
      'update',
      to_jsonb(old) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      to_jsonb(new) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      public.jsonb_diff(
        to_jsonb(old) - 'org_id' - 'id' - 'created_at' - 'updated_at',
        to_jsonb(new) - 'org_id' - 'id' - 'created_at' - 'updated_at'
      ),
      jsonb_build_object('table', 'findings')
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (org_id, user_id, entity_type, entity_id, action, old_values, metadata)
    values (
      old.org_id,
      auth.uid(),
      'finding',
      old.id,
      'delete',
      to_jsonb(old) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      jsonb_build_object('table', 'findings')
    );
    return old;
  end if;
end;
$$ language plpgsql;

-- Trigger function for auditing asset_disciplines
create or replace function public.audit_asset_disciplines_changes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (org_id, user_id, entity_type, entity_id, action, new_values, changed_fields, metadata)
    values (
      new.org_id,
      auth.uid(),
      'asset_discipline',
      new.id,
      'insert',
      to_jsonb(new) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      array[]::text[],
      jsonb_build_object('table', 'asset_disciplines')
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (org_id, user_id, entity_type, entity_id, action, old_values, new_values, changed_fields, metadata)
    values (
      new.org_id,
      auth.uid(),
      'asset_discipline',
      new.id,
      'update',
      to_jsonb(old) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      to_jsonb(new) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      public.jsonb_diff(
        to_jsonb(old) - 'org_id' - 'id' - 'created_at' - 'updated_at',
        to_jsonb(new) - 'org_id' - 'id' - 'created_at' - 'updated_at'
      ),
      jsonb_build_object('table', 'asset_disciplines')
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (org_id, user_id, entity_type, entity_id, action, old_values, metadata)
    values (
      old.org_id,
      auth.uid(),
      'asset_discipline',
      old.id,
      'delete',
      to_jsonb(old) - 'org_id' - 'id' - 'created_at' - 'updated_at',
      jsonb_build_object('table', 'asset_disciplines')
    );
    return old;
  end if;
end;
$$ language plpgsql;

-- Attach triggers (drop if exist to ensure clean state)
drop trigger if exists audit_inspections_trigger on public.inspections;
drop trigger if exists audit_findings_trigger on public.findings;
drop trigger if exists audit_asset_disciplines_trigger on public.asset_disciplines;

create trigger audit_inspections_trigger
after insert or update or delete on public.inspections
for each row execute function public.audit_inspections_changes();

create trigger audit_findings_trigger
after insert or update or delete on public.findings
for each row execute function public.audit_findings_changes();

create trigger audit_asset_disciplines_trigger
after insert or update or delete on public.asset_disciplines
for each row execute function public.audit_asset_disciplines_changes();

-- Function to auto-purge old audit logs (for scheduled job)
create or replace function public.purge_old_audit_logs()
returns table(org_id uuid, deleted_count bigint) as $$
declare
  retention_days int;
  cutoff_date timestamp with time zone;
  v_org_id uuid;
  v_deleted_count bigint;
begin
  for v_org_id in select id from public.organisations loop
    select coalesce(retention_days, 365)
    into retention_days
    from public.audit_retention_policies
    where org_id = v_org_id and auto_purge_enabled = true;

    if retention_days is not null then
      cutoff_date := now() - (retention_days || ' days')::interval;

      delete from public.audit_logs
      where org_id = v_org_id and created_at < cutoff_date;

      get diagnostics v_deleted_count = row_count;
      return query select v_org_id, v_deleted_count;
    end if;
  end loop;
end;
$$ language plpgsql;

-- Raw audit_logs only has user_id; every other _api view in this schema
-- resolves names the same way, so the audit trail isn't the one screen that
-- shows a UUID instead of a person.
create view public.audit_logs_api
with (security_invoker = true)
as
select
  al.id,
  al.org_id,
  al.user_id,
  p.full_name as user_name,
  al.entity_type,
  al.entity_id,
  al.action,
  al.old_values,
  al.new_values,
  al.changed_fields,
  al.metadata,
  al.created_at
from public.audit_logs al
left join public.profiles p on p.id = al.user_id;

grant select on public.audit_logs_api to authenticated;
