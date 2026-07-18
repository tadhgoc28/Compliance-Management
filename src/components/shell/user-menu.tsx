"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({ email }: { email: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const label = email ?? "Demo user";
  const initial = label.charAt(0).toUpperCase();

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-lg bg-brand text-xs font-semibold text-white"
      >
        {initial}
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg"
          >
            <div className="flex items-center gap-2.5 border-b border-border-subtle px-3 py-2.5">
              <User className="size-4 text-ink-faint" />
              <span className="truncate text-xs text-ink-muted">{label}</span>
            </div>
            {email ? (
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink hover:bg-surface-muted disabled:opacity-50"
              >
                <LogOut className="size-4 text-ink-faint" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            ) : (
              <p className="px-3 py-2.5 text-xs text-ink-muted">
                Connect Supabase to enable accounts.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
