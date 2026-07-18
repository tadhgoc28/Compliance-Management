import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listDocuments } from "@/lib/data";
import { formatBytes, formatDate, humanise } from "@/lib/utils";

export const metadata = { title: "Documents" };

const KINDS = ["report", "certificate", "drawing", "permit", "other"] as const;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  // The gallery owns photos; this page is every other document kind.
  const all = await listDocuments({ query: sp.q, limit: 500 });
  const documents = all.filter((d) =>
    sp.kind ? d.kind === sp.kind : d.kind !== "photo",
  );

  return (
    <>
      <PageHeader
        title="Documents"
        description="Reports, certificates, drawings and permits across the estate."
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface px-4 py-3 md:px-6">
        <KindLink value="" current={sp.kind} label="All" />
        {KINDS.map((k) => (
          <KindLink key={k} value={k} current={sp.kind} label={humanise(k)} />
        ))}
      </div>

      <div className="p-4 md:p-6">
        <Card>
          {documents.length === 0 ? (
            <EmptyState
              title="No documents found"
              icon={<FileText className="size-6" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                    <th className="px-5 py-2.5 font-medium">Title</th>
                    <th className="px-5 py-2.5 font-medium">Kind</th>
                    <th className="px-5 py-2.5 font-medium">Asset</th>
                    <th className="px-5 py-2.5 font-medium">Issued</th>
                    <th className="px-5 py-2.5 font-medium">Expires</th>
                    <th className="px-5 py-2.5 font-medium">Size</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {documents.map((d) => {
                    const expired =
                      d.expires_at && new Date(d.expires_at) < new Date();
                    return (
                      <tr key={d.id} className="hover:bg-surface-muted">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 shrink-0 text-ink-faint" />
                            <span className="text-ink">{d.title}</span>
                          </div>
                        </td>
                        <td className="px-5 py-2.5">
                          <Badge tone="idle">{humanise(d.kind)}</Badge>
                        </td>
                        <td className="px-5 py-2.5">
                          {d.asset_id ? (
                            <Link
                              href={`/assets/${d.asset_id}`}
                              className="text-ink-muted hover:text-brand"
                            >
                              {d.asset_name}
                            </Link>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-ink-muted">
                          {formatDate(d.issued_at)}
                        </td>
                        <td className="px-5 py-2.5">
                          {d.expires_at ? (
                            <span className={expired ? "text-state-bad" : "text-ink-muted"}>
                              {formatDate(d.expires_at)}
                            </span>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                        <td className="tnum px-5 py-2.5 text-ink-muted">
                          {formatBytes(d.size_bytes)}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {d.url ? (
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-brand hover:underline"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-xs text-ink-faint">Demo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function KindLink({
  value,
  current,
  label,
}: {
  value: string;
  current: string | undefined;
  label: string;
}) {
  const active = (current ?? "") === value;
  const href = value ? `/documents?kind=${value}` : "/documents";
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
