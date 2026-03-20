export type StatsGame =
  | "stars"
  | "ipo"
  | "timeline"
  | "complexity"
  | "lang"
  | "reveal";

export function maxBucketIndex(game: StatsGame): number {
  return game === "lang" || game === "reveal" ? 6 : 5;
}
