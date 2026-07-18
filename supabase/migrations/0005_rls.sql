-- 0005_rls.sql
-- Row level security.
--
-- Enabling RLS without a policy denies everything, which is the correct default:
-- a table added later that nobody wrote a policy for fails closed, not open.
--
-- Read access is uniform (you see your organisation's rows). Write access is
-- graded by role: viewers read, surveyors record inspections and findings,
-- managers and admins shape the register itself.

alter table public.organisations     enable row level security;
alter table public.profiles          enable row level security;
alter table public.memberships       enable row level security;
alter table public.sites             enable row level security;
alter table public.asset_types       enable row level security;
alter table public.assets            enable row level security;
alter table public.disciplines       enable row level security;
alter table public.discipline_schemas enable row level security;
alter table public.asset_disciplines enable row level security;
alter table public.inspections       enable row level security;
alter table public.findings          enable row level security;
alter table public.documents         enable row level security;

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------

create policy organisations_select on public.organisations
  for select to authenticated
  using (id in (select public.user_org_ids()));

create policy organisations_update on public.organisations
  for update to authenticated
  using (public.has_org_role(id, array['owner', 'admin']::public.org_role[]))
  with check (public.has_org_role(id, array['owner', 'admin']::public.org_role[]));

-- You can see yourself, and anyone you share an organisation with.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id
        and m.org_id in (select public.user_org_ids())
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy memberships_select on public.memberships
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

create policy memberships_write on public.memberships
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));

-- ---------------------------------------------------------------------------
-- Disciplines
--
-- System disciplines (org_id is null) are readable by everyone and writable by
-- nobody through the API - they are managed by migrations.
-- ---------------------------------------------------------------------------

create policy disciplines_select on public.disciplines
  for select to authenticated
  using (org_id is null or org_id in (select public.user_org_ids()));

create policy disciplines_write on public.disciplines
  for all to authenticated
  using (org_id is not null and public.has_org_role(org_id, array['owner', 'admin']::public.org_role[]))
  with check (org_id is not null and public.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));

create policy discipline_schemas_select on public.discipline_schemas
  for select to authenticated
  using (
    exists (
      select 1 from public.disciplines d
      where d.id = discipline_schemas.discipline_id
        and (d.org_id is null or d.org_id in (select public.user_org_ids()))
    )
  );

create policy discipline_schemas_write on public.discipline_schemas
  for all to authenticated
  using (
    exists (
      select 1 from public.disciplines d
      where d.id = discipline_schemas.discipline_id
        and d.org_id is not null
        and public.has_org_role(d.org_id, array['owner', 'admin']::public.org_role[])
    )
  )
  with check (
    exists (
      select 1 from public.disciplines d
      where d.id = discipline_schemas.discipline_id
        and d.org_id is not null
        and public.has_org_role(d.org_id, array['owner', 'admin']::public.org_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- Register: shaped by managers and above
-- ---------------------------------------------------------------------------

create policy sites_select on public.sites
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

create policy sites_write on public.sites
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]));

create policy asset_types_select on public.asset_types
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

create policy asset_types_write on public.asset_types
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]));

create policy assets_select on public.assets
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

create policy assets_write on public.assets
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]));

create policy asset_disciplines_select on public.asset_disciplines
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

create policy asset_disciplines_write on public.asset_disciplines
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager']::public.org_role[]));

-- ---------------------------------------------------------------------------
-- Field records: surveyors write these
-- ---------------------------------------------------------------------------

create policy inspections_select on public.inspections
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

create policy inspections_write on public.inspections
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'surveyor']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'surveyor']::public.org_role[]));

create policy findings_select on public.findings
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

create policy findings_write on public.findings
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'surveyor']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'surveyor']::public.org_role[]));

create policy documents_select on public.documents
  for select to authenticated
  using (org_id in (select public.user_org_ids()));

create policy documents_write on public.documents
  for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'surveyor']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'surveyor']::public.org_role[]));

-- ---------------------------------------------------------------------------
-- Storage
--
-- Object keys must start with the organisation id: <org_id>/<asset_id>/<file>.
-- That prefix is what the policies below authorise against, so the path layout
-- is a security boundary, not a filing convention. Do not change it casually.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy documents_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy documents_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'manager', 'surveyor']::public.org_role[]
    )
  );

create policy documents_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'manager', 'surveyor']::public.org_role[]
    )
  );

create policy documents_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'manager']::public.org_role[]
    )
  );
