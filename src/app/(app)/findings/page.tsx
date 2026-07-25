import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState } from "@/components/ui/card";
import { FindingStatusBadge, SeverityBadge } from "@/components/ui/badge";
import { listDisciplines, listFindings } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Findings" };

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;

export default async function FindingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [allFindings, disciplines] = await Promise.all([
    listFindings(500),
    listDisciplines(),
  ]);

  let findings = allFindings;
  if (sp.discipline) findings = findings.filter((f) => f.discipline_code === sp.discipline);
  if (sp.severity) findings = findings.filter((f) => f.severity === sp.severity);
  if (sp.status === "open") {
    findings = findings.filter(
      (f) => !["closed", "removed", "remediated"].includes(f.status),
    );
  }

  findings = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return (
    <>
      <PageHeader
        title="Findings"
        description="Defects and issues identified across all disciplines and assets."
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface px-4 py-3 md:px-6">
        <FilterLink param="status" value="open" current={sp.status} label="Open only" />
        {disciplines.map((d) => (
          <FilterLink
            key={d.code}
            param="discipline"
            value={d.code}
            current={sp.discipline}
            label={d.name}
          />
        ))}
      </div>

      <div className="p-4 md:p-6">
        <Card>
          {findings.length === 0 ? (
            <EmptyState
              title="No findings match these filters"
              icon={<ShieldAlert className="size-6" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                    <th className="px-5 py-2.5 font-medium">Finding</th>
                    <th className="px-5 py-2.5 font-medium">Asset</th>
                    <th className="px-5 py-2.5 font-medium">Discipline</th>
                    <th className="px-5 py-2.5 font-medium">Identified</th>
                    <th className="px-5 py-2.5 font-medium">Severity</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {findings.map((f) => (
                    <tr key={f.id} className="group transition-colors hover:bg-surface-muted cursor-pointer">
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/findings/${f.id}`}
                          className="block"
                        >
                          <p className="font-medium text-ink group-hover:text-brand">{f.title}</p>
                          <p className="font-mono text-xs text-ink-faint">{f.reference}</p>
                        </Link>
                      </td>
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/assets/${f.asset_id}`}
                          className="text-ink-muted hover:text-brand"
                        >
                          {f.asset_name}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-ink-muted">{f.discipline_name}</td>
                      <td className="px-5 py-2.5 text-ink-muted">
                        {formatDate(f.identified_at)}
                      </td>
                      <td className="px-5 py-2.5">
                        <SeverityBadge severity={f.severity} />
                      </td>
                      <td className="px-5 py-2.5">
                        <FindingStatusBadge status={f.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function FilterLink({
  param,
  value,
  current,
  label,
}: {
  param: string;
  value: string;
  current: string | undefined;
  label: string;
}) {
  const active = current === value;
  const href = active ? "/findings" : `/findings?${param}=${value}`;
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-brand px-3 py-1 text-xs font-medium text-white"
          : "rounded-full border border-border-subtle px-3 py-1 text-xs text-ink-muted hover:text-ink"
      }
    >
      {label}
    </Link>
  );
}
