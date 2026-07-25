import type { Finding, DashboardSummary } from "@/lib/types";

/**
 * Export findings as CSV
 */
export function exportFindingsAsCSV(findings: Finding[]): string {
  const headers = [
    "Reference",
    "Title",
    "Asset",
    "Discipline",
    "Severity",
    "Status",
    "Identified At",
    "Assigned To",
  ];

  const rows = findings.map((f) => [
    f.reference,
    f.title,
    f.asset_name || "",
    f.discipline_name,
    f.severity,
    f.status,
    new Date(f.identified_at).toLocaleDateString(),
    f.assigned_to_name || "Unassigned",
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Export findings as JSON
 */
export function exportFindingsAsJSON(findings: Finding[]): string {
  return JSON.stringify(findings, null, 2);
}

/**
 * Export dashboard summary as JSON
 */
export function exportDashboardAsJSON(summary: DashboardSummary): string {
  const exportData = {
    generated_at: new Date().toISOString(),
    compliance_metrics: {
      compliance_rate: summary.compliance_rate,
      compliant: summary.compliant_count,
      due_soon: summary.due_soon_count,
      overdue: summary.overdue_count,
      total_tracked: summary.compliant_count + summary.due_soon_count + summary.overdue_count,
    },
    asset_metrics: {
      total_assets: summary.asset_count,
      total_sites: summary.site_count,
    },
    finding_metrics: {
      total_open: summary.open_findings,
      critical: summary.critical_findings,
      by_severity: summary.findings_by_severity,
      by_status: summary.findings_by_status,
    },
    discipline_breakdown: summary.by_discipline,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download file to user
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = "text/plain"
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
