-- 0013_document_external_links.sql
-- Compliance-officer feedback: independent inspection teams often publish their
-- own reports (a portal, a lab's results page) rather than handing over a file
-- to upload. Documents needed a second way to point at a report: a URL instead
-- of a storage object.
--
-- A document now has exactly one of storage_path (we hold the file) or
-- external_url (we hold a link to where the issuing party hosts it). Never
-- both, never neither -- a document with nothing behind it isn't evidence.

alter table public.documents
  alter column storage_path drop not null;

alter table public.documents
  add column external_url text;

alter table public.documents
  add constraint documents_storage_or_external_check
  check ((storage_path is not null) <> (external_url is not null));

drop view public.documents_api;

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
  doc.external_url,
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
