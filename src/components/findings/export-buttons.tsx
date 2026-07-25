"use client";

import { Download } from "lucide-react";
import { exportFindingsAsCSV, exportFindingsAsJSON, downloadFile } from "@/lib/export";
import type { Finding } from "@/lib/types";

export function ExportButtons({ findings }: { findings: Finding[] }) {
  function handleExportCSV() {
    const csv = exportFindingsAsCSV(findings);
    downloadFile(
      csv,
      `findings-${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv"
    );
  }

  function handleExportJSON() {
    const json = exportFindingsAsJSON(findings);
    downloadFile(
      json,
      `findings-${new Date().toISOString().split("T")[0]}.json`,
      "application/json"
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportCSV}
        title="Export as CSV for Excel"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover transition-colors"
      >
        <Download className="size-4" />
        CSV
      </button>
      <button
        onClick={handleExportJSON}
        title="Export as JSON"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover transition-colors"
      >
        <Download className="size-4" />
        JSON
      </button>
    </div>
  );
}
