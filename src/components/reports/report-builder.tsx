"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import type { ReportType } from "@/lib/data/reports";
import type { Discipline } from "@/lib/types";

const REPORT_TEMPLATES = [
  {
    type: "compliance_summary" as ReportType,
    label: "Compliance Summary",
    description: "Overall compliance status by discipline",
  },
  {
    type: "findings_by_discipline" as ReportType,
    label: "Findings by Discipline",
    description: "Detailed findings grouped by discipline and severity",
  },
  {
    type: "asset_audit" as ReportType,
    label: "Asset Audit Trail",
    description: "Complete inspection history for specific asset",
  },
  {
    type: "deadline_report" as ReportType,
    label: "Deadline Report",
    description: "All overdue and upcoming inspections",
  },
];

export function ReportBuilder({
  disciplines,
  onReportCreated,
  onClose,
}: {
  disciplines: Discipline[];
  onReportCreated?: (reportId: string) => void;
  onClose?: () => void;
}) {
  const [step, setStep] = useState<"select" | "configure" | "generating">("select");
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const selectedTemplate = REPORT_TEMPLATES.find((t) => t.type === selectedType);

  async function handleCreateReport() {
    if (!selectedType || !reportTitle.trim()) {
      setError("Please enter a report title");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: selectedType,
          title: reportTitle,
          file_format: "csv",
          filters: {},
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create report");
      }

      const data = await response.json();
      setReportId(data.report.id);
      setStep("generating");

      // Trigger generation
      const genResponse = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: data.report.id }),
      });

      if (!genResponse.ok) {
        throw new Error("Failed to generate report");
      }

      onReportCreated?.(data.report.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("configure");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface rounded-lg border border-border-subtle p-6 max-w-2xl">
      {step === "select" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-ink mb-2">Create Report</h2>
            <p className="text-sm text-ink-muted">
              Select a report template to get started
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REPORT_TEMPLATES.map((template) => (
              <button
                key={template.type}
                onClick={() => {
                  setSelectedType(template.type);
                  setReportTitle(template.label);
                  setStep("configure");
                }}
                className={`p-4 rounded-lg border-2 transition text-left ${
                  selectedType === template.type
                    ? "border-brand bg-brand-soft"
                    : "border-border-subtle hover:border-brand"
                }`}
              >
                <h3 className="font-medium text-ink">{template.label}</h3>
                <p className="text-sm text-ink-muted mt-1">
                  {template.description}
                </p>
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-state-bad-soft rounded-lg text-state-bad">
              <AlertCircle className="size-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      )}

      {step === "configure" && selectedTemplate && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-ink mb-2">
              {selectedTemplate.label}
            </h2>
            <p className="text-sm text-ink-muted">
              {selectedTemplate.description}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Report Title
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Enter report title..."
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm"
              />
            </div>

            <div className="bg-surface-muted p-4 rounded-lg text-sm text-ink-muted">
              <p>
                This report will be generated in CSV format and sent to your email when ready.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-state-bad-soft rounded-lg text-state-bad">
              <AlertCircle className="size-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setStep("select")}
              disabled={loading}
              className="px-4 py-2 border border-border-subtle rounded-lg text-sm font-medium text-ink hover:bg-surface-muted transition disabled:opacity-50"
            >
              Back
            </button>

            <button
              onClick={handleCreateReport}
              disabled={loading || !reportTitle.trim()}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-strong transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader className="size-4 animate-spin" />}
              Generate Report
            </button>
          </div>
        </div>
      )}

      {step === "generating" && reportId && (
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <CheckCircle className="size-12 text-state-ok" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-ink mb-2">
              Report Queued
            </h2>
            <p className="text-sm text-ink-muted">
              Your report is being generated. We'll send you an email when it's ready to
              download.
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-strong transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
