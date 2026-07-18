"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import type { Discipline, Site } from "@/lib/types";

/**
 * Filters live in the URL, not component state: a filtered register is
 * something people bookmark, share in a ticket and hit refresh on.
 */
export function AssetFilters({
  sites,
  disciplines,
}: {
  sites: Site[];
  disciplines: Discipline[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Any filter change invalidates the current page number.
    next.delete("page");
    startTransition(() => router.push(`/assets?${next.toString()}`));
  }

  const active = ["site", "status", "discipline", "compliance", "q"].filter((k) =>
    params.get(k),
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface px-4 py-3 md:px-6">
      <Select
        label="Site"
        value={params.get("site") ?? ""}
        onChange={(v) => update("site", v)}
        options={sites.map((s) => ({ value: s.id, label: s.name }))}
      />
      <Select
        label="Discipline"
        value={params.get("discipline") ?? ""}
        onChange={(v) => update("discipline", v)}
        options={disciplines.map((d) => ({ value: d.code, label: d.name }))}
      />
      <Select
        label="Compliance"
        value={params.get("compliance") ?? ""}
        onChange={(v) => update("compliance", v)}
        options={[
          { value: "overdue", label: "Overdue" },
          { value: "due_soon", label: "Due soon" },
          { value: "compliant", label: "Compliant" },
        ]}
      />
      <Select
        label="Status"
        value={params.get("status") ?? ""}
        onChange={(v) => update("status", v)}
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "planned", label: "Planned" },
          { value: "demolished", label: "Demolished" },
        ]}
      />

      {active.length > 0 ? (
        <button
          type="button"
          onClick={() =>
            startTransition(() => router.push("/assets"))
          }
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-ink-muted hover:text-ink"
        >
          <X className="size-3.5" />
          Clear
        </button>
      ) : null}

      {pending ? (
        <span className="text-xs text-ink-faint">Updating…</span>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-border-subtle bg-surface px-2 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
      >
        <option value="">{label}: All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
