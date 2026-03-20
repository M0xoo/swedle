import { IPOS } from "@/lib/data";
import type { IpoEntry } from "@/lib/types";
import { createRng, pickMany } from "@/lib/seed";

export type IpoMode = "valuation" | "year";

export type IpoRound = {
  left: IpoEntry;
  right: IpoEntry;
  mode: IpoMode;
  winner: IpoEntry;
};

function ipoWinner(l: IpoEntry, r: IpoEntry, mode: IpoMode): IpoEntry {
  if (mode === "valuation") {
    if (l.openingValuationB !== r.openingValuationB) {
      return l.openingValuationB > r.openingValuationB ? l : r;
    }
    if (l.year !== r.year) return l.year < r.year ? l : r;
    return l.id < r.id ? l : r;
  }
  if (l.year !== r.year) return l.year < r.year ? l : r;
  if (l.openingValuationB !== r.openingValuationB) {
    return l.openingValuationB < r.openingValuationB ? l : r;
  }
  return l.id < r.id ? l : r;
}

function pickMode(
  rng: () => number,
  l: IpoEntry,
  r: IpoEntry,
): IpoMode {
  let mode: IpoMode = rng() < 0.55 ? "valuation" : "year";
  if (mode === "valuation" && l.openingValuationB === r.openingValuationB) {
    mode = "year";
  }
  if (mode === "year" && l.year === r.year) {
    mode = "valuation";
  }
  return mode;
}

export function buildIpoRounds(seq: IpoEntry[], rng: () => number): IpoRound[] {
  if (seq.length < 6) return [];
  const rounds: IpoRound[] = [];
  let champ = seq[0]!;
  for (let i = 0; i < 5; i++) {
    const left = i === 0 ? seq[0]! : champ;
    const right = seq[i + 1]!;
    const mode = pickMode(rng, left, right);
    const winner = ipoWinner(left, right, mode);
    rounds.push({ left, right, mode, winner });
    champ = winner;
  }
  return rounds;
}

export function getDailyIpoQuiz(dateKey: string): IpoRound[] {
  const rng = createRng(dateKey, "ipo");
  const seq = pickMany(rng, [...IPOS], 6);
  return buildIpoRounds(seq, rng);
}

export function ipoPrompt(mode: IpoMode): string {
  if (mode === "valuation") return "Which IPO opened with a higher valuation?";
  return "Which company IPO’d earlier?";
}
