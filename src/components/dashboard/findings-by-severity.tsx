import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import type { SeverityBreakdown } from "@/lib/types";
import { ShieldAlert } from "lucide-react";

const SEVERITIES = [
  { key: "critical", label: "Critical", fill: "bg-state-bad" },
  { key: "high", label: "High", fill: "bg-orange-500" },
  { key: "medium", label: "Medium", fill: "bg-state-warn" },
  { key: "low", label: "Low", fill: "bg-blue-500" },
  { key: "info", label: "Info", fill: "bg-state-ok" },
] as const;

export function FindingsBySeverity({ data }: { data: SeverityBreakdown }) {
  const total =
    data.critical + data.high + data.medium + data.low + data.info;

  return (
    <Card>
      <CardHeader
        title="Open findings by severity"
        description="Current open findings across all assets."
      />
      <CardBody className="p-0">
        {total === 0 ? (
          <EmptyState title="No open findings" icon={<ShieldAlert className="size-6" />} />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {SEVERITIES.map((severity) => {
              const count = data[severity.key];
              if (count === 0) return null;
              const pct = Math.round((count / total) * 100);

              return (
                <li
                  key={severity.key}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={`size-3 rounded-full ${severity.fill}`}
                    />
                    <span className="text-sm font-medium text-ink">
                      {severity.label}
                    </span>
                  </div>
                  <div className="tnum flex items-center gap-2 text-xs">
                    <span className="w-12 text-right">{count}</span>
                    <span className="w-10 text-right text-ink-faint">
                      {pct}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
