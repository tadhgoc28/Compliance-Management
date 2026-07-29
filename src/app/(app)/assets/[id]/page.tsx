import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  FileText,
  Image as ImageIcon,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { PayloadDetail } from "@/components/ui/payload-detail";
import {
  AssetStatusBadge,
  ComplianceBadge,
  FindingStatusBadge,
  InspectionStatusBadge,
  SeverityBadge,
} from "@/components/ui/badge";
import {
  getAsset,
  getAssetCompliance,
  getAssetFindings,
  getAssetInspections,
  listDocuments,
} from "@/lib/data";
import { formatDate, formatPayloadValue, formatRelativeDays, humanise } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const asset = await getAsset(id);
  return { title: asset ? asset.name : "Asset" };
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const asset = await getAsset(id);
  if (!asset) notFound();

  const [compliance, findings, inspections, documents] = await Promise.all([
    getAssetCompliance(id),
    getAssetFindings(id),
    getAssetInspections(id),
    listDocuments({ assetId: id }),
  ]);

  const photos = documents.filter((d) => d.kind === "photo");
  const files = documents.filter((d) => d.kind !== "photo");
  const openFindings = findings.filter(
    (f) => !["closed", "removed", "remediated"].includes(f.status),
  );

  return (
    <>
      <PageHeader
        title={asset.name}
        description={`${asset.reference}${asset.site_name ? ` · ${asset.site_name}` : ""}`}
        action={
          <Link
            href="/assets"
            className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Register
          </Link>
        }
      />

      <div className="grid gap-5 p-4 md:p-6 xl:grid-cols-[20rem_1fr]">
        {/* Summary rail */}
        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <AssetStatusBadge status={asset.status} />
                {asset.asset_type_name ? (
                  <span className="text-xs text-ink-muted">{asset.asset_type_name}</span>
                ) : null}
              </div>

              {asset.description ? (
                <p className="text-sm text-ink-muted">{asset.description}</p>
              ) : null}

              <dl className="space-y-2.5 border-t border-border-subtle pt-4 text-sm">
                <Row label="Reference" value={asset.reference} mono />
                <Row label="Site" value={asset.site_name ?? "—"} />
                {asset.latitude && asset.longitude ? (
                  <Row
                    label="Location"
                    value={
                      <span className="tnum inline-flex items-center gap-1 text-ink">
                        <MapPin className="size-3.5 text-ink-faint" />
                        {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}
                      </span>
                    }
                  />
                ) : null}
                {Object.entries(asset.attributes ?? {}).map(([k, v]) => (
                  <Row key={k} label={humanise(k)} value={formatPayloadValue(v)} />
                ))}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Compliance" description="Obligations for this asset." />
            <CardBody className="p-0">
              {compliance.length === 0 ? (
                <EmptyState title="No obligations assigned" />
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {compliance.map((c) => (
                    <li
                      key={c.discipline_id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {c.discipline_name}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-ink-faint">
                          <CalendarClock className="size-3" />
                          Due {formatDate(c.next_due_date)}
                          {c.days_until_due !== null
                            ? ` · ${formatRelativeDays(c.days_until_due)}`
                            : ""}
                        </p>
                      </div>
                      <ComplianceBadge state={c.compliance_state} />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Detail tabs */}
        <Card>
          <CardBody>
            <Tabs
              items={[
                {
                  id: "findings",
                  label: "Findings",
                  count: findings.length,
                  content: <FindingsTab findings={findings} openCount={openFindings.length} />,
                },
                {
                  id: "inspections",
                  label: "Inspections",
                  count: inspections.length,
                  content: <InspectionsTab inspections={inspections} />,
                },
                {
                  id: "documents",
                  label: "Documents",
                  count: files.length,
                  content: <DocumentsTab documents={files} />,
                },
                {
                  id: "photos",
                  label: "Photos",
                  count: photos.length,
                  content: <PhotosTab photos={photos} />,
                },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-ink-faint">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-ink" : "text-right text-ink"}>
        {value}
      </dd>
    </div>
  );
}

function FindingsTab({
  findings,
  openCount,
}: {
  findings: Awaited<ReturnType<typeof getAssetFindings>>;
  openCount: number;
}) {
  if (findings.length === 0) {
    return <EmptyState title="No findings recorded for this asset" />;
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        {openCount} open of {findings.length} recorded.
      </p>
      {findings.map((f) => (
        <details
          key={f.id}
          className="group rounded-lg border border-border-subtle open:bg-surface-muted"
        >
          <summary className="flex cursor-pointer items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{f.title}</p>
              <p className="text-xs text-ink-faint">
                {f.discipline_name} · {f.reference} · {formatDate(f.identified_at)}
                {f.location_note ? ` · ${f.location_note}` : ""}
              </p>
            </div>
            <SeverityBadge severity={f.severity} />
            <FindingStatusBadge status={f.status} />
          </summary>
          <div className="border-t border-border-subtle px-4 py-3">
            {f.description ? (
              <p className="mb-3 text-sm text-ink-muted">{f.description}</p>
            ) : null}
            <PayloadDetail payload={f.payload} />
          </div>
        </details>
      ))}
    </div>
  );
}

function InspectionsTab({
  inspections,
}: {
  inspections: Awaited<ReturnType<typeof getAssetInspections>>;
}) {
  if (inspections.length === 0) {
    return <EmptyState title="No inspections recorded for this asset" />;
  }
  return (
    <div className="space-y-3">
      {inspections.map((i) => (
        <details key={i.id} className="group rounded-lg border border-border-subtle open:bg-surface-muted">
          <summary className="flex cursor-pointer items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {i.discipline_name} inspection
              </p>
              <p className="text-xs text-ink-faint">
                {i.reference}
                {i.inspector_name ? ` · ${i.inspector_name}` : ""} ·{" "}
                {i.completed_at
                  ? `Completed ${formatDate(i.completed_at)}`
                  : `Scheduled ${formatDate(i.scheduled_for)}`}
              </p>
            </div>
            <InspectionStatusBadge status={i.status} />
          </summary>
          <div className="border-t border-border-subtle px-4 py-3">
            {i.summary ? <p className="mb-3 text-sm text-ink-muted">{i.summary}</p> : null}
            <PayloadDetail payload={i.payload} />
          </div>
        </details>
      ))}
    </div>
  );
}

function DocumentsTab({
  documents,
}: {
  documents: Awaited<ReturnType<typeof listDocuments>>;
}) {
  if (documents.length === 0) {
    return <EmptyState title="No documents for this asset" icon={<FileText className="size-6" />} />;
  }
  return (
    <ul className="divide-y divide-border-subtle">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center gap-3 py-2.5">
          <FileText className="size-4 shrink-0 text-ink-faint" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink">{d.title}</p>
            <p className="text-xs text-ink-faint">
              {humanise(d.kind)} · {formatDate(d.issued_at)}
              {d.external_url ? " · External" : ""}
            </p>
          </div>
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
        </li>
      ))}
    </ul>
  );
}

function PhotosTab({
  photos,
}: {
  photos: Awaited<ReturnType<typeof listDocuments>>;
}) {
  if (photos.length === 0) {
    return <EmptyState title="No photos for this asset" icon={<ImageIcon className="size-6" />} />;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((p) => (
        <figure
          key={p.id}
          className="overflow-hidden rounded-lg border border-border-subtle"
        >
          <PhotoThumb title={p.title} url={p.url} />
          <figcaption className="truncate px-2 py-1.5 text-[11px] text-ink-muted">
            {p.title}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

// Demo mode has no real imagery; a generated gradient placeholder reads as
// "photo" without pretending to be a real site.
function PhotoThumb({ title, url }: { title: string; url: string | null | undefined }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={title} className="aspect-[4/3] w-full object-cover" />;
  }
  const hue = [...title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="grid aspect-[4/3] w-full place-items-center"
      style={{
        background: `linear-gradient(135deg, oklch(0.7 0.08 ${hue}), oklch(0.5 0.1 ${(hue + 40) % 360}))`,
      }}
    >
      <ImageIcon className="size-6 text-white/70" />
    </div>
  );
}
