import { createClient } from "@/lib/supabase/server";
import { getComplianceSummaryByDiscipline, listFindings, listInspections } from "@/lib/data/filters";
import { updateReportStatus } from "@/lib/data/reports";
import type { ReportType, ReportFilters } from "@/lib/data/reports";
import type { FindingFilters, InspectionFilters } from "@/lib/data/filters";

export interface ReportGenerationTask {
  reportId: string;
  orgId: string;
  reportType: ReportType;
  filters: ReportFilters;
  fileFormat: "pdf" | "csv" | "xlsx";
}

/**
 * Generate compliance summary report
 */
async function generateComplianceSummaryReport(
  filters: ReportFilters
): Promise<string> {
  const summary = await getComplianceSummaryByDiscipline();

  // Filter by discipline if specified
  const filtered = filters.discipline
    ? summary.filter((s) => s.discipline_id === filters.discipline?.[0])
    : summary;

  const csv = buildComplianceSummaryCSV(filtered);
  return csv;
}

/**
 * Generate findings by discipline report
 */
async function generateFindingsByDisciplineReport(
  filters: ReportFilters
): Promise<string> {
  const findingFilters: FindingFilters = {
    disciplineIds: filters.discipline,
    severity: filters.severity?.[0] as "low" | "medium" | "high" | undefined,
    status: filters.status as "open" | "in_progress" | "closed" | "resolved" | undefined,
    startDate: filters.dateRange?.startDate,
    endDate: filters.dateRange?.endDate,
    limit: 10000,
  };

  const result = await listFindings(findingFilters);
  const findings = result.data;

  // Group by discipline
  const grouped = (findings as any[]).reduce(
    (acc, f) => {
      const key = f.disciplines?.id || "unknown";
      if (!acc[key]) {
        acc[key] = {
          discipline: f.disciplines?.name || "Unknown",
          findings: [],
        };
      }
      acc[key].findings.push(f);
      return acc;
    },
    {} as Record<string, any>
  );

  const csv = buildFindingsByDisciplineCSV(grouped);
  return csv;
}

/**
 * Generate asset audit trail report
 */
async function generateAssetAuditReport(
  assetId: string,
  filters: ReportFilters
): Promise<string> {
  const supabase = await createClient();

  // Get asset
  const { data: asset } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .single();

  if (!asset) throw new Error("Asset not found");

  // Get inspection history
  const inspectionFilters: InspectionFilters = {
    assetId,
    startDate: filters.dateRange?.startDate,
    endDate: filters.dateRange?.endDate,
    limit: 10000,
  };

  const inspResult = await listInspections(inspectionFilters);
  const inspections = inspResult.data;

  // Get findings for asset
  const findingFilters: FindingFilters = {
    assetId,
    startDate: filters.dateRange?.startDate,
    endDate: filters.dateRange?.endDate,
    limit: 10000,
  };

  const findResult = await listFindings(findingFilters);
  const findings = findResult.data;

  const csv = buildAssetAuditCSV(asset, inspections as any, findings);
  return csv;
}

/**
 * Generate deadline report (overdue/due soon)
 */
async function generateDeadlineReport(
  orgId: string,
  filters: ReportFilters
): Promise<string> {
  const supabase = await createClient();

  const { data: deadlines } = await supabase
    .from("asset_disciplines")
    .select(
      `
      id,
      next_due_date,
      last_inspection_at,
      compliance_state,
      assets(id, name, reference),
      disciplines(name)
    `
    )
    .eq("org_id", orgId)
    .in("compliance_state", ["overdue", "due_soon"])
    .order("next_due_date", { ascending: true });

  const csv = buildDeadlineReportCSV((deadlines as any) || []);
  return csv;
}

/**
 * Build compliance summary CSV
 */
