import { LANGUAGES, languageById } from "@/lib/data";
import type { Execution, FeedbackTone, Language, Platform } from "@/lib/types";
import { createRng, pickOne } from "@/lib/seed";

function setEqual(a: Platform[], b: Platform[]): boolean {
  const sa = new Set(a);
  if (sa.size !== b.length) return false;
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

function platformOverlap(a: Platform[], b: Platform[]): number {
  const sa = new Set(a);
  let n = 0;
  for (const x of b) if (sa.has(x)) n++;
  return n;
}

function paradigmFeedback(secret: Language, guess: Language): FeedbackTone {
  if (secret.paradigm === guess.paradigm) return "green";
  const s = new Set(secret.paradigms);
  for (const p of guess.paradigms) {
    if (s.has(p)) return "orange";
  }
  return "gray";
}

function openSourceFeedback(secret: Language, guess: Language): FeedbackTone {
  return secret.openSource === guess.openSource ? "green" : "gray";
}

function executionFeedback(secret: Language, guess: Language): FeedbackTone {
  if (secret.execution === guess.execution) return "green";
  if (secret.execution === "hybrid" || guess.execution === "hybrid") {
    const pair = new Set([secret.execution, guess.execution]);
    if (pair.has("compiled") && pair.has("interpreted")) return "orange";
    if (pair.has("hybrid") && (pair.has("compiled") || pair.has("interpreted")))
      return "orange";
  }
  return "gray";
}

function platformsFeedback(secret: Language, guess: Language): FeedbackTone {
  if (setEqual(secret.platforms, guess.platforms)) return "green";
  if (platformOverlap(secret.platforms, guess.platforms) > 0) return "orange";
  return "gray";
}

function yearFeedback(secret: Language, guess: Language): FeedbackTone {
  const d = Math.abs(secret.year - guess.year);
  if (d === 0) return "green";
  if (d <= 5) return "orange";
  return "gray";
}

export type YearHint = "up" | "down";

export type LangGuessResult = {
  guess: Language;
  cells: {
    paradigm: FeedbackTone;
    openSource: FeedbackTone;
    execution: FeedbackTone;
    platforms: FeedbackTone;
    year: FeedbackTone;
  };
  /** Secret year is later (↑) or earlier (↓) than the guess; only when year ≠ exact. */
  yearHint: YearHint | null;
  solved: boolean;
};

export function evaluateLanguageGuess(
  secret: Language,
  guessId: string,
): LangGuessResult | null {
  const guess = languageById(guessId);
  if (!guess) return null;
  const cells = {
    paradigm: paradigmFeedback(secret, guess),
    openSource: openSourceFeedback(secret, guess),
    execution: executionFeedback(secret, guess),
    platforms: platformsFeedback(secret, guess),
    year: yearFeedback(secret, guess),
  };
  const solved = guess.id === secret.id;
  let yearHint: YearHint | null = null;
  if (secret.year !== guess.year) {
    yearHint = secret.year > guess.year ? "up" : "down";
  }
  return { guess, cells, yearHint, solved };
}

export function getDailyLanguage(dateKey: string): Language {
  const rng = createRng(dateKey, "lang");
  return pickOne(rng, LANGUAGES);
}

export function labelExecution(e: Execution): string {
  if (e === "hybrid") return "JIT / VM / hybrid";
  return e;
}

export function labelPlatforms(p: Platform[]): string {
  return p.map((x) => x[0]!.toUpperCase() + x.slice(1)).join(" · ");
}
