import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A stat tile, not a chart: a single number's job is to be read, and a plot
 * around it would only add ink. The optional meter is a magnitude bar, shown
 * only where a part-to-whole reading is genuinely meaningful.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "ok" | "warn" | "bad";
  href?: string;
  icon?: React.ReactNode;
}) {
  const body = (
    <div
      className={cn(
        "group relative flex h-full flex-col justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
        href && "transition-colors hover:border-brand/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-ink-muted">{label}</span>
        {icon ? <span className="text-ink-faint">{icon}</span> : null}
      </div>
      <div>
        <span
          className={cn(
            "tnum block text-2xl font-semibold tracking-tight",
            tone === "neutral" && "text-ink",
            tone === "ok" && "text-state-ok",
            tone === "warn" && "text-state-warn",
            tone === "bad" && "text-state-bad",
          )}
        >
          {value}
        </span>
        {hint ? <span className="mt-0.5 block text-xs text-ink-faint">{hint}</span> : null}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