function buildComplianceSummaryCSV(
  summary: Array<{
    discipline_name: string;
    total_assets: number;
    compliant: number;
    due_soon: number;
    overdue: number;
    unknown: number;
    compliance_percentage: number;
  }>
): string {
  const headers = [
    "Discipline",
    "Total Assets",
    "Compliant",
    "Due Soon",
    "Overdue",
    "Unknown",
    "Compliance %",
  ];

  const rows = summary.map((s) => [
    s.discipline_name,
    s.total_assets.toString(),
    s.compliant.toString(),
    s.due_soon.toString(),
    s.overdue.toString(),
    s.unknown.toString(),
    s.compliance_percentage.toString(),
  ]);

  return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

/**
 * Build findings by discipline CSV
 */
function buildFindingsByDisciplineCSV(
  grouped: Record<
    string,
    {
      discipline: string;
      findings: Array<{
        title: string;
        severity: string;
        status: string;
        identified_at: string;
      }>;
    }
  >
): string {
  const rows: string[][] = [];

  Object.entries(grouped).forEach(([_, group]) => {
    rows.push([`Discipline: ${group.discipline}`, "", "", "", ""]);
    rows.push(["Title", "Severity", "Status", "Identified", ""]);

    group.findings.forEach((f) => {
      rows.push([
        f.title,
        f.severity,
        f.status,
        new Date(f.identified_at).toLocaleDateString(),
        "",
      ]);
    });

    rows.push(["", "", "", "", ""]);
  });

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

/**
 * Build asset audit CSV
 */
function buildAssetAuditCSV(
  asset: any,
  inspections: Array<{
    scheduled_for: string;
    completed_at: string | null;
    status: string;
    disciplines: { name: string } | null;
  }>,
  findings: Array<{
    title: string;
    severity: string;
    status: string;
    identified_at: string;
  }>
): string {
  const rows: string[][] = [];

  rows.push(["Asset Audit Trail Report"]);
  rows.push(["Asset Name", asset.name]);
  rows.push(["Asset Reference", asset.reference]);
  rows.push(["Site", asset.site_name || ""]);
  rows.push(["Generated", new Date().toLocaleString()]);
  rows.push([]);

  rows.push(["Inspection History"]);
  rows.push(["Discipline", "Scheduled", "Completed", "Status"]);

  inspections.forEach((i) => {
    rows.push([
      (i.disciplines as any)?.name || "Unknown",
      new Date(i.scheduled_for).toLocaleDateString(),
      i.completed_at ? new Date(i.completed_at).toLocaleDateString() : "Pending",
      i.status,
    ]);
  });

  rows.push([]);
  rows.push(["Findings"]);
  rows.push(["Title", "Severity", "Status", "Identified"]);

  findings.forEach((f) => {
    rows.push([f.title, f.severity, f.status, new Date(f.identified_at).toLocaleDateString()]);
  });

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

/**
 * Build deadline report CSV
 */
function buildDeadlineReportCSV(
  deadlines: Array<{
    id: string;
    next_due_date: string;
    last_inspection_at: string | null;
    compliance_state: string;
    assets: { id: string; name: string; reference: string } | null;
    disciplines: { name: string } | null;
  }>
): string {
  const sorted = [...deadlines].sort(
    (a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
  );

  const rows: string[][] = [
    ["Asset", "Reference", "Discipline", "Status", "Due Date", "Last Inspection"],
  ];

  sorted.forEach((d) => {
    rows.push([
      d.assets?.name || "Unknown",
      d.assets?.reference || "",
      d.disciplines?.name || "Unknown",
      d.compliance_state.toUpperCase(),
      new Date(d.next_due_date).toLocaleDateString(),
      d.last_inspection_at
        ? new Date(d.last_inspection_at).toLocaleDateString()
        : "Never",
    ]);
  });

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

/**
 * Generate report and save to storage
 */
export async function generateReport(task: ReportGenerationTask): Promise<{
  success: boolean;
  filePath?: string;
  fileSize?: number;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Mark as generating
    await updateReportStatus(task.reportId, "generating");

    let csvContent: string;

    // Generate appropriate report
    switch (task.reportType) {
      case "compliance_summary":
        csvContent = await generateComplianceSummaryReport(task.filters);
        break;

      case "findings_by_discipline":
        csvContent = await generateFindingsByDisciplineReport(task.filters);
        break;

      case "asset_audit":
        if (!task.filters.assetId) {
          throw new Error("assetId required for asset_audit report");
        }
        csvContent = await generateAssetAuditReport(task.filters.assetId, task.filters);
        break;

      case "deadline_report":
        csvContent = await generateDeadlineReport(task.orgId, task.filters);
        break;

      default:
        throw new Error(`Unknown report type: ${task.reportType}`);
    }

    // Convert to appropriate format
    let fileContent: string | Uint8Array;
    let mimeType = "text/csv";

    if (task.fileFormat === "pdf") {
      // For now, CSV is stored; in future, convert to PDF with pdf-lib
      fileContent = csvContent;
      mimeType = "text/csv";
    } else if (task.fileFormat === "xlsx") {
      // For now, store as CSV; future: convert to Excel
      fileContent = csvContent;
      mimeType = "text/csv";
    } else {
      fileContent = csvContent;
      mimeType = "text/csv";
    }

    // Upload to storage
    const fileName = `reports/${task.orgId}/${task.reportId}-${Date.now()}.csv`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("reports")
      .upload(fileName, fileContent, {
        cacheControl: "3600",
        contentType: mimeType,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Update report record
    const fileSize = Buffer.byteLength(fileContent);
    await updateReportStatus(task.reportId, "generated", {
      file_size_bytes: fileSize,
      storage_path: uploadData.path,
    });

    return {
      success: true,
      filePath: uploadData.path,
      fileSize,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    // Mark as failed
    await updateReportStatus(task.reportId, "failed", {
      error_message: errorMsg,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Queue report for async generation (would be called by a job queue in production)
 * For now, generates synchronously; in production use Bull/RabbitMQ
 */
export async function queueReportGeneration(
  task: ReportGenerationTask
): Promise<{ success: boolean; reportId: string }> {
  const result = await generateReport(task);

  if (!result.success) {
    throw new Error(`Report generation failed: ${result.error}`);
  }

  return {
    success: true,
    reportId: task.reportId,
  };
}
