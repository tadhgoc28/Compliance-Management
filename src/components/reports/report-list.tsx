"use client";

import { useState, useEffect } from "react";
import { Download, Trash2, Clock, CheckCircle, AlertCircle, Loader } from "lucide-react";
import type { Report } from "@/lib/data/reports";

type ReportWithDownloadUrl = Report & { download_url?: string | null };

export function ReportList() {
  const [reports, setReports] = useState<ReportWithDownloadUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
    // Refresh every 10 seconds to check for generated reports
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchReports() {
    try {
      const response = await fetch("/api/reports");
      if (!response.ok) throw new Error("Failed to fetch reports");
      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteReport(reportId: string) {
    setDeleting(reportId);
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete report");
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(null);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "generated":
        return <CheckCircle className="size-5 text-state-ok" />;
      case "generating":
        return <Loader className="size-5 text-state-warn animate-spin" />;
      case "pending":
        return <Clock className="size-5 text-state-warn" />;
      case "failed":
        return <AlertCircle className="size-5 text-state-bad" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      compliance_summary: "Compliance Summary",
      findings_by_discipline: "Findings by Discipline",
      asset_audit: "Asset Audit",
      deadline_report: "Deadline Report",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader className="size-6 text-brand animate-spin" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-muted">No reports yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-3 p-4 bg-state-bad-soft rounded-lg text-state-bad">
          <AlertCircle className="size-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-4 py-3 font-medium text-ink">Title</th>
              <th className="text-left px-4 py-3 font-medium text-ink">Type</th>
              <th className="text-left px-4 py-3 font-medium text-ink">Status</th>
              <th className="text-left px-4 py-3 font-medium text-ink">Created</th>
              <th className="text-right px-4 py-3 font-medium text-ink">Actions</th>
            </tr>
          </thead>

          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                className="border-b border-border-subtle hover:bg-surface-muted transition"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{report.title}</div>
                </td>

                <td className="px-4 py-3 text-ink-muted">
                  {getReportTypeLabel(report.report_type)}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2" title={report.error_message ?? undefined}>
                    {getStatusIcon(report.status)}
                    <span className="text-ink-muted">{getStatusLabel(report.status)}</span>
                  </div>
                </td>

                <td className="px-4 py-3 text-ink-muted">
                  {new Date(report.created_at).toLocaleDateString()}
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {report.status === "generated" && report.download_url && (
                      <a
                        href={report.download_url}
                        download
                        className="p-2 text-ink-muted hover:text-ink hover:bg-surface rounded transition"
                        title="Download"
                      >
                        <Download className="size-4" />
                      </a>
                    )}

                    <button
                      onClick={() => deleteReport(report.id)}
                      disabled={deleting === report.id}
                      className="p-2 text-ink-muted hover:text-state-bad hover:bg-surface rounded transition disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
