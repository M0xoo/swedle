"use client";

import { useEffect, useState } from "react";
import { getDailyStats, recordDailyCompletion } from "@/app/stats-actions";
import type { StatsGame } from "@/lib/stats/types";
import { langBeatPercent, quizBeatPercent } from "@/lib/stats/percentile";

const STORAGE_PREFIX = "swedle:statsRecorded:v1:";

function storageKey(dateKey: string, game: StatsGame) {
  return `${STORAGE_PREFIX}${dateKey}:${game}`;
}

function DistributionLine({
  buckets,
  userBucket,
}: {
  buckets: number[];
  userBucket: number;
}) {
  const w = 280;
  const h = 100;
  const padL = 28;
  const padR = 12;
  const padT = 10;
  const padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const n = buckets.length;
  const maxC = Math.max(1, ...buckets);
  const last = Math.max(0, n - 1);
  const pts = buckets.map((c, i) => {
    const x = padL + (last === 0 ? innerW / 2 : (innerW * i) / last);
    const y = padT + innerH * (1 - c / maxC);
    return `${x},${y}`;
  });
  const userX =
    padL +
    (last === 0 ? innerW / 2 : (innerW * Math.min(userBucket, last)) / last);

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 max-w-full text-[var(--accent)]"
      aria-hidden
    >
      <line
        x1={userX}
        y1={padT}
        x2={userX}
        y2={padT + innerH}
        stroke="var(--good)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.85}
      />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts.join(" ")}
        opacity={0.9}
      />
      {buckets.map((c, i) => {
        const x = padL + (last === 0 ? innerW / 2 : (innerW * i) / last);
        const y = padT + innerH * (1 - c / maxC);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === userBucket ? 5 : 3.5}
            fill={
              i === userBucket
                ? "var(--good)"
                : "color-mix(in srgb, var(--accent) 70%, var(--bg))"
            }
            stroke="currentColor"
            strokeWidth={i === userBucket ? 1.5 : 1}
          />
        );
      })}
    </svg>
  );
}

export function DailyCommunityStats({
  dateKey,
  game,
  kind,
  userScore,
}: {
  dateKey: string;
  game: StatsGame;
  kind: "quiz" | "lang";
  userScore: number;
}) {
  const [solvers, setSolvers] = useState<number | null>(null);
  const [buckets, setBuckets] = useState<number[] | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const key = storageKey(dateKey, game);
      const already =
        typeof window !== "undefined" && localStorage.getItem(key) === "1";

      const first = await getDailyStats(dateKey, game);
      if (cancelled) return;
      if (!first.enabled) {
        setVisible(false);
        return;
      }
      setVisible(true);
      setSolvers(first.solvers);
      setBuckets(first.buckets);

      if (!already) {
        const rec = await recordDailyCompletion(dateKey, game, userScore);
        if (!cancelled && rec.ok && typeof window !== "undefined") {
          localStorage.setItem(key, "1");
        }
      }

      // Always re-read so we show Firestore truth (fixes stale zeros when
      // localStorage was set earlier or another tab/session wrote first).
      const fresh = await getDailyStats(dateKey, game);
      if (!cancelled && fresh.enabled) {
        setSolvers(fresh.solvers);
        setBuckets(fresh.buckets);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [dateKey, game, userScore]);

  if (!visible || solvers === null || !buckets) return null;

  const beat =
    kind === "quiz"
      ? quizBeatPercent(userScore, buckets, solvers)
      : langBeatPercent(userScore, buckets, solvers);

  const xLabels =
    kind === "lang"
      ? ["X", "1", "2", "3", "4", "5", "6"]
      : ["0", "1", "2", "3", "4", "5"];

  return (
    <div className="mt-6 w-full max-w-sm border-t border-[var(--line)] pt-5 text-left">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Today&apos;s players
      </p>
      <p className="mt-2 font-mono-ui text-sm text-[var(--fg)]">
        <span className="text-[var(--accent-bright)]">{solvers}</span>
        <span className="text-[var(--muted2)]"> solver{solvers === 1 ? "" : "s"}</span>
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted2)]">
        Your finish is included in this total and chart (one tally per device,
        per game, UTC day).
      </p>
      {beat !== null ? (
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          You did better than{" "}
          <span className="font-medium text-[var(--good)]">{beat}%</span> of
          players today
          {kind === "quiz"
            ? "—only those with a strictly lower score."
            : "—only those with a strictly worse result (e.g. more guesses or a loss)."}
        </p>
      ) : kind === "lang" && userScore === 0 ? (
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Solve to see how you rank against other winners.
        </p>
      ) : null}
      <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted2)]">
        Distribution for today (UTC). Dashed line: your result.
      </p>
      <DistributionLine buckets={buckets} userBucket={userScore} />
      <div
        className="font-mono-ui mt-1 flex justify-between text-[9px] text-[var(--muted2)]"
        style={{ width: 280, maxWidth: "100%" }}
      >
        {xLabels.map((lab, i) => (
          <span key={i} className="w-0 flex-1 text-center">
            {lab}
          </span>
        ))}
      </div>
    </div>
  );
}
