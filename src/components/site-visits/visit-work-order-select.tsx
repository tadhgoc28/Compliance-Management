"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkOrder } from "@/lib/types";

/** Inline control on a visit row -- assigns or clears which work order its logged hours count against. */
export function VisitWorkOrderSelect({
  visitId,
  workOrderId,
  workOrders,
}: {
  visitId: string;
  workOrderId: string | null;
  workOrders: WorkOrder[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(value: string) {
    setSaving(true);
    try {
      await fetch(`/api/site-visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId: value || null }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={workOrderId ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className="rounded-lg border border-border-subtle bg-surface px-1.5 py-1 text-xs text-ink-muted disabled:opacity-50"
      title="Assign to a work order"
    >
      <option value="">No work order</option>
      {workOrders.map((wo) => (
        <option key={wo.id} value={wo.id}>
          {wo.reference}
        </option>
      ))}
    </select>
  );
}
