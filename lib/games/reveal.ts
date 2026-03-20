import { languageById } from "@/lib/data";
import { createRng, pickOne } from "@/lib/seed";
import { REVEAL_SNIPPETS, type RevealSnippet } from "@/lib/games/reveal-data";

/** Fraction of the snippet visible after `guessCount` submitted guesses (0 = none yet). */
export const REVEAL_FRACTIONS = [0.18, 0.34, 0.5, 0.66, 0.82, 1.0] as const;

export const REVEAL_MAX_GUESSES = 6;

export type SnippetGuessResult = {
  guess: { id: string; name: string };
  solved: boolean;
};

export function getDailyRevealSnippet(dateKey: string): RevealSnippet {
  const rng = createRng(dateKey, "reveal");
  return pickOne(rng, [...REVEAL_SNIPPETS]);
}

export function evaluateRevealGuess(
  secretLanguageId: string,
  guessId: string,
): SnippetGuessResult | null {
  const guess = languageById(guessId);
  if (!guess) return null;
  return {
    guess: { id: guess.id, name: guess.name },
    solved: guess.id === secretLanguageId,
  };
}

/** Visible prefix length from full code and number of guesses already on the board (not including pending). */
export function revealCharCount(
  fullCode: string,
  guessCount: number,
  solved: boolean,
): number {
  const len = fullCode.length;
  if (len === 0) return 0;
  if (solved) return len;
  const idx = Math.min(
    Math.max(0, guessCount),
    REVEAL_FRACTIONS.length - 1,
  );
  const frac = REVEAL_FRACTIONS[idx]!;
  return Math.max(1, Math.ceil(len * frac));
}

export function visibleSnippet(
  fullCode: string,
  guessCount: number,
  solved: boolean,
): string {
  const n = revealCharCount(fullCode, guessCount, solved);
  return fullCode.slice(0, n);
}
