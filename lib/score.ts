/** Rounds per quiz run (stars, ipo, complexity, timeline). Scores are clamped to 0..this. */
export const QUIZ_ROUND_COUNT = 5;

export const QUIZ_SCORE_GAMES = [
  "stars",
  "ipo",
  "complexity",
  "timeline",
] as const;

export type QuizScoreGame = (typeof QUIZ_SCORE_GAMES)[number];

export const QUIZ_HUB_POINTS_MAX =
  QUIZ_SCORE_GAMES.length * QUIZ_ROUND_COUNT;

function isQuizScoreGame(game: string): game is QuizScoreGame {
  return (QUIZ_SCORE_GAMES as readonly string[]).includes(game);
}

function clampQuizScore(game: string, n: number): number {
  if (!isQuizScoreGame(game)) return n;
  return Math.min(QUIZ_ROUND_COUNT, Math.max(0, n));
}

export function scoreKey(dateKey: string, game: string) {
  return `swedle:${dateKey}:${game}`;
}

export function readScore(dateKey: string, game: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(scoreKey(dateKey, game));
  const parsed = raw ? Number(raw) : 0;
  if (!Number.isFinite(parsed)) {
    if (isQuizScoreGame(game) && raw != null)
      window.localStorage.setItem(scoreKey(dateKey, game), "0");
    return 0;
  }
  const capped = clampQuizScore(game, parsed);
  if (isQuizScoreGame(game) && capped !== parsed) {
    window.localStorage.setItem(scoreKey(dateKey, game), String(capped));
  }
  return capped;
}

export function writeScore(dateKey: string, game: string, value: number) {
  if (typeof window === "undefined") return;
  const capped = clampQuizScore(game, value);
  window.localStorage.setItem(scoreKey(dateKey, game), String(capped));
}

export function bumpScore(dateKey: string, game: string, delta: number) {
  const next = readScore(dateKey, game) + delta;
  writeScore(dateKey, game, next);
  return readScore(dateKey, game);
}
