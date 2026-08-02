-- 0015_reports_storage.sql
-- The reports feature (0009_notifications_reports.sql) has generated files
-- from day one but nowhere to put them -- report-generator.ts uploads to a
-- 'reports' bucket that was never created. Same path convention as the
-- documents bucket: <org_id>/<file>, which is what the RLS policies below
-- authorise against.

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

create policy reports_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy reports_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reports'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy reports_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );
