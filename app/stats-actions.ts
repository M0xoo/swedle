"use server";

import { getFirebaseStatsGate } from "@/lib/firebase-admin";
import { statsLog } from "@/lib/stats/stats-log";
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

let statsGateWarned = false;
function warnStatsGateOnce(
  reason: "missing_project" | "disabled",
): void {
  if (statsGateWarned) return;
  statsGateWarned = true;
  const msg =
    reason === "missing_project"
      ? "Set GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID on the service (e.g. Cloud Run → Edit → Variables), then redeploy."
      : "Set FIREBASE_STATS_ENABLED=1 plus GOOGLE_CLOUD_PROJECT, or use FIREBASE_SERVICE_ACCOUNT_KEY / GOOGLE_APPLICATION_CREDENTIALS. See README Deploy.";
  console.warn("[swedle:stats]", msg);
}

function validateQuizScore(
  dateKey: string,
  game: Exclude<StatsGame, "lang" | "reveal">,
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

function validateLangLikeScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= 6;
}

export async function recordDailyCompletion(
  dateKey: string,
  game: StatsGame,
  score: number,
): Promise<{ ok: boolean; error?: string }> {
  const gate = getFirebaseStatsGate();
  if (!gate.ok) {
    warnStatsGateOnce(gate.reason);
    statsLog("recordDailyCompletion skipped", { gate: gate.reason });
    return { ok: false, error: "unconfigured" };
  }
  try {
    if (game === "lang" || game === "reveal") {
      if (!validateLangLikeScore(score)) {
        statsLog("recordDailyCompletion rejected", {
          dateKey,
          game,
          score,
          reason: "invalid_lang_like_score",
        });
        return { ok: false, error: "invalid" };
      }
    } else if (!validateQuizScore(dateKey, game, score)) {
      statsLog("recordDailyCompletion rejected", {
        dateKey,
        game,
        score,
        reason: "invalid_quiz_score",
      });
      return { ok: false, error: "invalid" };
    }
    statsLog("recordDailyCompletion", { dateKey, game, score });
    await incrementDailyStats(dateKey, game, score);
    statsLog("recordDailyCompletion done", { dateKey, game, score });
    return { ok: true };
  } catch (e) {
    console.error("[swedle:stats] recordDailyCompletion error", e);
    statsLog("recordDailyCompletion failed", { dateKey, game, error: String(e) });
    return { ok: false, error: "write_failed" };
  }
}

export type DailyStatsResult =
  | {
      enabled: false;
      reason: "missing_project" | "disabled" | "firestore_error";
    }
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
  const gate = getFirebaseStatsGate();
  if (!gate.ok) {
    warnStatsGateOnce(gate.reason);
    statsLog("getDailyStats blocked", { dateKey, game, gate: gate.reason });
    return { enabled: false, reason: gate.reason };
  }
  try {
    const snap = await readDailyStatsDoc(dateKey, game);
    const { solvers, buckets } = bucketsFromSnapshot(game, snap.data());
    const bucketSum = buckets.reduce((a, b) => a + b, 0);
    statsLog("getDailyStats", {
      dateKey,
      game,
      docId: `${dateKey}_${game}`,
      exists: snap.exists,
      solvers,
      buckets,
      bucketSum,
    });
    return {
      enabled: true,
      kind: game === "lang" || game === "reveal" ? "lang" : "quiz",
      solvers,
      buckets,
    };
  } catch (e) {
    console.error("[swedle:stats] getDailyStats error", e);
    statsLog("getDailyStats failed", { dateKey, game, error: String(e) });
    return { enabled: false, reason: "firestore_error" };
  }
}
