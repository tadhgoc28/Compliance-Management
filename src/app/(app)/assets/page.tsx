import Link from "next/link";
import { Building2, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState } from "@/components/ui/card";
import { AssetStatusBadge, ComplianceBadge } from "@/components/ui/badge";
import { AssetFilters } from "@/components/assets/asset-filters";
import { Pagination } from "@/components/ui/pagination";
import {
  listAssets,
  listAllCompliance,
  listDisciplines,
  listSites,
} from "@/lib/data";
import type { ComplianceState } from "@/lib/types";

export const metadata = { title: "Asset Register" };

const PAGE_SIZE = 25;

// Worst state an asset has across its disciplines drives the row badge — an
// asset with one overdue obligation should read as overdue at a glance.
const STATE_RANK: Record<ComplianceState, number> = {
  overdue: 0,
  due_soon: 1,
  unknown: 2,
  compliant: 3,
  not_applicable: 4,
};

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total }, compliance, sites, disciplines] = await Promise.all([
    listAssets({
      query: sp.q,
      siteId: sp.site,
      status: sp.status,
      disciplineCode: sp.discipline,
      complianceState: sp.compliance,
      page,
      pageSize: PAGE_SIZE,
    }),
    listAllCompliance(),
    listSites(),
    listDisciplines(),
  ]);

  // Reduce compliance rows to one worst-state badge per asset.
  const worstByAsset = new Map<string, ComplianceState>();
  for (const c of compliance) {
    const current = worstByAsset.get(c.asset_id);
    if (!current || STATE_RANK[c.compliance_state] < STATE_RANK[current]) {
      worstByAsset.set(c.asset_id, c.compliance_state);
    }
  }

  return (
    <>
      <PageHeader
        title="Asset register"
        description={`${total} asset${total === 1 ? "" : "s"} across the estate.`}
        action={
          <Link
            href="/inspections/schedule"
            className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
          >
            <Calendar className="size-4" />
            Schedule inspections
          </Link>
        }
      />
      <AssetFilters sites={sites} disciplines={disciplines} />

      <div className="p-4 md:p-6">
        <Card>
          {rows.length === 0 ? (
            <EmptyState
              title="No assets match these filters"
              description="Adjust or clear the filters above."
              icon={<Building2 className="size-6" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                    <th className="px-5 py-2.5 font-medium">Reference</th>
                    <th className="px-5 py-2.5 font-medium">Name</th>
                    <th className="px-5 py-2.5 font-medium">Site</th>
                    <th className="px-5 py-2.5 font-medium">Type</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {rows.map((a) => (
                    <tr
                      key={a.id}
                      className="group transition-colors hover:bg-surface-muted"
                    >
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/assets/${a.id}`}
                          className="font-mono text-xs text-ink-muted group-hover:text-brand"
                        >
                          {a.reference}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/assets/${a.id}`}
                          className="font-medium text-ink group-hover:text-brand"
                        >
                          {a.name}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-ink-muted">{a.site_name ?? "—"}</td>
                      <td className="px-5 py-2.5 text-ink-muted">
                        {a.asset_type_name ?? "—"}
                      </td>
                      <td className="px-5 py-2.5">
                        <AssetStatusBadge status={a.status} />
                      </td>
                      <td className="px-5 py-2.5">
                        {worstByAsset.has(a.id) ? (
                          <ComplianceBadge state={worstByAsset.get(a.id)!} />
                        ) : (
                          <span className="text-xs text-ink-faint">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/assets"
            searchParams={sp}
          />
        </Card>
      </div>
    </>
  );
}
