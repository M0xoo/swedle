import { loadLangProgress, loadQuizProgress } from "@/lib/game-persist";
import type { HomeGamePersistId } from "@/lib/home-games";
import { readScore } from "@/lib/score";

const QUIZ_TOTAL = 5;

export type HomeGameTileStatus =
  | { state: "idle" }
  | {
      state: "done";
      /** Short score line for the card, e.g. "4/5" or "3/6" */
      scoreLabel: string;
      /** Langdle solved vs missed; quizzes use "quiz" */
      kind: "lang-solved" | "lang-missed" | "quiz";
    };

function langStatus(dateKey: string): HomeGameTileStatus {
  const rows = loadLangProgress(dateKey);
  if (!rows?.length) return { state: "idle" };
  const solved = rows.some((r) => r.solved);
  const exhausted = rows.length >= 6;
  if (!solved && !exhausted) return { state: "idle" };
  if (solved) {
    return {
      state: "done",
      scoreLabel: `${rows.length}/6`,
      kind: "lang-solved",
    };
  }
  return { state: "done", scoreLabel: "Missed", kind: "lang-missed" };
}

function quizStatus(
  dateKey: string,
  game: "stars" | "ipo" | "complexity" | "timeline",
): HomeGameTileStatus {
  const prog = loadQuizProgress(dateKey, game);
  if (!prog?.done) return { state: "idle" };
  const score = readScore(dateKey, game);
  return {
    state: "done",
    scoreLabel: `${score}/${QUIZ_TOTAL}`,
    kind: "quiz",
  };
}

export function getHomeGameTileStatus(
  dateKey: string,
  id: HomeGamePersistId,
): HomeGameTileStatus {
  if (typeof window === "undefined") return { state: "idle" };

  if (id === "lang") return langStatus(dateKey);
  return quizStatus(dateKey, id);
}
