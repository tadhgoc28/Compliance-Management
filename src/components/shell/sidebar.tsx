"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/5 bg-[oklch(0.17_0.01_255)] md:flex">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="grid size-7 place-items-center rounded-md bg-brand text-white">
          <ShieldAlert className="size-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">
          Complyra
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          // Exact match for the dashboard, prefix match elsewhere, so that
          // /assets/<id> keeps the register highlighted.
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

      <div className="border-t border-white/5 px-5 py-3">
        <p className="text-[11px] text-white/35">
          Compliance Management Platform
        </p>
      </div>
    </aside>
  );
}
