import { GlobalSearch } from "@/components/search/global-search";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { MobileNav } from "@/components/shell/mobile-nav";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/shell/user-menu";

export async function Topbar() {
  let email: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border-subtle bg-surface/80 px-4 backdrop-blur md:px-6">
      <MobileNav />
      <GlobalSearch />

      <div className="ml-auto flex items-center gap-2">
        {!isSupabaseConfigured ? (
          <span className="hidden rounded-md bg-state-warn-soft px-2 py-1 text-[11px] font-medium text-state-warn ring-1 ring-inset ring-state-warn/25 sm:block">
            Demo data — Supabase not connected
          </span>
        ) : null}
        <ThemeToggle />
        <UserMenu email={email} />
      </div>
    </header>
  );
}
