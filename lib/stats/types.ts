export type StatsGame = "stars" | "ipo" | "timeline" | "complexity" | "lang";

export function maxBucketIndex(game: StatsGame): number {
  return game === "lang" ? 6 : 5;
}
