import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-[oklch(0.17_0.01_255)] p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-md bg-brand text-white">
            <ShieldAlert className="size-4.5" />
          </div>
          <span className="text-base font-semibold text-white">Complyra</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold leading-tight text-white">
            One platform for every compliance discipline.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Asbestos, fire, legionella, electrical and more — asset registers,
            inspections, findings, documents and a full audit trail in one
            operational view, so you can show exactly what was known and when
            it was acted on if it&apos;s ever questioned.
          </p>
        </div>
        <p className="text-xs text-white/35">
          Compliance Management Platform · Demo environment
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="grid size-8 place-items-center rounded-md bg-brand text-white">
              <ShieldAlert className="size-4.5" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Access your compliance workspace.
          </p>

          {isSupabaseConfigured ? (
            <LoginForm />
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-state-warn/25 bg-state-warn-soft p-4 text-sm text-ink">
                <p className="font-medium">Demo mode</p>
                <p className="mt-1 text-ink-muted">
                  Supabase isn&apos;t connected, so authentication is disabled.
                  The full app is browsable against demo data.
                </p>
              </div>
              <Link
                href="/"
                className="block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-strong"
              >
                Enter demo
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
