-- 0002_assets.sql
-- The asset register: sites, and a self-referencing asset hierarchy.

create table public.sites (
  id          uuid primary key default extensions.uuid_generate_v4(),
  org_id      uuid not null references public.organisations (id) on delete cascade,
  name        text not null,
  code        text,
  address     text,
  region      text,
  -- Site centroid, used to fly the map to a site.
  location    extensions.geography(Point, 4326),
  -- Optional site boundary. Enables "everything inside this perimeter" queries.
  boundary    extensions.geography(Polygon, 4326),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, code)
);

create index sites_org_id_idx on public.sites (org_id);
create index sites_location_idx on public.sites using gist (location);

-- Asset types are a table rather than an enum: an operator should be able to add
-- "Pumping Station" or "Kiosk" without a schema migration.
create table public.asset_types (
  id          uuid primary key default extensions.uuid_generate_v4(),
  org_id      uuid not null references public.organisations (id) on delete cascade,
  name        text not null,
  -- Broad bucket used for map iconography and grouping.
  category    text not null default 'building',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, name)
);

create index asset_types_org_id_idx on public.asset_types (org_id);

create table public.assets (
  id             uuid primary key default extensions.uuid_generate_v4(),
  org_id         uuid not null references public.organisations (id) on delete cascade,
  site_id        uuid references public.sites (id) on delete set null,
  asset_type_id  uuid references public.asset_types (id) on delete set null,

  -- Self reference gives us building -> floor -> room -> element. The MVP only
  -- populates the top level, but the shape is what a digital twin needs later.
  parent_id      uuid references public.assets (id) on delete cascade,

  reference      text not null,
  name           text not null,
  description    text,
  status         public.asset_status not null default 'active',

  location       extensions.geography(Point, 4326),
  footprint      extensions.geography(Polygon, 4326),

  -- Attributes that vary by asset type (floors, construction year, area). Same
  -- reasoning as compliance payloads: don't grow a column per asset type.
  attributes     jsonb not null default '{}'::jsonb,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (org_id, reference),
  constraint assets_no_self_parent check (parent_id is null or parent_id <> id)
);

create index assets_org_id_idx on public.assets (org_id);
create index assets_site_id_idx on public.assets (site_id);
create index assets_parent_id_idx on public.assets (parent_id);
create index assets_status_idx on public.assets (org_id, status);
create index assets_location_idx on public.assets using gist (location);
create index assets_attributes_idx on public.assets using gin (attributes);

-- Backs the "powerful search" requirement. Generated + GIN indexed means search
-- stays in Postgres for now; if it outgrows that, this is the seam where an
-- external search service would slot in.
alter table public.assets
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(reference, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored;

create index assets_search_vector_idx on public.assets using gin (search_vector);

create trigger sites_set_updated_at
  before update on public.sites
  for each row execute function public.set_updated_at();

create trigger asset_types_set_updated_at
  before update on public.asset_types
  for each row execute function public.set_updated_at();

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();
