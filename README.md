# Complyra — Compliance Management Platform

A multi-discipline compliance management platform. It began as an asbestos
management concept and is built as a general platform that manages many
compliance disciplines — asbestos, fire safety, legionella, electrical, gas,
ventilation, roof inspections and structural surveys — over a shared asset
register, inspection and findings model, documents store and map.

This is an MVP built entirely on **fake, generated demo data**. It contains no
confidential or real-world asset information.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no Supabase configured the app runs in **demo
mode** against a generated dataset — every screen is fully browsable. The topbar
shows a "Demo data" badge to make this obvious.

## Connecting Supabase (optional)

Demo mode needs no backend. To persist real records:

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the three values from
   Project Settings → API.
3. Apply the migrations in `supabase/migrations/` in order (via the Supabase SQL
   editor or the Supabase CLI).

The app detects the credentials and switches from demo data to live queries with
no code change.

## Architecture

The design is built around one thesis: **asbestos is only the first discipline**,
so nothing discipline-specific is allowed into the core schema.

- **Shared core + JSON payloads.** Generic tables (`assets`, `inspections`,
  `findings`, `documents`) hold everything common to all disciplines.
  Discipline-specific fields (asbestos material scores, fire door ratings,
  legionella temperatures) live in a validated JSONB `payload`, described by a
  versioned JSON Schema in the `discipline_schemas` registry. Adding a new
  discipline is an insert plus a schema — no migration, no new table, no UI
  rewrite. `src/components/ui/payload-detail.tsx` renders any payload generically.
- **Multi-tenant from day one.** Every business row carries an `org_id`, and
  row-level security (`supabase/migrations/0005_rls.sql`) enforces isolation and
  role-graded writes. Fails closed: a table with no policy denies all access.
- **Derived compliance state.** "Overdue"/"due soon" is computed in a SQL view
  from due dates, never stored, so it can't go stale.
- **Demo/live seam.** `src/lib/data/index.ts` is the single place the two data
  paths diverge; components never know which mode is active.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4
- Supabase — Postgres + PostGIS, Auth, Storage, RLS
- MapLibre GL with a keyless OpenStreetMap raster style (swappable for
  Mapbox / Ordnance Survey via `NEXT_PUBLIC_MAP_STYLE_URL`)

## Project layout

```
src/
  app/
    (app)/            Authenticated shell — dashboard, register, map, findings,
                      documents, gallery, asset detail
    login/            Auth entry (email/password via Supabase)
    api/search/       Cross-entity search endpoint
  components/         Shell, UI primitives, dashboard, map, search, auth
  lib/
    data/             Data access + the demo dataset
    supabase/         Browser and server clients
    types.ts          Domain types
supabase/
  migrations/         Schema, RLS, seeded disciplines, API views (apply in order)
```

## Roadmap

Future phases (not in this MVP): AI-powered search, work-package planning, BIM
integration, digital twins, and a Street View-style building viewer. The schema
already anticipates these — the self-referencing `assets` hierarchy supports
building → floor → room → element decomposition, and findings carry a location
note that can later resolve to a BIM element id.
