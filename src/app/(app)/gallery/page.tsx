import Link from "next/link";
import { Images } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState } from "@/components/ui/card";
import { PhotoThumb } from "@/components/ui/photo-thumb";
import { listDocuments } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Photo Gallery" };

export default async function GalleryPage() {
  const photos = await listDocuments({ kind: "photo", limit: 300 });

  return (
    <>
      <PageHeader
        title="Photo gallery"
        description={`${photos.length} site photograph${photos.length === 1 ? "" : "s"} captured during inspections.`}
      />

      <div className="p-4 md:p-6">
        {photos.length === 0 ? (
          <Card>
            <EmptyState
              title="No photos yet"
              description="Photos captured during inspections will appear here."
              icon={<Images className="size-6" />}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {photos.map((p) => (
              <Link
                key={p.id}
                href={p.asset_id ? `/assets/${p.asset_id}` : "#"}
                className="group overflow-hidden rounded-xl border border-border-subtle bg-surface transition-shadow hover:shadow-md"
              >
                <PhotoThumb title={p.title} url={p.url} />
                <div className="p-2.5">
                  <p className="truncate text-xs font-medium text-ink group-hover:text-brand">
                    {p.title}
                  </p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {p.asset_name ?? "Unassigned"} ·{" "}
                    {formatDate(p.taken_at ?? p.created_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
