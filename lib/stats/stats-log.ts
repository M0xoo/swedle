/** Server-only: set `SWEDLE_STATS_LOG=1` in production, or use `next dev` (logs on by default). */
export function isStatsLoggingEnabled(): boolean {
  return (
    process.env.SWEDLE_STATS_LOG === "1" || process.env.NODE_ENV !== "production"
  );
}

export function statsLog(...args: unknown[]): void {
  if (!isStatsLoggingEnabled()) return;
  console.info("[swedle:stats]", ...args);
}
