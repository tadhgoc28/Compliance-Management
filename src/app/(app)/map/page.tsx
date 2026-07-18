import { PageHeader } from "@/components/ui/page-header";
import { MapContainer } from "@/components/map/map-container";
import { listAllCompliance, listMapAssets } from "@/lib/data";
import type { ComplianceState } from "@/lib/types";

export const metadata = { title: "Map" };

const STATE_RANK: Record<ComplianceState, number> = {
  overdue: 0,
  due_soon: 1,
  unknown: 2,
  compliant: 3,
  not_applicable: 4,
};

type MapState = "overdue" | "due_soon" | "compliant" | "unknown";

export default async function MapPage() {
  const [assets, compliance] = await Promise.all([
    listMapAssets(),
    listAllCompliance(),
  ]);

  const worst = new Map<string, ComplianceState>();
  for (const c of compliance) {
    const current = worst.get(c.asset_id);
    if (!current || STATE_RANK[c.compliance_state] < STATE_RANK[current]) {
      worst.set(c.asset_id, c.compliance_state);
    }
  }

  const withState = assets.map((a) => {
    const state = worst.get(a.id);
    const mapState: MapState =
      state === "overdue" || state === "due_soon" || state === "compliant"
        ? state
        : "unknown";
    return { ...a, worst_state: mapState };
  });

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Estate map"
        description="Assets by location. Marker colour shows the worst compliance state at each asset."
      />
      <div className="relative flex-1">
        <MapContainer assets={withState} />
        <Legend />
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Overdue", className: "bg-state-bad" },
    { label: "Due soon", className: "bg-state-warn" },
    { label: "Compliant", className: "bg-state-ok" },
    { label: "Not scheduled", className: "bg-state-idle" },
  ];
  return (
    <div className="absolute bottom-6 left-4 z-10 rounded-xl border border-border-subtle bg-surface/90 p-3 shadow-lg backdrop-blur">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        Compliance state
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ring-2 ring-white ${item.className}`}
            />
            <span className="text-xs text-ink">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
