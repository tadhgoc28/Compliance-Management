import type { StyleSpecification } from "maplibre-gl";
import { MAP_STYLE_URL } from "@/lib/env";

/**
 * A self-contained raster style built on OpenStreetMap tiles. No API key, no
 * account, no billing — which is what lets the map work in demo mode out of the
 * box. Set NEXT_PUBLIC_MAP_STYLE_URL to a vector style URL (Mapbox, Ordnance
 * Survey, MapTiler) to upgrade; the map component takes a string or this object
 * interchangeably.
 *
 * OSM's tile usage policy is fine for development and demos. For production
 * traffic, move to a proper tile provider — that is a config change here, not a
 * code change anywhere else.
 */
const OSM_RASTER: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        // Desaturate slightly so status-coloured markers stay the loudest thing
        // on the map.
        "raster-saturation": -0.3,
        "raster-contrast": -0.05,
      },
    },
  ],
};

export function resolveMapStyle(): string | StyleSpecification {
  if (MAP_STYLE_URL && MAP_STYLE_URL !== "__osm_raster__") {
    return MAP_STYLE_URL;
  }
  return OSM_RASTER;
}
