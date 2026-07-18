import Link from "next/link";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import type { DisciplineSummary } from "@/lib/types";

/**
 * Compliance state across disciplines.
 *
 * A stacked magnitude bar per discipline. The three segments are status colours
 * (good / warning / critical), not categorical hues — colour here means state,
 * so it is never assigned by rank or position.
 *
 * Colour is never the only signal: the legend names each state, and the exact
 * counts sit beside every bar, which doubles as the table view.
 */

const SEGMENTS = [
  { key: "compliant", label: "Compliant", fill: "bg-state-ok" },
  { key: "due_soon", label: "Due soon", fill: "bg-state-warn" },
  { key: "overdue", label: "Overdue", fill: "bg-state-bad" },
] as const;

export function DisciplineBreakdown({ rows }: { rows: DisciplineSummary[] }) {
  return (
    <Card>
      <CardHeader
        title="Compliance by discipline"
        description="Scheduled obligations across the estate, by current state."
        action={<Legend />}
      />
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <EmptyState
            title="No compliance obligations recorded"
            description="Assign disciplines to assets to start tracking due dates."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {rows.map((row) => (
              <DisciplineRow key={row.discipline_id} row={row} />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function Legend() {
  return (
    <ul className="flex items-center gap-3">
      {SEGMENTS.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2 rounded-full ${s.fill}`} />
          <span className="text-[11px] text-ink-muted">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

function DisciplineRow({ row }: { row: DisciplineSummary }) {
  const total = row.total || 1;
  const values = {
    compliant: row.compliant,
    due_soon: row.due_soon,
    overdue: row.overdue,
  };

  return (
    <li className="grid grid-cols-[9rem_1fr_auto] items-center gap-4 px-5 py-3">
      <Link
        href={`/assets?discipline=${row.code}`}
        className="truncate text-sm font-medium text-ink hover:text-brand"
      >
        {row.name}
      </Link>

      {/* gap-[2px] is the surface spacer between adjacent fills; the rounded
          ends belong to the track so segments stay flush inside it. */}
      <div
        className="flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-surface-muted"
        role="img"
        aria-label={`${row.name}: ${row.compliant} compliant, ${row.due_soon} due soon, ${row.overdue} overdue`}
      >
        {SEGMENTS.map((s) => {
          const value = values[s.key];
          if (value === 0) return null;
          return (
            <div
              key={s.key}
              className={s.fill}
              style={{ width: `${(value / total) * 100}%` }}
              title={`${s.label}: ${value}`}
            />
          );
        })}
      </div>

      <div className="tnum flex items-center gap-3 text-xs">
        <span className="w-8 text-right text-state-ok">{row.compliant}</span>
        <span className="w-8 text-right text-state-warn">{row.due_soon}</span>
        <span className="w-8 text-right font-medium text-state-bad">{row.overdue}</span>
        <span className="w-14 text-right text-ink-faint">
          {row.open_findings} open
        </span>
      </div>
    </li>
  );
}
