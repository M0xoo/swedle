"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HubTotal } from "@/components/HubTotal";
import type { HomeGameEntry } from "@/lib/home-games";
import {
  getHomeGameTileStatus,
  type HomeGameTileStatus,
} from "@/lib/home-game-status";

function collectStatuses(
  dateKey: string,
  games: HomeGameEntry[],
): Record<string, HomeGameTileStatus> {
  return Object.fromEntries(
    games.map((g) => [g.href, getHomeGameTileStatus(dateKey, g.persistId)]),
  );
}

function DoneLeft({ status }: { status: Exclude<HomeGameTileStatus, { state: "idle" }> }) {
  const scoreClass =
    status.kind === "lang-solved" || status.kind === "reveal-solved"
      ? "text-[var(--good)]"
      : status.kind === "lang-missed" || status.kind === "reveal-missed"
        ? "text-[var(--muted)]"
        : "text-[var(--accent-bright)]";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="inline-flex h-6 items-center rounded border border-[var(--line)] bg-[color-mix(in_srgb,var(--fg)_4%,transparent)] px-2 font-mono-ui text-[10px] uppercase leading-none tracking-[0.14em] text-[var(--muted)]">
        Done
      </span>
      <span
        className={`inline-flex items-center font-mono-ui text-xs tabular-nums leading-none ${scoreClass}`}
      >
        {status.scoreLabel}
      </span>
    </div>
  );
}

export function HomeGameTiles({
  dateKey,
  games,
}: {
  dateKey: string;
  games: HomeGameEntry[];
}) {
  const [statuses, setStatuses] = useState<Record<string, HomeGameTileStatus>>(
    {},
  );

  useEffect(() => {
    function refresh() {
      setStatuses(collectStatuses(dateKey, games));
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [dateKey, games]);

  const topRowIds = useMemo(
    () => new Set<HomeGameEntry["persistId"]>(["lang", "reveal"]),
    [],
  );
  const topGames = useMemo(
    () => games.filter((g) => topRowIds.has(g.persistId)),
    [games, topRowIds],
  );
  const quizGames = useMemo(
    () => games.filter((g) => !topRowIds.has(g.persistId)),
    [games, topRowIds],
  );

  function tileLink(
    g: HomeGameEntry,
    opts: { fullWidth: boolean; sectionBottomSpacer: boolean },
  ) {
    const s = statuses[g.href] ?? { state: "idle" as const };
    return (
      <Link
        key={g.href}
        href={g.href}
        className={`game-tile group flex flex-col ${opts.fullWidth ? "sm:col-span-2" : ""} ${opts.sectionBottomSpacer ? "mb-5 sm:mb-6" : ""}`}
      >
        <h2 className="font-display text-lg font-medium text-[var(--fg)] group-hover:text-[var(--accent-bright)]">
          {g.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {g.blurb}
        </p>
        <div className="mt-4 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
          <div className="min-w-0">
            {s.state === "done" ? <DoneLeft status={s} /> : null}
          </div>
          <span className="inline-flex h-6 shrink-0 items-center text-xs font-medium leading-none tracking-wide text-[var(--accent)] group-hover:text-[var(--accent-bright)]">
            Open →
          </span>
        </div>
      </Link>
    );
  }

  return (
    <>
      {topGames.map((g, i) =>
        tileLink(g, {
          fullWidth: true,
          sectionBottomSpacer: i === topGames.length - 1,
        }),
      )}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm sm:col-span-2">
        <span className="text-[var(--muted2)]">Quiz points</span>
        <HubTotal dateKey={dateKey} />
      </div>

      {quizGames.map((g) =>
        tileLink(g, { fullWidth: false, sectionBottomSpacer: false }),
      )}
    </>
  );
}
