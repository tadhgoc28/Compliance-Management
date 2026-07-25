"use client";

import { Download } from "lucide-react";
import { exportDashboardAsJSON, downloadFile } from "@/lib/export";
import type { DashboardSummary } from "@/lib/types";

export function ExportMetrics({ summary }: { summary: DashboardSummary }) {
  function handleExport() {
    const json = exportDashboardAsJSON(summary);
    downloadFile(
      json,
      `compliance-metrics-${new Date().toISOString().split("T")[0]}.json`,
      "application/json"
    );
  }

  return (
    <button
      onClick={handleExport}
      title="Export compliance metrics as JSON"
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover transition-colors"
    >
      <Download className="size-4" />
      Export metrics
    </button>
  );
}
