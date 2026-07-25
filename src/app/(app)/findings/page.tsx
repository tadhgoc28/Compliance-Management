import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState } from "@/components/ui/card";
import { FindingsList } from "@/components/findings/findings-list";
import { ExportButtons } from "@/components/findings/export-buttons";
import { listDisciplines, listFindings, listTeamMembers } from "@/lib/data";

export const metadata = { title: "Findings" };

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;

export default async function FindingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [allFindings, disciplines, teamMembers] = await Promise.all([
    listFindings(500),
    listDisciplines(),
    listTeamMembers(),
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
        action={<ExportButtons findings={findings} />}
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
            <FindingsList findings={findings} teamMembers={teamMembers} />
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
