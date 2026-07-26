import { cn } from "@/lib/utils";
import type {
  AssetStatus,
  ComplianceState,
  FindingSeverity,
  FindingStatus,
  InspectionStatus,
} from "@/lib/types";

/**
 * Badges are the main way state is communicated across the app, so the mapping
 * from state -> colour lives here once. Colour is never the only signal: each
 * badge carries a label too, which keeps it legible for colour-blind users and
 * in greyscale print-outs.
 */

const base =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

type Tone = "ok" | "warn" | "bad" | "idle" | "info";

const toneStyles: Record<Tone, string> = {
  ok: "bg-state-ok-soft text-state-ok ring-state-ok/20",
  warn: "bg-state-warn-soft text-state-warn ring-state-warn/25",
  bad: "bg-state-bad-soft text-state-bad ring-state-bad/20",
  idle: "bg-state-idle-soft text-ink-muted ring-border-subtle",
  info: "bg-brand-soft text-brand ring-brand/20",
};

export function Badge({
  tone = "idle",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn(base, toneStyles[tone], className)}>{children}</span>;
}

const COMPLIANCE: Record<ComplianceState, { tone: Tone; label: string }> = {
  compliant: { tone: "ok", label: "Compliant" },
  due_soon: { tone: "warn", label: "Due soon" },
  overdue: { tone: "bad", label: "Overdue" },
  unknown: { tone: "idle", label: "Not scheduled" },
  not_applicable: { tone: "idle", label: "N/A" },
};

export function ComplianceBadge({ state }: { state: ComplianceState }) {
  const { tone, label } = COMPLIANCE[state] ?? COMPLIANCE.unknown;
  return (
    <Badge tone={tone}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "ok" && "bg-state-ok",
          tone === "warn" && "bg-state-warn",
          tone === "bad" && "bg-state-bad",
          tone === "idle" && "bg-state-idle",
        )}
      />
      {label}
    </Badge>
  );
}

const SEVERITY: Record<FindingSeverity, { tone: Tone; label: string }> = {
  critical: { tone: "bad", label: "Critical" },
  high: { tone: "bad", label: "High" },
  medium: { tone: "warn", label: "Medium" },
  low: { tone: "ok", label: "Low" },
  info: { tone: "idle", label: "Info" },
};

export function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  const { tone, label } = SEVERITY[severity] ?? SEVERITY.info;
  return (
    <Badge tone={tone} className={severity === "critical" ? "font-semibold" : undefined}>
      {label}
    </Badge>
  );
}

const FINDING_STATUS: Record<FindingStatus, { tone: Tone; label: string }> = {
  open: { tone: "bad", label: "Open" },
  assigned: { tone: "warn", label: "Assigned" },
  monitoring: { tone: "warn", label: "Monitoring" },
  in_remediation: { tone: "info", label: "In remediation" },
  remediated: { tone: "ok", label: "Remediated" },
  removed: { tone: "ok", label: "Removed" },
  closed: { tone: "idle", label: "Closed" },
};

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  const { tone, label } = FINDING_STATUS[status] ?? FINDING_STATUS.open;
  return <Badge tone={tone}>{label}</Badge>;
}

const INSPECTION_STATUS: Record<InspectionStatus, { tone: Tone; label: string }> = {
  scheduled: { tone: "idle", label: "Scheduled" },
  in_progress: { tone: "info", label: "In progress" },
  completed: { tone: "ok", label: "Completed" },
  cancelled: { tone: "idle", label: "Cancelled" },
};

export function InspectionStatusBadge({ status }: { status: InspectionStatus }) {
  const { tone, label } = INSPECTION_STATUS[status] ?? INSPECTION_STATUS.scheduled;
  return <Badge tone={tone}>{label}</Badge>;
}

const ASSET_STATUS: Record<AssetStatus, { tone: Tone; label: string }> = {
  active: { tone: "ok", label: "Active" },
  planned: { tone: "info", label: "Planned" },
  inactive: { tone: "idle", label: "Inactive" },
  demolished: { tone: "idle", label: "Demolished" },
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const { tone, label } = ASSET_STATUS[status] ?? ASSET_STATUS.active;
  return <Badge tone={tone}>{label}</Badge>;
}
