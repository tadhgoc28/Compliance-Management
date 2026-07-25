"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden flex items-center justify-center p-2 text-ink hover:bg-surface-hover rounded-lg"
        aria-label="Toggle navigation"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" />
      )}

      <div
        ref={dialogRef}
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-60 transform bg-[oklch(0.17_0.01_255)] transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 px-5 border-b border-white/5">
          <div className="grid size-7 place-items-center rounded-md bg-brand text-white">
            <ShieldAlert className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Complyra
          </span>
        </div>

        <nav className="space-y-0.5 px-3 py-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-white/10 font-medium text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white/90",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 px-5 py-3">
          <p className="text-[11px] text-white/35">
            Compliance Management Platform
          </p>
        </div>
      </div>
    </>
  );
}
