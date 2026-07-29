"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode as QrCodeIcon, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { QrCode } from "@/lib/types";

export interface QrCodeWithImage extends QrCode {
  svgMarkup: string;
  checkinUrl: string;
}

export function QrCodeManager({
  assetId,
  qrCodes,
}: {
  assetId: string;
  qrCodes: QrCodeWithImage[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, label: label.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create QR code");
      }
      setLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/qr-codes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove QR code");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Location label, e.g. Floor 2 — plant room"
          disabled={loading}
          className="flex-1 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint hover:border-border-default disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate QR code"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg bg-state-bad-soft p-3 text-sm text-state-bad">
          {error}
        </div>
      )}

      {qrCodes.length === 0 ? (
        <EmptyState
          title="No QR codes yet for this asset"
          description="Generate one per entrance or floor to enable on-site check-in."
          icon={<QrCodeIcon className="size-6" />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {qrCodes.map((qr) => (
            <div
              key={qr.id}
              className="flex flex-col items-center gap-2 rounded-lg border border-border-subtle p-3"
            >
              <div
                className="[&_svg]:size-32"
                dangerouslySetInnerHTML={{ __html: qr.svgMarkup }}
              />
              <p className="text-center text-sm font-medium text-ink">
                {qr.label ?? "Main entrance"}
              </p>
              <p className="text-center text-[11px] text-ink-faint">
                Added {formatDate(qr.created_at)}
                {qr.created_by_name ? ` · ${qr.created_by_name}` : ""}
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={qr.checkinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Open link
                </a>
                <button
                  onClick={() => handleDelete(qr.id)}
                  className="flex items-center gap-1 text-xs font-medium text-state-bad hover:underline"
                >
                  <Trash2 className="size-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
