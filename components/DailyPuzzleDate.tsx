"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { getUtcDateKey, nextDailyRefreshUtc } from "@/lib/daily";

function formatHms(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function useCountdownMs(endTimeMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return Math.max(0, endTimeMs - now);
}

const chipBase =
  "cursor-pointer font-mono-ui border border-[var(--line)] bg-[var(--bg-raised)] px-2.5 py-1 text-[var(--muted)] transition-[border-color,background-color,box-shadow] hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] hover:bg-[color-mix(in_srgb,var(--accent)_6%,var(--bg-raised))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

const variantChip: Record<"home" | "game", string> = {
  home: `${chipBase} text-xs`,
  game: `${chipBase} text-[11px] tracking-wide`,
};

export function DailyPuzzleDate({
  dateKey,
  variant,
}: {
  dateKey: string;
  variant: "home" | "game";
}) {
  const uid = useId();
  const panelId = `daily-refresh-panel-${uid}`;
  const triggerId = `daily-refresh-trigger-${uid}`;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshAt = useMemo(() => nextDailyRefreshUtc(dateKey), [dateKey]);
  const refreshEndMs = refreshAt.getTime();
  const msLeft = useCountdownMs(refreshEndMs);
  const nextKey = useMemo(() => getUtcDateKey(refreshAt), [refreshAt]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const panelAlign = variant === "game" ? "end" : "start";

  return (
    <div
      ref={wrapRef}
      className={`relative inline-flex flex-col ${panelAlign === "end" ? "items-end" : "items-start"}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        id={triggerId}
        onClick={() => setOpen((v) => !v)}
        className={variantChip[variant]}
      >
        <time dateTime={dateKey}>
          {dateKey}
          {variant === "game" ? " UTC" : null}
        </time>
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className={`absolute top-full z-20 mt-1 min-w-[12.5rem] rounded-md border border-[var(--line)] bg-[var(--bg-raised)] px-3 py-2.5 shadow-lg shadow-black/25 ${
            panelAlign === "end" ? "right-0" : "left-0"
          }`}
        >
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[var(--muted2)]">
            Next daily set
          </p>
          <p className="mt-1.5 font-mono-ui text-lg tabular-nums tracking-tight text-[var(--fg)]">
            {formatHms(msLeft)}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
            Puzzles refresh at{" "}
            <span className="font-mono-ui text-[var(--muted2)]">{nextKey}</span>{" "}
            00:00 UTC
          </p>
        </div>
      ) : null}
    </div>
  );
}
