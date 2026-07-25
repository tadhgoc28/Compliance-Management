"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { Asset } from "@/lib/types";
import type { Assignment } from "./bulk-scheduler";

export function SurveyorAssignment({
  assets,
  surveyors,
  selectedAssets,
  assignments,
  onAssignmentsChange,
}: {
  assets: Asset[];
  surveyors: Array<{ id: string; full_name: string }>;
  selectedAssets: string[];
  assignments: Assignment[];
  onAssignmentsChange: (assignments: Assignment[]) => void;
}) {
  const selectedAssetsMap = new Map(
    selectedAssets.map((id) => [id, assets.find((a) => a.id === id)]),
  );

  function handleAssignmentChange(assetId: string, surveyorId: string | "") {
    const newAssignments = assignments.filter((a) => !a.assetIds.includes(assetId));

    if (surveyorId) {
      const existingAssignment = newAssignments.find(
        (a) => a.surveyorId === surveyorId,
      );
      if (existingAssignment) {
        existingAssignment.assetIds.push(assetId);
      } else {
        newAssignments.push({ surveyorId, assetIds: [assetId] });
      }
    }

    onAssignmentsChange(newAssignments);
  }

  function getAssignedSurveyor(assetId: string): string | undefined {
    const assignment = assignments.find((a) => a.assetIds.includes(assetId));
    return assignment?.surveyorId;
  }

  return (
    <Card>
      <CardHeader title="Assign to surveyors (optional)" />
      <CardBody className="space-y-3">
        <p className="text-xs text-ink-faint">
          Assign inspections to specific team members. Leave unassigned to
          schedule without assignment.
        </p>

        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {Array.from(selectedAssetsMap.entries()).map(([assetId, asset]) => (
            <li key={assetId} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-ink truncate">
                  {asset?.name}
                </p>
              </div>
              <select
                value={getAssignedSurveyor(assetId) ?? ""}
                onChange={(e) => handleAssignmentChange(assetId, e.target.value)}
                className="w-32 rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs text-ink"
              >
                <option value="">Unassigned</option>
                {surveyors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
