"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ReportBuilder } from "./report-builder";
import { ReportList } from "./report-list";

export function ReportsPageClient() {
  const [showBuilder, setShowBuilder] = useState(false);
  // Bumping this remounts ReportList, which forces an immediate refetch
  // instead of waiting for its 10s poll.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {showBuilder ? (
          <button
            onClick={() => setShowBuilder(false)}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
          >
            <X className="size-4" />
            Cancel
          </button>
        ) : (
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-strong"
          >
            <Plus className="size-4" />
            New report
          </button>
        )}
      </div>

      {showBuilder ? (
        <ReportBuilder
          onReportCreated={() => {
            setShowBuilder(false);
            setRefreshKey((k) => k + 1);
          }}
          onClose={() => setShowBuilder(false)}
        />
      ) : null}

      <ReportList key={refreshKey} />
    </div>
  );
}
