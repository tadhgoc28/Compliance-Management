import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import type { AuditLog } from "@/lib/types";
import { humanise } from "@/lib/utils";

const ACTION_ICON = { insert: Plus, update: Pencil, delete: Trash2 } as const;
const ACTION_LABEL: Record<AuditLog["action"], string> = {
  insert: "raised this finding",
  update: "updated",
  delete: "removed this finding",
};

/**
 * Written by database triggers on every insert/update/delete, not by the app
 * -- so this is what actually backs a claim of "we knew and we acted", not
 * just what the current status field says.
 */
export function AuditHistory({ logs }: { logs: AuditLog[] }) {
  return (
    <Card>
      <CardHeader
        title="History"
        description="Immutable record of every change -- the evidence trail for insurance and compliance review."
      />
      <CardBody className="p-0">
        {logs.length === 0 ? (
          <EmptyState title="No history recorded yet" icon={<Clock className="size-6" />} />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {logs.map((log) => {
              const Icon = ACTION_ICON[log.action];
              return (
                <li key={log.id} className="flex items-start gap-3 px-5 py-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">
                      <span className="font-medium">{log.user_name ?? "Unknown"}</span>{" "}
                      {ACTION_LABEL[log.action]}
                      {log.action === "update" && log.changed_fields.length > 0
                        ? ` (${log.changed_fields.map(humanise).join(", ")})`
                        : ""}
                    </p>
                    {log.action === "update" &&
                    log.changed_fields.includes("status") &&
                    log.old_values &&
                    log.new_values ? (
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {humanise(String(log.old_values.status ?? "—"))} →{" "}
                        {humanise(String(log.new_values.status ?? "—"))}
                      </p>
                    ) : null}
                  </div>
                  <time className="shrink-0 whitespace-nowrap text-xs text-ink-faint">
                    {new Date(log.created_at).toLocaleString("en-IE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
