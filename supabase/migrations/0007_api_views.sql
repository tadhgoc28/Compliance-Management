-- 0007_api_views.sql
-- Read models for the API.
--
-- Two reasons these exist rather than querying the tables directly:
--
-- 1. PostGIS geography columns serialise as WKB hex over PostgREST, which is
--    useless to a map component. ST_Y/ST_X project them back to plain numbers.
-- 2. Every list screen needs the same joined labels (site name, discipline
--    name). Doing it once here keeps the client queries flat and cheap.
--
-- security_invoker = true is load-bearing: without it these views would run as
-- their owner and silently bypass every policy in 0005_rls.sql.

create view public.sites_api
with (security_invoker = true)
as
select
  s.id,
  s.org_id,
  s.name,
  s.code,
  s.address,
  s.region,
  extensions.st_y(s.location::extensions.geometry) as latitude,
  extensions.st_x(s.location::extensions.geometry) as longitude,
  s.created_at,
  s.updated_at
from public.sites s;

create view public.assets_api
with (security_invoker = true)
as
select
  a.id,
  a.org_id,
  a.reference,
  a.name,
  a.description,
  a.status,
  a.site_id,
  s.name as site_name,
  a.asset_type_id,
  t.name as asset_type_name,
  t.category as asset_type_category,
  a.parent_id,
  extensions.st_y(a.location::extensions.geometry) as latitude,
  extensions.st_x(a.location::extensions.geometry) as longitude,
  a.attributes,
  a.created_at,
  a.updated_at
from public.assets a
left join public.sites s on s.id = a.site_id
left join public.asset_types t on t.id = a.asset_type_id;

create view public.inspections_api
with (security_invoker = true)
as
select
  i.id,
  i.org_id,
  i.reference,
  i.asset_id,
  a.name as asset_name,
  a.reference as asset_reference,
  i.discipline_id,
  d.code as discipline_code,
  d.name as discipline_name,
  d.colour as discipline_colour,
  i.inspector_id,
  p.full_name as inspector_name,
  i.status,
  i.scheduled_for,
  i.started_at,
  i.completed_at,
  i.summary,
  i.payload,
  i.schema_version,
  i.created_at,
  i.updated_at
from public.inspections i
join public.assets a on a.id = i.asset_id
join public.disciplines d on d.id = i.discipline_id
left join public.profiles p on p.id = i.inspector_id;

create view public.findings_api
with (security_invoker = true)
as
select
  f.id,
  f.org_id,
  f.reference,
  f.asset_id,
  a.name as asset_name,
  a.reference as asset_reference,
  a.site_id,
  f.inspection_id,
  f.discipline_id,
  d.code as discipline_code,
  d.name as discipline_name,
  d.colour as discipline_colour,
  f.title,
  f.description,
  f.severity,
  f.status,
  f.location_note,
  f.identified_at,
  f.remediated_at,
  f.payload,
  f.schema_version,
  f.created_at,
  f.updated_at
from public.findings f
join public.assets a on a.id = f.asset_id
join public.disciplines d on d.id = f.discipline_id;

create view public.documents_api
with (security_invoker = true)
as
select
  doc.id,
  doc.org_id,
  doc.title,
  doc.description,
  doc.kind,
  doc.asset_id,
  a.name as asset_name,
  a.reference as asset_reference,
  doc.inspection_id,
  doc.finding_id,
  doc.discipline_id,
  d.code as discipline_code,
  d.name as discipline_name,
  doc.bucket,
  doc.storage_path,
  doc.mime_type,
  doc.size_bytes,
  doc.width,
  doc.height,
  doc.taken_at,
  extensions.st_y(doc.location::extensions.geometry) as latitude,
  extensions.st_x(doc.location::extensions.geometry) as longitude,
  doc.issued_at,
  doc.expires_at,
  doc.uploaded_by,
  p.full_name as uploaded_by_name,
  doc.created_at,
  doc.updated_at
from public.documents doc
left join public.assets a on a.id = doc.asset_id
left join public.disciplines d on d.id = doc.discipline_id
left join public.profiles p on p.id = doc.uploaded_by;

-- ---------------------------------------------------------------------------
-- Search
--
-- One entry point across assets, findings and documents. Postgres full text is
-- enough at this size; when it stops being enough, this function is the seam to
-- swap for a search service without touching any caller.
-- ---------------------------------------------------------------------------

create or replace function public.search_all(query text, max_results integer default 20)
returns table (
  kind        text,
  id          uuid,
  title       text,
  subtitle    text,
  rank        real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (select websearch_to_tsquery('english', query) as tsq)
  (
    select 'asset'::text, a.id, a.name,
           coalesce(a.reference, '') || coalesce(' · ' || s.name, ''),
           ts_rank(a.search_vector, q.tsq)
    from public.assets a
    left join public.sites s on s.id = a.site_id, q
    where a.search_vector @@ q.tsq
    limit max_results
  )
  union all
  (
    select 'finding'::text, f.id, f.title,
           coalesce(f.reference, '') || coalesce(' · ' || d.name, ''),
           ts_rank(f.search_vector, q.tsq)
    from public.findings f
    join public.disciplines d on d.id = f.discipline_id, q
    where f.search_vector @@ q.tsq
    limit max_results
  )
  union all
  (
    select 'document'::text, doc.id, doc.title,
           coalesce(doc.kind::text, ''),
           ts_rank(doc.search_vector, q.tsq)
    from public.documents doc, q
    where doc.search_vector @@ q.tsq
    limit max_results
  )
  order by rank desc
  limit max_results;
$$;
