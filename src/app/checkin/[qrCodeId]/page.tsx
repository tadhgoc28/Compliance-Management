import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, ShieldAlert } from "lucide-react";
import { getMyOpenVisit, getQrCode, getRecentVisitsForQrCode } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { CheckInButton } from "@/components/site-access/check-in-button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Site check-in" };

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ qrCodeId: string }>;
}) {
  const { qrCodeId } = await params;
  const qrCode = await getQrCode(qrCodeId);
  if (!qrCode) notFound();

  const [recentVisits, myOpenVisit] = await Promise.all([
    getRecentVisitsForQrCode(qrCodeId, 5),
    getMyOpenVisit(qrCodeId),
  ]);

  // Demo mode has no auth session at all, so the page is browsable but the
  // button will explain it can't actually write -- same convention as every
  // other write action in the app (see StatusTransition).
  let signedIn = !isSupabaseConfigured;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-muted p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-brand text-white">
            <ShieldAlert className="size-4.5" />
          </div>
          <span className="text-base font-semibold text-ink">Complyra</span>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-5 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
            <MapPin className="size-3.5" />
            Site check-in
          </p>
          <h1 className="mt-1 text-xl font-semibold text-ink">{qrCode.asset_name}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {qrCode.label ?? "Main entrance"}
            {qrCode.asset_reference ? ` · ${qrCode.asset_reference}` : ""}
          </p>

          <div className="mt-5">
            {signedIn ? (
              <CheckInButton qrCodeId={qrCode.id} initiallyCheckedIn={!!myOpenVisit} />
            ) : (
              <Link
                href={`/login?next=/checkin/${qrCode.id}`}
                className="block w-full rounded-lg bg-brand px-4 py-3.5 text-center text-base font-semibold text-white hover:bg-brand-strong"
              >
                Sign in to check in
              </Link>
            )}
          </div>
        </div>

        {recentVisits.length > 0 ? (
          <div className="rounded-xl border border-border-subtle bg-surface p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-faint">
              <Clock className="size-3.5" />
              Recent activity here
            </p>
            <ul className="space-y-1.5 text-xs">
              {recentVisits.map((v) => (
                <li key={v.id} className="flex items-center justify-between text-ink-muted">
                  <span className="truncate">{v.visitor_name ?? "Unknown"}</span>
                  <span className="tnum shrink-0">
                    {formatDate(v.checked_in_at)}
                    {v.checked_out_at ? "" : " · on site"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
