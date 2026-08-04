"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Certification, CertificationType, TeamMember } from "@/lib/types";

function expiryStatus(expiresAt: string | null): { label: string; tone: "ok" | "warn" | "bad" | "idle" } {
  if (!expiresAt) return { label: "No expiry", tone: "idle" };
  const days = Math.round((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Expired ${formatDate(expiresAt)}`, tone: "bad" };
  if (days < 60) return { label: `Expires ${formatDate(expiresAt)}`, tone: "warn" };
  return { label: `Valid to ${formatDate(expiresAt)}`, tone: "ok" };
}

export function PeopleTab({
  teamMembers,
  certifications,
  certificationTypes,
}: {
  teamMembers: TeamMember[];
  certifications: Certification[];
  certificationTypes: CertificationType[];
}) {
  const router = useRouter();
  const [profileId, setProfileId] = useState(teamMembers[0]?.id ?? "");
  const [certTypeId, setCertTypeId] = useState(certificationTypes[0]?.id ?? "");
  const [reference, setReference] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byMember = teamMembers.map((m) => ({
    member: m,
    certs: certifications.filter((c) => c.profile_id === m.id),
  }));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId || !certTypeId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          certificationTypeId: certTypeId,
          reference: reference.trim() || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add certification");
      }
      setReference("");
      setExpiresAt("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/certifications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove certification");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Record a certification" description="Kept as a training register, maintained by managers." />
        <CardBody>
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink"
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
            <select
              value={certTypeId}
              onChange={(e) => setCertTypeId(e.target.value)}
              className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink"
            >
              {certificationTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Licence / reference no."
              className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-ink"
              />
              <button
                type="submit"
                disabled={loading || !profileId || !certTypeId}
                className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-state-bad">{error}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Team" description="Everyone in the organisation and the training they currently hold." />
        <CardBody className="p-0">
          {byMember.length === 0 ? (
            <EmptyState title="No team members found" />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {byMember.map(({ member, certs }) => (
                <li key={member.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-ink">{member.full_name}</p>
                  {certs.length === 0 ? (
                    <p className="mt-1 text-xs text-ink-faint">No certifications on record.</p>
                  ) : (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {certs.map((c) => {
                        const status = expiryStatus(c.expires_at);
                        return (
                          <li key={c.id} className="flex items-center gap-1.5">
                            <Badge tone={status.tone}>
                              {c.certification_name} · {status.label}
                            </Badge>
                            <button
                              onClick={() => handleRemove(c.id)}
                              className="text-ink-faint hover:text-state-bad"
                              title="Remove"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
