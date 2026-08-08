import Link from "next/link";
import { AlertTriangle, Clock, LogIn, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { WorkOrdersPanel } from "@/components/site-visits/work-orders-panel";
import { VisitWorkOrderSelect } from "@/components/site-visits/visit-work-order-select";
import { listAssets, listSiteVisits, listWorkOrders } from "@/lib/data";
import type { SiteVisit } from "@/lib/types";

export const metadata = { title: "Site Visits" };

const WINDOW_DAYS = 30;

interface VisitorStats {
  name: string;
  visits: number;
  totalMinutes: number;
  lastVisit: string;
  onSiteNow: boolean;
  flagged: number;
}

/**
 * The raw KPI/attendance numbers a manager would actually ask for: who's been
 * on site, how often, and for how long. This is computed here rather than in
 * SQL because it's read-only, whole-dataset math over a bounded window --
 * exactly the kind of thing that's simpler in TypeScript than in a view.
 */
function aggregateByVisitor(visits: SiteVisit[]): VisitorStats[] {
  const byName = new Map<string, VisitorStats>();

  for (const v of visits) {
    const name = v.visitor_name ?? "Unknown";
    const stats = byName.get(name) ?? {
      name,
      visits: 0,
      totalMinutes: 0,
      lastVisit: v.checked_in_at,
      onSiteNow: false,
      flagged: 0,
    };

    stats.visits += 1;
    if (v.checked_out_at) {
      stats.totalMinutes += Math.max(
        0,
        Math.round((new Date(v.checked_out_at).getTime() - new Date(v.checked_in_at).getTime()) / 60000),
      );
    } else {
      stats.onSiteNow = true;
    }
    if (v.compliance_flag) stats.flagged += 1;
    if (v.checked_in_at > stats.lastVisit) stats.lastVisit = v.checked_in_at;

    byName.set(name, stats);
  }

  return [...byName.values()].sort((a, b) => b.totalMinutes - a.totalMinutes);
}

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SiteVisitsPage() {
  const [visits, workOrders, assetPage] = await Promise.all([
    listSiteVisits({ sinceDays: WINDOW_DAYS, limit: 2000 }),
    listWorkOrders(),
    listAssets({ pageSize: 500 }),
  ]);
  const assetOptions = assetPage.rows.map((a) => ({ id: a.id, name: a.name }));

  const visitors = aggregateByVisitor(visits);
  const totalMinutes = visitors.reduce((sum, v) => sum + v.totalMinutes, 0);
  const onSiteNow = visits.filter((v) => !v.checked_out_at).length;
  const flaggedCount = visits.filter((v) => v.compliance_flag).length;
  const recent = [...visits].slice(0, 30);

  return (
    <>
      <PageHeader
        title="Site Visits"
        description={`Attendance from QR check-ins, last ${WINDOW_DAYS} days.`}
      />

      <div className="space-y-5 p-4 md:p-6">
        <section
          aria-label="Key figures"
          className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-5"
        >
          <StatTile
            label="Total visits"
            value={visits.length}
            hint={`Last ${WINDOW_DAYS} days`}
            icon={<LogIn className="size-4" />}
          />
          <StatTile
            label="Currently on site"
            value={onSiteNow}
            tone={onSiteNow > 0 ? "warn" : "neutral"}
            icon={<MapPin className="size-4" />}
          />
          <StatTile
            label="Hours logged"
            value={formatHours(totalMinutes)}
            hint="Sum of checked-out visits"
            icon={<Clock className="size-4" />}
          />
          <StatTile
            label="Unique visitors"
            value={visitors.length}
            icon={<Users className="size-4" />}
          />
          <StatTile
            label="Missing training"
            value={flaggedCount}
            hint="Flagged at check-in"
            tone={flaggedCount > 0 ? "bad" : "ok"}
            href="/team"
            icon={<AlertTriangle className="size-4" />}
          />
        </section>

        <Card>
          <CardHeader
            title="By visitor"
            description="Attendance per person -- the raw numbers a KPI or payment calculation would build on."
          />
          <CardBody className="p-0">
            {visitors.length === 0 ? (
              <EmptyState
                title="No check-ins recorded"
                description="Visits appear here once someone scans a site QR code."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                      <th className="px-5 py-2.5 font-medium">Name</th>
                      <th className="px-5 py-2.5 font-medium">Visits</th>
                      <th className="px-5 py-2.5 font-medium">Hours on site</th>
                      <th className="px-5 py-2.5 font-medium">Last visit</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {visitors.map((v) => (
                      <tr key={v.name}>
                        <td className="px-5 py-2.5 text-ink">
                          <span className="flex items-center gap-1.5">
                            {v.name}
                            {v.flagged > 0 ? (
                              <AlertTriangle
                                className="size-3.5 text-state-bad"
                                aria-label={`${v.flagged} visit(s) missing required training`}
                              />
                            ) : null}
                          </span>
                        </td>
                        <td className="tnum px-5 py-2.5 text-ink-muted">{v.visits}</td>
                        <td className="tnum px-5 py-2.5 text-ink-muted">
                          {formatHours(v.totalMinutes)}
                        </td>
                        <td className="px-5 py-2.5 text-ink-muted">
                          {formatDateTime(v.lastVisit)}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {v.onSiteNow ? (
                            <span className="text-xs font-medium text-state-ok">On site</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <WorkOrdersPanel workOrders={workOrders} visits={visits} assets={assetOptions} />

        <Card>
          <CardHeader title="Recent visits" description="Latest check-ins across every site." />
          <CardBody className="p-0">
            {recent.length === 0 ? (
              <EmptyState title="No check-ins recorded" />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {recent.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-5 py-2.5">
                    {v.compliance_flag ? (
                      <AlertTriangle
                        className="size-4 shrink-0 text-state-bad"
                        aria-label="Missing required training"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{v.visitor_name ?? "Unknown"}</p>
                      <p className="truncate text-xs text-ink-faint">
                        {v.asset_name ? (
                          <Link href={`/assets/${v.asset_id}`} className="hover:text-brand">
                            {v.asset_name}
                          </Link>
                        ) : (
                          "Unknown asset"
                        )}
                        {v.qr_code_label ? ` · ${v.qr_code_label}` : ""}
                        {v.compliance_flag && v.flag_details
                          ? ` · Missing ${v.flag_details.missing.map((m) => m.name).join(", ")}`
                          : ""}
                      </p>
                    </div>
                    <VisitWorkOrderSelect visitId={v.id} workOrderId={v.work_order_id} workOrders={workOrders} />
                    <div className="shrink-0 text-right text-xs text-ink-faint">
                      {formatDateTime(v.checked_in_at)}
                      {v.checked_out_at ? "" : " · on site"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
