"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { SeverityBadge, FindingStatusBadge } from "@/components/ui/badge";
import { BulkActionsToolbar } from "./bulk-actions-toolbar";
import type { Finding } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function FindingsList({
  findings,
  teamMembers,
}: {
  findings: Finding[];
  teamMembers: Array<{ id: string; full_name: string }>;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === findings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(findings.map((f) => f.id)));
    }
  };

  return (
    <div>
      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        teamMembers={teamMembers}
        onSelectNone={() => setSelectedIds(new Set())}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
              <th className="px-5 py-2.5 font-medium w-6">
                <input
                  type="checkbox"
                  checked={selectedIds.size === findings.length && findings.length > 0}
                  onChange={toggleSelectAll}
                  className="size-4 rounded border-border-subtle cursor-pointer"
                />
              </th>
              <th className="px-5 py-2.5 font-medium">Finding</th>
              <th className="px-5 py-2.5 font-medium">Asset</th>
              <th className="px-5 py-2.5 font-medium">Discipline</th>
              <th className="px-5 py-2.5 font-medium">Identified</th>
              <th className="px-5 py-2.5 font-medium">Severity</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {findings.map((f) => (
              <tr
                key={f.id}
                className={`transition-colors ${
                  selectedIds.has(f.id)
                    ? "bg-brand-soft/30"
                    : "hover:bg-surface-muted"
                }`}
              >
                <td className="px-5 py-2.5">
                  <input
                    type="checkbox"
                    name="finding-checkbox"
                    value={f.id}
                    checked={selectedIds.has(f.id)}
                    onChange={() => toggleSelection(f.id)}
                    className="size-4 rounded border-border-subtle cursor-pointer"
                  />
                </td>
                <td className="px-5 py-2.5">
                  <Link
                    href={`/findings/${f.id}`}
                    className="block hover:text-brand transition-colors"
                  >
                    <p className="font-medium text-ink">{f.title}</p>
                    <p className="font-mono text-xs text-ink-faint">{f.reference}</p>
                  </Link>
                </td>
                <td className="px-5 py-2.5">
                  <Link
                    href={`/assets/${f.asset_id}`}
                    className="text-ink-muted hover:text-brand"
                  >
                    {f.asset_name}
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-ink-muted">{f.discipline_name}</td>
                <td className="px-5 py-2.5 text-ink-muted">
                  {formatDate(f.identified_at)}
                </td>
                <td className="px-5 py-2.5">
                  <SeverityBadge severity={f.severity} />
                </td>
                <td className="px-5 py-2.5">
                  <FindingStatusBadge status={f.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
