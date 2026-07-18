"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, Loader2, Search, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Hit {
  kind: "asset" | "finding" | "document";
  id: string;
  title: string;
  subtitle: string;
}

const ICONS = {
  asset: Building2,
  finding: ShieldAlert,
  document: FileText,
} as const;

const HREF: Record<Hit["kind"], (id: string) => string> = {
  asset: (id) => `/assets/${id}`,
  finding: (id) => `/findings?highlight=${id}`,
  document: (id) => `/documents?highlight=${id}`,
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cmd/Ctrl+K to focus. Expected in tools people live in all day.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced, and aborts the previous request so a slow early keystroke can't
  // land after a fast later one and overwrite the results.
  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        setHits(json.hits ?? []);
        setCursor(0);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setHits([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function go(hit: Hit) {
    setOpen(false);
    setQuery("");
    router.push(HREF[hit.kind](hit.id));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[cursor]);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search assets, findings, documents…"
          aria-label="Search"
          className="h-9 w-full rounded-lg border border-border-subtle bg-surface-muted pl-9 pr-16 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border-subtle bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-faint sm:block">
          ⌘K
        </kbd>
        {loading ? (
          <Loader2 className="absolute right-10 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-ink-faint" />
        ) : null}
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg">
          {hits.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-ink-muted">
              {loading ? "Searching…" : `No matches for “${query}”`}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {hits.map((hit, i) => {
                const Icon = ICONS[hit.kind];
                return (
                  <li key={`${hit.kind}-${hit.id}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(hit)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left",
                        i === cursor ? "bg-brand-soft" : "hover:bg-surface-muted",
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-ink-faint" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">
                          {hit.title}
                        </span>
                        <span className="block truncate text-xs text-ink-muted">
                          {hit.subtitle}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink-faint">
                        {hit.kind}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
