import { formatPayloadValue, humanise } from "@/lib/utils";
import type { Payload } from "@/lib/types";

/**
 * Renders a discipline payload generically.
 *
 * This component is why the JSONB design pays off in the UI as well as the
 * database: it knows nothing about asbestos or fire, it just walks whatever keys
 * the payload has. A new discipline gets a readable detail view for free.
 *
 * Nested objects (like the asbestos material assessment) render as an indented
 * sub-group rather than raw JSON.
 */
export function PayloadDetail({ payload }: { payload: Payload }) {
  const entries = Object.entries(payload).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  if (entries.length === 0) {
    return <p className="text-xs text-ink-faint">No additional detail recorded.</p>;
  }

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {entries.map(([key, value]) => {
        const isNested =
          typeof value === "object" && value !== null && !Array.isArray(value);

        if (isNested) {
          return (
            <div key={key} className="sm:col-span-2">
              <dt className="text-xs font-medium text-ink-muted">{humanise(key)}</dt>
              <dd className="mt-1 rounded-lg border border-border-subtle bg-surface-muted p-3">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
                  {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] text-ink-faint">{humanise(k)}</dt>
                      <dd className="tnum text-sm text-ink">{formatPayloadValue(v)}</dd>
                    </div>
                  ))}
                </dl>
              </dd>
            </div>
          );
        }

        return (
          <div key={key}>
            <dt className="text-xs text-ink-faint">{humanise(key)}</dt>
            <dd className="text-sm text-ink">{formatPayloadValue(value)}</dd>
          </div>
        );
      })}
    </dl>
  );
}
