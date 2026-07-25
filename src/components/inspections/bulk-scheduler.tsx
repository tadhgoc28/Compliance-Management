"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AssetPicker } from "./asset-picker";
import { SurveyorAssignment } from "./surveyor-assignment";
import type { Asset, Discipline } from "@/lib/types";

export interface Assignment {
  surveyorId: string;
  assetIds: string[];
}

export function BulkScheduler({
  assets,
  disciplines,
  surveyors,
}: {
  assets: Asset[];
  disciplines: Discipline[];
  surveyors: Array<{ id: string; full_name: string }>;
}) {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreate() {
    if (selectedAssets.length === 0) {
      setError("Please select at least one asset");
      return;
    }
    if (!selectedDiscipline) {
      setError("Please select a discipline");
      return;
    }
    if (!scheduledFor) {
      setError("Please select a due date");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/inspections/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: selectedAssets,
          disciplineId: selectedDiscipline,
          scheduledFor,
          assignments: assignments.length > 0 ? assignments : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create inspections");
      }

      const data = await res.json();
      setSuccess(
        `Successfully created ${data.created} inspection${data.created !== 1 ? "s" : ""}`,
      );
      setSelectedAssets([]);
      setSelectedDiscipline("");
      setScheduledFor("");
      setAssignments([]);

      setTimeout(() => {
        window.location.href = "/assets";
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Schedule Inspections</h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <AssetPicker
          assets={assets}
          selectedAssets={selectedAssets}
          onSelectionChange={setSelectedAssets}
        />

        <Card>
          <CardHeader title="Discipline" />
          <CardBody className="space-y-4">
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="">Select a discipline...</option>
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Due date" />
          <CardBody className="space-y-4">
            <input
              type="date"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink"
            />
            <p className="text-xs text-ink-faint">
              Inspections will be scheduled for this date
            </p>
          </CardBody>
        </Card>
      </div>

      {selectedAssets.length > 0 && (
        <SurveyorAssignment
          assets={assets}
          surveyors={surveyors}
          selectedAssets={selectedAssets}
          assignments={assignments}
          onAssignmentsChange={setAssignments}
        />
      )}

      <Card>
        <CardBody className="space-y-4">
          {error && (
            <div className="flex gap-3 rounded-lg bg-state-bad-soft p-3">
              <AlertCircle className="size-5 shrink-0 text-state-bad mt-0.5" />
              <div>
                <p className="text-sm font-medium text-state-bad">Error</p>
                <p className="text-sm text-state-bad">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-state-ok-soft p-3 text-sm text-state-ok">
              {success}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={
              loading ||
              selectedAssets.length === 0 ||
              !selectedDiscipline ||
              !scheduledFor
            }
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {loading
              ? "Creating inspections..."
              : `Create ${selectedAssets.length} inspection${selectedAssets.length !== 1 ? "s" : ""}`}
          </button>
        </CardBody>
      </Card>
    </div>
  );
}
