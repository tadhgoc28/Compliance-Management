"use client";

import dynamic from "next/dynamic";
import type { Asset } from "@/lib/types";

/**
 * Client wrapper so the map can be dynamically imported with ssr disabled.
 * Next 16 forbids `ssr: false` in a Server Component, so the page renders this
 * (a Client Component) and this owns the dynamic import.
 */
const AssetMap = dynamic(
  () => import("./asset-map").then((m) => m.AssetMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid size-full place-items-center bg-surface-muted">
        <p className="text-sm text-ink-muted">Loading map…</p>
      </div>
    ),
  },
);

type MapState = "overdue" | "due_soon" | "compliant" | "unknown";

export function MapContainer({
  assets,
}: {
  assets: (Asset & { worst_state: MapState })[];
}) {
  return <AssetMap assets={assets} />;
}
