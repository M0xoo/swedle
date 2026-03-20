/** Higher score is better. Share of players who scored strictly lower today. */
export function quizBeatPercent(
  score: number,
  buckets: number[],
  solvers: number,
): number | null {
  if (solvers <= 0) return null;
  let worse = 0;
  for (let i = 0; i < score; i++) worse += buckets[i] ?? 0;
  return Math.min(100, Math.round((100 * worse) / solvers));
}

/**
 * Fewer guesses to win is better; fail is worst. Share of players with a strictly
 * worse outcome today (failed, or same fail, or won in more guesses).
 */
export function langBeatPercent(
  bucket: number,
  buckets: number[],
  solvers: number,
): number | null {
  if (solvers <= 0) return null;
  if (bucket === 0) return null;
  let worse = buckets[0] ?? 0;
  for (let g = bucket + 1; g <= 6; g++) worse += buckets[g] ?? 0;
  return Math.min(100, Math.round((100 * worse) / solvers));
}
