"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { Finding } from "@/lib/types";

export function FindingAssignment({
  finding,
  teamMembers,
}: {
  finding: Finding;
  teamMembers: Array<{ id: string; full_name: string }>;
}) {
  const [assignedTo, setAssignedTo] = useState<string | null>(
    finding.assigned_to ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssignment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/findings/${finding.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: assignedTo }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign finding");
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Assign to" />
      <CardBody className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-muted">
            Team member
          </label>
          <select
            value={assignedTo ?? ""}
            onChange={(e) => setAssignedTo(e.target.value || null)}
            disabled={loading}
            className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink hover:border-border-default disabled:opacity-50"
          >
            <option value="">Unassigned</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </select>
        </div>

        {finding.assigned_to_name && (
          <p className="text-xs text-ink-faint">
            Currently assigned to: {finding.assigned_to_name}
            {finding.assigned_at && (
              <>
                {" "}
                on {new Date(finding.assigned_at).toLocaleDateString()}
              </>
            )}
          </p>
        )}

        {error && (
          <div className="rounded-lg bg-state-bad-soft p-3 text-sm text-state-bad">
            {error}
          </div>
        )}

        <button
          onClick={handleAssignment}
          disabled={loading || assignedTo === (finding.assigned_to ?? null)}
          className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Assigning..." : "Assign"}
        </button>
      </CardBody>
    </Card>
  );
}
