"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "monitoring", label: "Monitoring" },
  { value: "in_remediation", label: "In remediation" },
  { value: "remediated", label: "Remediated" },
  { value: "removed", label: "Removed" },
  { value: "closed", label: "Closed" },
];

export function BulkActionsToolbar({
  selectedCount,
  teamMembers,
  onSelectNone,
}: {
  selectedCount: number;
  teamMembers: Array<{ id: string; full_name: string }>;
  onSelectNone: () => void;
}) {
  const [status, setStatus] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleBulkUpdate() {
    if (!status && !assignedTo) {
      setError("Select at least one action");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/findings/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingIds: Array.from(
            document.querySelectorAll('input[name="finding-checkbox"]:checked')
          ).map((el) => (el as HTMLInputElement).value),
          status: status || undefined,
          assigned_to: assignedTo ? assignedTo : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update findings");
      }

      const data = await res.json();
      setSuccess(`Updated ${data.updated} finding${data.updated !== 1 ? "s" : ""}`);
      setStatus("");
      setAssignedTo("");

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-14 z-30 flex flex-wrap items-center gap-3 border-y border-border-subtle bg-surface-muted px-4 py-3 md:px-6">
      <span className="text-sm font-medium text-ink">
        {selectedCount} selected
      </span>

      <div className="flex flex-wrap items-center gap-2 flex-1">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={loading}
          className="rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs text-ink"
        >
          <option value="">Change status...</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          disabled={loading}
          className="rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs text-ink"
        >
          <option value="">Assign to...</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>

        <button
          onClick={handleBulkUpdate}
          disabled={loading || (!status && !assignedTo)}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Updating..." : "Apply"}
        </button>

        <button
          onClick={onSelectNone}
          disabled={loading}
          className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-lg bg-state-bad-soft p-2 text-xs text-state-bad w-full">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-state-ok-soft p-2 text-xs text-state-ok w-full">
          {success}
        </div>
      )}
    </div>
  );
}
