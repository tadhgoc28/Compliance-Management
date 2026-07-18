"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

/**
 * Multi-select filter dropdown
 */
export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select...",
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">{label}</label>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-3 py-2 border border-border-subtle rounded-lg bg-surface text-left flex items-center justify-between hover:bg-surface-muted transition"
        >
          <span className="text-sm">
            {selectedOptions.length > 0
              ? `${selectedOptions.length} selected`
              : placeholder}
          </span>
          <ChevronDown className="size-4 text-ink-muted" />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-subtle rounded-lg shadow-lg z-50">
            <div className="max-h-48 overflow-y-auto">
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-surface-muted cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...selected, option.value]);
                      } else {
                        onChange(selected.filter((v) => v !== option.value));
                      }
                    }}
                    className="size-4 rounded border border-border-subtle"
                  />
                  {option.color && (
                    <div
                      className="size-3 rounded-full"
                      style={{ background: option.color }}
                    />
                  )}
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((opt) => (
            <div
              key={opt.value}
              className="inline-flex items-center gap-2 px-2 py-1 bg-brand-soft rounded text-sm text-ink"
            >
              <span>{opt.label}</span>
              <button
                onClick={() =>
                  onChange(selected.filter((v) => v !== opt.value))
                }
                className="hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Single select filter dropdown
 */
export function SelectFilter({
  label,
  options,
  value,
  onChange,
  placeholder = "Select...",
}: {
  label: string;
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">{label}</label>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-3 py-2 border border-border-subtle rounded-lg bg-surface text-left flex items-center justify-between hover:bg-surface-muted transition"
        >
          <span className="text-sm">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="size-4 text-ink-muted" />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-subtle rounded-lg shadow-lg z-50">
            <div className="max-h-48 overflow-y-auto">
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-surface-muted text-sm text-ink-muted"
              >
                Clear selection
              </button>

              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-surface-muted flex items-center gap-3 text-sm"
                >
                  {option.color && (
                    <div
                      className="size-3 rounded-full"
                      style={{ background: option.color }}
                    />
                  )}
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Date range filter
 */
export function DateRangeFilter({
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  label: string;
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-ink">{label}</label>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-muted">From</label>
          <input
            type="date"
            value={startDate || ""}
            onChange={(e) => onStartDateChange(e.target.value || null)}
            className="px-3 py-2 border border-border-subtle rounded-lg text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-muted">To</label>
          <input
            type="date"
            value={endDate || ""}
            onChange={(e) => onEndDateChange(e.target.value || null)}
            className="px-3 py-2 border border-border-subtle rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Search text filter
 */
export function SearchFilter({
  label,
  value,
  onChange,
  placeholder = "Search...",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 border border-border-subtle rounded-lg text-sm"
      />
    </div>
  );
}

/**
 * Filter panel container
 */
export function FilterPanel({
  children,
  onReset,
}: {
  children: React.ReactNode;
  onReset?: () => void;
}) {
  return (
    <div className="bg-surface-muted rounded-lg border border-border-subtle p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {children}
      </div>

      {onReset && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onReset}
            className="text-sm text-ink-muted hover:text-ink transition"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
