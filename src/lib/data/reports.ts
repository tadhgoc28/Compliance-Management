import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demoReports } from "./demo";

export type ReportType =
  | "compliance_summary"
  | "findings_by_discipline"
  | "asset_audit"
  | "deadline_report";
export type ReportStatus = "pending" | "generating" | "generated" | "failed";
export type FileFormat = "pdf" | "csv" | "xlsx";

export interface Report {
  id: string;
  org_id: string;
  created_by: string;
  report_type: ReportType;
  title: string;
  description: string | null;
  filters: Record<string, unknown>;
  status: ReportStatus;
  file_size_bytes: number | null;
  storage_path: string | null;
  file_format: FileFormat;
  generated_at: string | null;
  expires_at: string | null;
  created_at: string;
  error_message: string | null;
}

export interface ReportFilters {
  discipline?: string[];
  status?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  assetId?: string;
  severity?: string[];
}

/**
 * Create a new report (returns immediately, report generates asynchronously)
 */
export async function createReport(
  orgId: string,
  userId: string,
  reportType: ReportType,
  title: string,
  filters: ReportFilters,
  fileFormat: FileFormat = "pdf",
  description?: string
): Promise<Report> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      org_id: orgId,
      created_by: userId,
      report_type: reportType,
      title,
      description,
      filters,
      file_format: fileFormat,
      status: "pending",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get report by ID
 */
export async function getReport(reportId: string): Promise<Report | null> {
  if (!isSupabaseConfigured) {
    return demoReports.find((r) => r.id === reportId) ?? null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

/**
 * List reports for an organization
 */
export async function listReports(
  orgId: string,
  limit = 50,
  offset = 0
): Promise<{ data: Report[]; total: number }> {
  if (!isSupabaseConfigured) {
    return {
      data: demoReports.slice(offset, offset + limit),
      total: demoReports.length,
    };
  }

  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("reports")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
  };
}

/**
 * List recent reports (last 30 days)
 */
export async function listRecentReports(
  orgId: string,
  limit = 10
): Promise<Report[]> {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("org_id", orgId)
    .gte("created_at", thirtyDaysAgo)
    .eq("status", "generated")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Update report status (used during generation)
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  updates?: {
    file_size_bytes?: number;
    storage_path?: string;
    error_message?: string;
  }
): Promise<Report> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .update({
      status,
      generated_at: status === "generated" ? new Date().toISOString() : undefined,
      ...updates,
    })
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete report and its storage file
 */
export async function deleteReport(reportId: string): Promise<void> {
  const supabase = await createClient();

  // Get report to find storage path
  const report = await getReport(reportId);
  if (!report) return;

  // Delete from storage if exists
  if (report.storage_path) {
    await supabase.storage
      .from("reports")
      .remove([report.storage_path])
      .catch(() => {
        // Silently fail if file doesn't exist
      });
  }

  // Delete database record
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);

  if (error) throw error;
}

/**
 * Get download URL for report
 */
export async function getReportDownloadUrl(
  reportId: string,
  expirationSeconds = 3600
): Promise<string | null> {
  const supabase = await createClient();

  const report = await getReport(reportId);
  if (!report || !report.storage_path) return null;

  const { data } = supabase.storage
    .from("reports")
    .getPublicUrl(report.storage_path);

  // Note: For private downloads, use getSignedUrl instead
  if (data?.publicUrl) {
    return data.publicUrl;
  }

  // Fallback to signed URL for private access
  const { data: signedUrl, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(report.storage_path, expirationSeconds);

  if (error) return null;
  return signedUrl?.signedUrl || null;
}

/**
 * Clean up expired reports (can be run as scheduled job)
 */
export async function cleanupExpiredReports(): Promise<number> {
  const supabase = await createClient();

  // Get expired reports
  const { data: expiredReports, error: selectError } = await supabase
    .from("reports")
    .select("id, storage_path")
    .lte("expires_at", new Date().toISOString());

  if (selectError) throw selectError;

  if (!expiredReports || expiredReports.length === 0) {
    return 0;
  }

  // Delete storage files
  const filePaths = expiredReports
    .filter((r) => r.storage_path)
    .map((r) => r.storage_path!);

  if (filePaths.length > 0) {
    await supabase.storage.from("reports").remove(filePaths).catch(() => {
      // Silently fail if files don't exist
    });
  }

  // Delete database records
  const reportIds = expiredReports.map((r) => r.id);
  const { error: deleteError } = await supabase
    .from("reports")
    .delete()
    .in("id", reportIds);

  if (deleteError) throw deleteError;

  return reportIds.length;
}

/**
 * Get storage usage for org
 */
export async function getReportStorageUsage(orgId: string): Promise<{
  totalBytes: number;
  reportCount: number;
  averageSize: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .select("file_size_bytes")
    .eq("org_id", orgId)
    .eq("status", "generated");

  if (error) throw error;

  const reports = data || [];
  const totalBytes = reports.reduce((sum, r) => sum + (r.file_size_bytes || 0), 0);

  return {
    totalBytes,
    reportCount: reports.length,
    averageSize: reports.length > 0 ? Math.round(totalBytes / reports.length) : 0,
  };
}

/**
 * Get report templates available
 */
export function getReportTemplates(): Array<{
  type: ReportType;
  name: string;
  description: string;
  supportedFormats: FileFormat[];
}> {
  return [
    {
      type: "compliance_summary",
      name: "Compliance Summary",
      description:
        "Overall compliance status by discipline with trend data and overdue counts",
      supportedFormats: ["pdf", "csv"],
    },
    {
      type: "findings_by_discipline",
      name: "Findings by Discipline",
      description: "Detailed findings report grouped by discipline and severity",
      supportedFormats: ["pdf", "csv", "xlsx"],
    },
    {
      type: "asset_audit",
      name: "Asset Audit Trail",
      description: "Complete inspection and remediation history for specific asset",
      supportedFormats: ["pdf", "csv"],
    },
    {
      type: "deadline_report",
      name: "Deadline Report",
      description: "All overdue and upcoming inspections with priority ordering",
      supportedFormats: ["pdf", "csv"],
    },
  ];
}
