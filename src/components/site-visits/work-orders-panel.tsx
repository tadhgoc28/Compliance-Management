"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import type { RateUnit, SiteVisit, WorkOrder } from "@/lib/types";

const RATE_UNIT_LABEL: Record<RateUnit, string> = {
  hourly: "/hour",
  daily: "/day",
  fixed: "flat",
};

/** Approximation for pricing a "daily" rate against minutes actually logged -- there's no shift-length field yet. */
const HOURS_PER_DAY = 8;

function costFor(workOrder: WorkOrder, totalMinutes: number): string {
  if (workOrder.agreed_rate == null) return "—";
  const hours = totalMinutes / 60;
  const amount =
    workOrder.rate_unit === "hourly"
      ? hours * workOrder.agreed_rate
      : workOrder.rate_unit === "daily"
        ? (hours / HOURS_PER_DAY) * workOrder.agreed_rate
        : workOrder.agreed_rate;
  return `€${amount.toLocaleString("en-IE", { maximumFractionDigits: 0 })}`;
}

export function WorkOrdersPanel({
  workOrders,
  visits,
  assets,
}: {
  workOrders: WorkOrder[];
  visits: SiteVisit[];
  assets: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [assetId, setAssetId] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [rateUnit, setRateUnit] = useState<RateUnit>("hourly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minutesByWorkOrder = new Map<string, number>();
  for (const v of visits) {
    if (!v.work_order_id || !v.checked_out_at) continue;
    const minutes = Math.max(
      0,
      Math.round((new Date(v.checked_out_at).getTime() - new Date(v.checked_in_at).getTime()) / 60000),
    );
    minutesByWorkOrder.set(v.work_order_id, (minutesByWorkOrder.get(v.work_order_id) ?? 0) + minutes);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!reference.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: reference.trim(),
          description: description.trim() || undefined,
          assetId: assetId || undefined,
          agreedRate: agreedRate ? Number(agreedRate) : undefined,
          rateUnit,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add work order");
      }
      setReference("");
      setDescription("");
      setAssetId("");
      setAgreedRate("");
      setRateUnit("hourly");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove work order");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <Card>
      <CardHeader
        title="Work orders"
        description="What a job was agreed at -- link visits to one below to price logged hours against it."
      />
      <CardBody>
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Reference (e.g. WO-1004)"
            className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint lg:col-span-2"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint lg:col-span-2"
          />
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">No asset</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={agreedRate}
              onChange={(e) => setAgreedRate(e.target.value)}
              placeholder="Rate"
              className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
            />
          </div>
          <select
            value={rateUnit}
            onChange={(e) => setRateUnit(e.target.value as RateUnit)}
            className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="hourly">Per hour</option>
            <option value="daily">Per day</option>
            <option value="fixed">Fixed</option>
          </select>
          <button
            type="submit"
            disabled={loading || !reference.trim()}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50 lg:col-span-6"
          >
            Add work order
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-state-bad">{error}</p>}

        <div className="mt-5">
          {workOrders.length === 0 ? (
            <EmptyState title="No work orders yet" description="Add one above, then assign visits to it below." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                    <th className="py-2 pr-4 font-medium">Reference</th>
                    <th className="py-2 pr-4 font-medium">Asset</th>
                    <th className="py-2 pr-4 font-medium">Rate</th>
                    <th className="py-2 pr-4 font-medium">Hours logged</th>
                    <th className="py-2 pr-4 font-medium">Est. cost</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {workOrders.map((wo) => {
                    const minutes = minutesByWorkOrder.get(wo.id) ?? 0;
                    return (
                      <tr key={wo.id}>
                        <td className="py-2.5 pr-4 text-ink">
                          <p className="font-medium">{wo.reference}</p>
                          {wo.description && <p className="text-xs text-ink-faint">{wo.description}</p>}
                        </td>
                        <td className="py-2.5 pr-4 text-ink-muted">{wo.asset_name ?? "—"}</td>
                        <td className="tnum py-2.5 pr-4 text-ink-muted">
                          {wo.agreed_rate != null ? `€${wo.agreed_rate} ${RATE_UNIT_LABEL[wo.rate_unit]}` : "—"}
                        </td>
                        <td className="tnum py-2.5 pr-4 text-ink-muted">{(minutes / 60).toFixed(1)}h</td>
                        <td className="tnum py-2.5 pr-4 text-ink">{costFor(wo, minutes)}</td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleRemove(wo.id)}
                            className="text-ink-faint hover:text-state-bad"
                            title="Remove"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
