"use client";

import { getUtcDateKey } from "@/lib/daily";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Server-rendered `dateKey` is fixed until RSC refresh. If the tab stays open past UTC
 * midnight, the client still sends yesterday’s key to server actions — same puzzle “forever”.
 */
export function DailyDateRolloverBanner({
  serverDateKey,
}: {
  serverDateKey: string;
}) {
  const router = useRouter();
  const [stale, setStale] = useState(false);

  const check = useCallback(() => {
    setStale(getUtcDateKey() !== serverDateKey);
  }, [serverDateKey]);

  useEffect(() => {
    check();
    const id = window.setInterval(check, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", check);
    };
  }, [check]);

  if (!stale) return null;

  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_9%,var(--bg-raised))] px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4"
    >
      <p className="text-sm leading-relaxed text-[var(--fg)]">
        UTC midnight has passed — this tab still has{" "}
        <span className="font-mono-ui text-[var(--accent-bright)]">
          {serverDateKey} UTC
        </span>{" "}
        loaded. Refresh to play today&apos;s puzzle (same for everyone).
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="font-mono-ui mt-3 shrink-0 rounded-md border border-[color-mix(in_srgb,var(--accent)_48%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--bg))] px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--accent-bright)] transition-[border-color,background-color] hover:border-[color-mix(in_srgb,var(--accent-bright)_55%,var(--line))] sm:mt-0"
      >
        Refresh
      </button>
    </div>
  );
}
