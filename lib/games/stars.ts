import { REPOS } from "@/lib/data";
import type { RepoEntry } from "@/lib/types";
import { createRng, pickMany } from "@/lib/seed";

export type StarRound = {
  left: RepoEntry;
  right: RepoEntry;
  winner: RepoEntry;
};

function starWinner(a: RepoEntry, b: RepoEntry): RepoEntry {
  if (a.stars !== b.stars) return a.stars > b.stars ? a : b;
  return a.id < b.id ? a : b;
}

/** Winner of each round stays on the left vs the next repo in the sequence. */
export function buildStarRounds(seq: RepoEntry[]): StarRound[] {
  if (seq.length < 6) return [];
  const rounds: StarRound[] = [];
  let champ = seq[0]!;
  for (let i = 0; i < 5; i++) {
    const left = i === 0 ? seq[0]! : champ;
    const right = seq[i + 1]!;
    const winner = starWinner(left, right);
    rounds.push({ left, right, winner });
    champ = winner;
  }
  return rounds;
}

export function getDailyStarBattle(dateKey: string): StarRound[] {
  const rng = createRng(dateKey, "stars");
  const seq = pickMany(rng, [...REPOS], 6);
  return buildStarRounds(seq);
}
