export function getUtcDateKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Instant when the daily set rolls over: midnight UTC at the start of the next calendar day after `dateKey`. */
export function nextDailyRefreshUtc(dateKey: string): Date {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
