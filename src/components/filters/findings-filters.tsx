"use client";

import { useCallback, useMemo } from "react";
import {
  MultiSelectFilter,
  SelectFilter,
  DateRangeFilter,
  SearchFilter,
  FilterPanel,
} from "./filter-controls";
import type { Discipline } from "@/lib/types";

const SEVERITY_OPTIONS = [
  { value: "high", label: "High", color: "#c4462f" },
  { value: "medium", label: "Medium", color: "#d99a2b" },
  { value: "low", label: "Low", color: "#3f9a5f" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export interface FindingFilterState {
  disciplineIds: string[];
  severity: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string;
}

export function FindingsFilters({
  disciplines,
  filters,
  onFiltersChange,
}: {
  disciplines: Discipline[];
  filters: FindingFilterState;
  onFiltersChange: (filters: FindingFilterState) => void;
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
      severity: null,
      status: null,
      startDate: null,
      endDate: null,
      location: "",
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
        label="Severity"
        options={SEVERITY_OPTIONS}
        value={filters.severity}
        onChange={(value) =>
          onFiltersChange({ ...filters, severity: value })
        }
        placeholder="All severities"
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
        label="Identified Date"
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(date) =>
          onFiltersChange({ ...filters, startDate: date })
        }
        onEndDateChange={(date) =>
          onFiltersChange({ ...filters, endDate: date })
        }
      />

      <SearchFilter
        label="Location"
        value={filters.location}
        onChange={(value) =>
          onFiltersChange({ ...filters, location: value })
        }
        placeholder="Search location..."
      />
    </FilterPanel>
  );
}
