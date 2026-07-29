"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CheckInButton({
  qrCodeId,
  initiallyCheckedIn,
}: {
  qrCodeId: string;
  initiallyCheckedIn: boolean;
}) {
  const router = useRouter();
  const [checkedIn, setCheckedIn] = useState(initiallyCheckedIn);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check in");

      setCheckedIn(data.action === "checked_in");
      setMessage(data.action === "checked_in" ? "Checked in." : "Checked out.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={
          checkedIn
            ? "w-full rounded-lg bg-state-bad px-4 py-3.5 text-base font-semibold text-white hover:opacity-90 disabled:opacity-50"
            : "w-full rounded-lg bg-brand px-4 py-3.5 text-base font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
        }
      >
        {loading ? "Please wait…" : checkedIn ? "Check out" : "Check in"}
      </button>
      {message ? <p className="text-center text-sm text-state-ok">{message}</p> : null}
      {error ? <p className="text-center text-sm text-state-bad">{error}</p> : null}
    </div>
  );
}
