"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import { resolveMapStyle } from "./map-style";
import type { Asset } from "@/lib/types";

/**
 * Asset map.
 *
 * Markers are rendered as a GeoJSON source with a clustered circle layer, not as
 * DOM markers. With hundreds to thousands of assets, DOM markers stutter on pan;
 * a data-driven layer stays smooth and is the same code path that scales to a
 * full estate.
 *
 * Colour encodes compliance state (status palette, never categorical), so a
 * cluster's colour tells you whether anything inside it needs attention.
 */

interface MapAsset extends Asset {
  worst_state: "overdue" | "due_soon" | "compliant" | "unknown";
}

// Read from CSS custom properties so the map matches the app theme and updates
// with it, rather than hard-coding hex that drifts from the design tokens.
function cssColor(token: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  if (!value) return fallback;

  // Convert LAB to hex if needed (browser may normalize oklch to lab)
  if (value.startsWith("lab(")) {
    return labToHex(value);
  }
  return value;
}

function labToHex(lab: string): string {
  const match = lab.match(/lab\(([\d.]+)%?\s+([-\d.]+)\s+([-\d.]+)\)/);
  if (!match) return "#3f9a5f";

  const l = parseFloat(match[1]);
  const a = parseFloat(match[2]);
  const b = parseFloat(match[3]);

  // LAB to XYZ
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  x = x * x * x;
  y = y * y * y;
  z = z * z * z;

  // XYZ to RGB (D65 illuminant)
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bb = x * 0.0557 + y * -0.204 + z * 1.057;

  // Gamma correction
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  bb = bb > 0.0031308 ? 1.055 * Math.pow(bb, 1 / 2.4) - 0.055 : 12.92 * bb;

  // Clamp and convert to hex
  const toHex = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    const byte = Math.round(clamped * 255);
    return byte.toString(16).padStart(2, "0");
  };

  return "#" + toHex(r) + toHex(g) + toHex(bb);
}

export function AssetMap({ assets }: { assets: MapAsset[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolveMapStyle(),
      center: [-7.9, 53.2], // Roughly the centre of Ireland.
      zoom: 6.3,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    const okColor = cssColor("--color-state-ok", "#3f9a5f");
    const warnColor = cssColor("--color-state-warn", "#d99a2b");
    const badColor = cssColor("--color-state-bad", "#c4462f");
    const idleColor = cssColor("--color-state-idle", "#9aa3ad");

    const features: GeoJSON.Feature<GeoJSON.Point>[] = assets
      .filter((a) => a.longitude !== null && a.latitude !== null)
      .map((a) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [a.longitude!, a.latitude!] },
        properties: {
          id: a.id,
          name: a.name,
          reference: a.reference,
          site: a.site_name ?? "",
          state: a.worst_state,
        },
      }));

    const data: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: "FeatureCollection",
      features,
    };

    map.on("load", () => {
      map.addSource("assets", {
        type: "geojson",
        data,
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 13,
      });

      // Clusters: neutral, sized by count. Detail-level colour is the signal, so
      // clusters stay quiet.
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "assets",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": cssColor("--color-brand", "#3b6fb0"),
          "circle-opacity": 0.9,
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 40, 30],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "assets",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "asset-points",
        type: "circle",
        source: "assets",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-color": [
            "match",
            ["get", "state"],
            "overdue", badColor,
            "due_soon", warnColor,
            "compliant", okColor,
            idleColor,
          ],
        },
      });

      // Zoom into a cluster on click.
      map.on("click", "clusters", (e) => {
        const feature = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource("assets") as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        });
      });

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
      });

      map.on("mouseenter", "asset-points", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, string>;
        popup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<div style="padding:8px 10px;min-width:150px">
               <div style="font-weight:600;font-size:13px">${escapeHtml(p.name)}</div>
               <div style="font-size:11px;opacity:0.7;margin-top:2px">${escapeHtml(p.reference)}</div>
               <div style="font-size:11px;opacity:0.7">${escapeHtml(p.site)}</div>
             </div>`,
          )
          .addTo(map);
      });

      map.on("mouseleave", "asset-points", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      map.on("click", "asset-points", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) router.push(`/assets/${id}`);
      });

      // Frame the data if there is any.
      if (features.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const f of features) {
          bounds.extend(f.geometry.coordinates as [number, number]);
        }
        map.fitBounds(bounds, { padding: 64, maxZoom: 13, duration: 0 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [assets, router]);

  return <div ref={containerRef} className="size-full" />;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
