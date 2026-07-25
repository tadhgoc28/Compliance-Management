import Link from "next/link";
import {
  Building2,
  CalendarClock,
  CircleAlert,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { DisciplineBreakdown } from "@/components/dashboard/discipline-breakdown";
import { FindingsBySeverity } from "@/components/dashboard/findings-by-severity";
import { RemediationStatus } from "@/components/dashboard/remediation-status";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/badge";
import { getDashboardSummary, listAllCompliance, listFindings } from "@/lib/data";
import { formatDate, formatRelativeDays } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [summary, findings, compliance] = await Promise.all([
    getDashboardSummary(),
    listFindings(200),
    listAllCompliance(),
  ]);

  const openFindings = findings
    .filter((f) => !["closed", "removed", "remediated"].includes(f.status))
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 8);

  const overdue = compliance
    .filter((c) => c.compliance_state === "overdue")
    .sort((a, b) => (a.days_until_due ?? 0) - (b.days_until_due ?? 0))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title="Compliance overview"
        description="Estate-wide compliance position across all disciplines."
      />

      <div className="space-y-5 p-4 md:p-6">
        <section
          aria-label="Key figures"
          className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5"
        >
          <StatTile
            label="Compliance rate"
            value={`${summary.compliance_rate}%`}
            hint={`${summary.compliant_count} of ${
              summary.compliant_count + summary.due_soon_count + summary.overdue_count
            } obligations`}
            tone={
              summary.compliance_rate >= 90
                ? "ok"
                : summary.compliance_rate >= 70
                  ? "warn"
                  : "bad"
            }
            icon={<ShieldCheck className="size-4" />}
          />
          <StatTile
            label="Overdue"
            value={summary.overdue_count}
            hint="Past due date"
            tone={summary.overdue_count > 0 ? "bad" : "ok"}
            href="/assets?compliance=overdue"
            icon={<CircleAlert className="size-4" />}
          />
          <StatTile
            label="Due within 30 days"
            value={summary.due_soon_count}
            hint="Schedule now"
            tone={summary.due_soon_count > 0 ? "warn" : "neutral"}
            href="/assets?compliance=due_soon"
            icon={<CalendarClock className="size-4" />}
          />
          <StatTile
            label="Open findings"
            value={summary.open_findings}
            hint={`${summary.critical_findings} critical`}
            tone={summary.critical_findings > 0 ? "bad" : "neutral"}
            href="/findings"
            icon={<ShieldCheck className="size-4" />}
          />
          <StatTile
            label="Assets"
            value={summary.asset_count}
            hint={`Across ${summary.site_count} sites`}
            href="/assets"
            icon={<Building2 className="size-4" />}
          />
        </section>

        <DisciplineBreakdown rows={summary.by_discipline} />

        <div className="grid gap-5 md:grid-cols-2">
          <FindingsBySeverity data={summary.findings_by_severity} />
          <RemediationStatus data={summary.findings_by_status} />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader
              title="Overdue obligations"
              description="Longest overdue first."
              action={
                <Link
                  href="/assets?compliance=overdue"
                  className="text-xs font-medium text-brand hover:underline"
                >
                  View all
                </Link>
              }
            />
            <CardBody className="p-0">
              {overdue.length === 0 ? (
                <EmptyState
                  title="Nothing overdue"
                  description="Every scheduled obligation is within its due date."
                  icon={<ShieldCheck className="size-6" />}
                />
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {overdue.map((row) => (
                    <li
                      key={`${row.asset_id}-${row.discipline_id}`}
                      className="flex items-center justify-between gap-3 px-5 py-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/assets/${row.asset_id}`}
                          className="block truncate text-sm text-ink hover:text-brand"
                        >
                          {row.discipline_name}
                        </Link>
                        <p className="truncate text-xs text-ink-faint">
                          Due {formatDate(row.next_due_date)}
                        </p>
                      </div>
                      <span className="tnum shrink-0 text-xs font-medium text-state-bad">
                        {formatRelativeDays(row.days_until_due)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Open findings"
              description="Highest severity first."
              action={
                <Link
                  href="/findings"
                  className="text-xs font-medium text-brand hover:underline"
                >
                  View all
                </Link>
              }
            />
            <CardBody className="p-0">
              {openFindings.length === 0 ? (
                <EmptyState title="No open findings" />
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {openFindings.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/assets/${f.asset_id}`}
                          className="block truncate text-sm text-ink hover:text-brand"
                        >
                          {f.title}
                        </Link>
                        <p className="flex items-center gap-1.5 truncate text-xs text-ink-faint">
                          <MapPin className="size-3 shrink-0" />
                          {f.asset_name} · {f.discipline_name}
                        </p>
                      </div>
                      <SeverityBadge severity={f.severity} />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
