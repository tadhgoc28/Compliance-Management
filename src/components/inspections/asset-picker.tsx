"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { Asset } from "@/lib/types";

export function AssetPicker({
  assets,
  selectedAssets,
  onSelectionChange,
}: {
  assets: Asset[];
  selectedAssets: string[];
  onSelectionChange: (assetIds: string[]) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.site_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
  );

  const handleToggle = (assetId: string) => {
    if (selectedAssets.includes(assetId)) {
      onSelectionChange(selectedAssets.filter((id) => id !== assetId));
    } else {
      onSelectionChange([...selectedAssets, assetId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedAssets.length === filtered.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filtered.map((a) => a.id));
    }
  };

  return (
    <Card>
      <CardHeader
        title="Select assets"
        description={`${selectedAssets.length} selected`}
      />
      <CardBody className="space-y-3 max-h-96 overflow-y-auto">
        <input
          type="text"
          placeholder="Search by name or reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink"
        />

        <button
          onClick={handleSelectAll}
          className="w-full rounded-lg border border-brand px-2 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft transition-colors"
        >
          {selectedAssets.length === filtered.length && filtered.length > 0
            ? "Deselect all"
            : "Select all"}
        </button>

        <ul className="space-y-1.5">
          {filtered.map((asset) => (
            <li key={asset.id}>
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-hover cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAssets.includes(asset.id)}
                  onChange={() => handleToggle(asset.id)}
                  className="size-4 rounded border-border-subtle"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ink truncate">
                    {asset.name}
                  </p>
                  <p className="text-[11px] text-ink-faint truncate">
                    {asset.reference} · {asset.site_name}
                  </p>
                </div>
              </label>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-ink-faint py-4">
            No assets match your search
          </p>
        )}
      </CardBody>
    </Card>
  );
}
