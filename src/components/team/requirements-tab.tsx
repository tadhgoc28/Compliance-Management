"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CertificationType, Discipline, DisciplineCertificationRequirement } from "@/lib/types";

export function RequirementsTab({
  disciplines,
  certificationTypes,
  requirements,
}: {
  disciplines: Discipline[];
  certificationTypes: CertificationType[];
  requirements: DisciplineCertificationRequirement[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState<string | null>(null);
  const [pendingCertId, setPendingCertId] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(disciplineId: string) {
    const certificationTypeId = pendingCertId[disciplineId];
    if (!certificationTypeId) return;

    setAdding(disciplineId);
    setError(null);
    try {
      const res = await fetch("/api/discipline-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disciplineId, certificationTypeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add requirement");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAdding(null);
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/discipline-requirements/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove requirement");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <Card>
      <CardHeader
        title="Required training by discipline"
        description="Checked at QR check-in: anyone missing one of these is flagged, not blocked -- the visit still gets logged as evidence."
      />
      <CardBody className="p-0">
        {error && <p className="px-5 pt-3 text-sm text-state-bad">{error}</p>}
        <ul className="divide-y divide-border-subtle">
          {disciplines.map((d) => {
            const forDiscipline = requirements.filter((r) => r.discipline_id === d.id);
            const availableTypes = certificationTypes.filter(
              (t) => !forDiscipline.some((r) => r.certification_type_id === t.id),
            );
            return (
              <li key={d.id} className="px-5 py-3">
                <p className="text-sm font-medium text-ink">{d.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {forDiscipline.length === 0 ? (
                    <span className="text-xs text-ink-faint">No training required.</span>
                  ) : (
                    forDiscipline.map((r) => (
                      <Badge key={r.id} tone="info">
                        {r.certification_name}
                        <button
                          onClick={() => handleRemove(r.id)}
                          className="ml-0.5 hover:text-state-bad"
                          title="Remove requirement"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))
                  )}

                  {availableTypes.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={pendingCertId[d.id] ?? ""}
                        onChange={(e) =>
                          setPendingCertId((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                        className="rounded-lg border border-border-subtle bg-surface px-2 py-1 text-xs text-ink"
                      >
                        <option value="">Add requirement…</option>
                        {availableTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAdd(d.id)}
                        disabled={adding === d.id || !pendingCertId[d.id]}
                        className="rounded-lg border border-border-subtle px-2 py-1 text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
