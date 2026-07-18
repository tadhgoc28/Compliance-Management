-- 0004_documents.sql
-- Files: reports, certificates, drawings and photos.
--
-- One table, not a separate `photos` table. A photo is a document that happens
-- to have pixels; splitting them would mean two upload paths, two permission
-- models and two things to keep in step. The gallery is a filter (kind='photo'),
-- not a different storage concept.

create table public.documents (
  id             uuid primary key default extensions.uuid_generate_v4(),
  org_id         uuid not null references public.organisations (id) on delete cascade,

  -- All optional. A document may hang off an asset, an inspection, a finding, or
  -- none of them (an org-wide policy document).
  asset_id       uuid references public.assets (id) on delete cascade,
  inspection_id  uuid references public.inspections (id) on delete set null,
  finding_id     uuid references public.findings (id) on delete set null,
  discipline_id  uuid references public.disciplines (id) on delete set null,

  kind           public.document_kind not null default 'other',
  title          text not null,
  description    text,

  -- Object key within the Supabase Storage bucket. The file itself never lives
  -- in Postgres; this row is the metadata and the permission anchor.
  bucket         text not null default 'documents',
  storage_path   text not null,
  mime_type      text,
  size_bytes     bigint check (size_bytes is null or size_bytes >= 0),
  checksum       text,

  -- Photo-specific, null for everything else.
  width          integer,
  height         integer,
  taken_at       timestamptz,
  -- Geotag, when the camera recorded one. Lets the gallery plot onto the map.
  location       extensions.geography(Point, 4326),

  -- Document date as opposed to upload date: a certificate issued in March and
  -- uploaded in August needs both, and expiry drives compliance reminders.
  issued_at      date,
  expires_at     date,

  uploaded_by    uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (bucket, storage_path)
);

create index documents_org_id_idx on public.documents (org_id);
create index documents_asset_id_idx on public.documents (asset_id);
create index documents_inspection_id_idx on public.documents (inspection_id);
create index documents_finding_id_idx on public.documents (finding_id);
create index documents_kind_idx on public.documents (org_id, kind);
create index documents_expires_at_idx on public.documents (org_id, expires_at) where expires_at is not null;
create index documents_location_idx on public.documents using gist (location);

alter table public.documents
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored;

create index documents_search_vector_idx on public.documents using gin (search_vector);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();
