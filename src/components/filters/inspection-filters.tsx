"use client";

import { useCallback, useMemo } from "react";
import {
  MultiSelectFilter,
  SelectFilter,
  DateRangeFilter,
  FilterPanel,
} from "./filter-controls";
import type { Discipline } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const COMPLIANCE_STATE_OPTIONS = [
  { value: "overdue", label: "Overdue", color: "#c4462f" },
  { value: "due_soon", label: "Due Soon", color: "#d99a2b" },
  { value: "compliant", label: "Compliant", color: "#3f9a5f" },
  { value: "unknown", label: "Unknown", color: "#9aa3ad" },
];

export interface InspectionFilterState {
  disciplineIds: string[];
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  complianceState: string | null;
}

export function InspectionFilters({
  disciplines,
  filters,
  onFiltersChange,
}: {
  disciplines: Discipline[];
  filters: InspectionFilterState;
  onFiltersChange: (filters: InspectionFilterState) => void;
}) {
  const disciplineOptions = useMemo(
    () =>
      disciplines.map((d) => ({
        value: d.id,
        label: d.name,
        color: d.colour || undefined,
      })),
    [disciplines]
  );

  const handleReset = useCallback(() => {
    onFiltersChange({
      disciplineIds: [],
      status: null,
      startDate: null,
      endDate: null,
      complianceState: null,
    });
  }, [onFiltersChange]);

  return (
    <FilterPanel onReset={handleReset}>
      <MultiSelectFilter
        label="Disciplines"
        options={disciplineOptions}
        selected={filters.disciplineIds}
        onChange={(values) =>
          onFiltersChange({ ...filters, disciplineIds: values })
        }
        placeholder="All disciplines"
      />

      <SelectFilter
        label="Status"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(value) =>
          onFiltersChange({ ...filters, status: value })
        }
        placeholder="All statuses"
      />

      <DateRangeFilter
        label="Scheduled Date"
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(date) =>
          onFiltersChange({ ...filters, startDate: date })
        }
        onEndDateChange={(date) =>
          onFiltersChange({ ...filters, endDate: date })
        }
      />

      <SelectFilter
        label="Compliance State"
        options={COMPLIANCE_STATE_OPTIONS}
        value={filters.complianceState}
        onChange={(value) =>
          onFiltersChange({ ...filters, complianceState: value })
        }
        placeholder="All states"
      />
    </FilterPanel>
  );
}
