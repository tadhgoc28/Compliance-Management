import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import type { StatusBreakdown } from "@/lib/types";
import { Wrench } from "lucide-react";

const STATUSES = [
  { key: "open", label: "Open", fill: "bg-state-bad" },
  { key: "monitoring", label: "Monitoring", fill: "bg-orange-500" },
  { key: "in_remediation", label: "In remediation", fill: "bg-state-warn" },
  { key: "remediated", label: "Remediated", fill: "bg-blue-500" },
  { key: "removed", label: "Removed", fill: "bg-gray-400" },
  { key: "closed", label: "Closed", fill: "bg-state-ok" },
] as const;

export function RemediationStatus({ data }: { data: StatusBreakdown }) {
  const total =
    data.open +
    data.monitoring +
    data.in_remediation +
    data.remediated +
    data.removed +
    data.closed;

  return (
    <Card>
      <CardHeader
        title="Findings by remediation status"
        description="Lifecycle of all findings, from discovery to closure."
      />
      <CardBody className="p-0">
        {total === 0 ? (
          <EmptyState title="No findings recorded" icon={<Wrench className="size-6" />} />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {STATUSES.map((status) => {
              const count = data[status.key];
              if (count === 0) return null;
              const pct = Math.round((count / total) * 100);

              return (
                <li
                  key={status.key}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={`size-3 rounded-full ${status.fill}`}
                    />
                    <span className="text-sm font-medium text-ink">
                      {status.label}
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
