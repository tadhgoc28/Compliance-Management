"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { Finding, FindingStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: FindingStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "monitoring", label: "Monitoring" },
  { value: "in_remediation", label: "In remediation" },
  { value: "remediated", label: "Remediated" },
  { value: "removed", label: "Removed" },
  { value: "closed", label: "Closed" },
];

export function StatusTransition({ finding }: { finding: Finding }) {
  const [status, setStatus] = useState<FindingStatus>(finding.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange() {
    if (status === finding.status) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/findings/${finding.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus(finding.status);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Change status" />
      <CardBody className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-muted">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FindingStatus)}
            disabled={loading}
            className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink hover:border-border-default disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg bg-state-bad-soft p-3 text-sm text-state-bad">
            {error}
          </div>
        )}

        <button
          onClick={handleStatusChange}
          disabled={loading || status === finding.status}
          className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Updating..." : "Update status"}
        </button>
      </CardBody>
    </Card>
  );
}
