export function scoreKey(dateKey: string, game: string) {
  return `swedle:${dateKey}:${game}`;
}

export function readScore(dateKey: string, game: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(scoreKey(dateKey, game));
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function writeScore(dateKey: string, game: string, value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(scoreKey(dateKey, game), String(value));
}

export function bumpScore(dateKey: string, game: string, delta: number) {
  const next = readScore(dateKey, game) + delta;
  writeScore(dateKey, game, next);
  return next;
}
