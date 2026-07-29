/**
 * Environment access.
 *
 * `isSupabaseConfigured` is what lets the app boot with no backend at all and
 * fall back to the demo dataset. See src/lib/data/index.ts for where that
 * decision is actually made.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/**
 * A free OpenStreetMap raster style. No API key, no billing, and good enough to
 * build against. Swap NEXT_PUBLIC_MAP_STYLE_URL for a vector style when you move
 * to Mapbox or Ordnance Survey; nothing in the map component depends on this
 * being raster.
 */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "__osm_raster__";

/** Base URL used to build absolute links -- QR codes, email CTAs -- outside a request context. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.complyra.io";
