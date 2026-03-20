"use server";

import { isFirebaseStatsEnabled } from "@/lib/firebase-admin";
import { getDailyComplexity } from "@/lib/games/complexity";
import { getDailyIpoQuiz } from "@/lib/games/ipos";
import { getDailyStarBattle } from "@/lib/games/stars";
import { getDailyTimeline } from "@/lib/games/timeline";
import {
  bucketsFromSnapshot,
  incrementDailyStats,
  readDailyStatsDoc,
} from "@/lib/stats/server-firestore";
import type { StatsGame } from "@/lib/stats/types";

function validateQuizScore(
  dateKey: string,
  game: Exclude<StatsGame, "lang">,
  score: number,
): boolean {
  if (!Number.isInteger(score)) return false;
  let n: number;
  switch (game) {
    case "stars":
      n = getDailyStarBattle(dateKey).length;
      break;
    case "ipo":
      n = getDailyIpoQuiz(dateKey).length;
      break;
    case "timeline":
      n = getDailyTimeline(dateKey).length;
      break;
    case "complexity":
      n = getDailyComplexity(dateKey).length;
      break;
    default:
      return false;
  }
  return n > 0 && score >= 0 && score <= n;
}

function validateLangScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= 6;
}

export async function recordDailyCompletion(
  dateKey: string,
  game: StatsGame,
  score: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!isFirebaseStatsEnabled()) {
    return { ok: false, error: "unconfigured" };
  }
  try {
    if (game === "lang") {
      if (!validateLangScore(score)) return { ok: false, error: "invalid" };
    } else if (!validateQuizScore(dateKey, game, score)) {
      return { ok: false, error: "invalid" };
    }
    await incrementDailyStats(dateKey, game, score);
    return { ok: true };
  } catch (e) {
    console.error("recordDailyCompletion", e);
    return { ok: false, error: "write_failed" };
  }
}

export type DailyStatsResult =
  | { enabled: false }
  | {
      enabled: true;
      kind: "quiz" | "lang";
      solvers: number;
      buckets: number[];
    };

export async function getDailyStats(
  dateKey: string,
  game: StatsGame,
): Promise<DailyStatsResult> {
  if (!isFirebaseStatsEnabled()) {
    return { enabled: false };
  }
  try {
    const snap = await readDailyStatsDoc(dateKey, game);
    const { solvers, buckets } = bucketsFromSnapshot(game, snap.data());
    return {
      enabled: true,
      kind: game === "lang" ? "lang" : "quiz",
      solvers,
      buckets,
    };
  } catch (e) {
    console.error("getDailyStats", e);
    return { enabled: false };
  }
}
