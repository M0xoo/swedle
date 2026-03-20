export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(dateKey: string, salt = ""): () => number {
  const seed = hashString(`swedle-v1|${dateKey}|${salt}`);
  return mulberry32(seed);
}

export function pickMany<T>(rng: () => number, items: T[], count: number): T[] {
  const copy = [...items];
  const out: T[] = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
    out.push(copy[i]);
  }
  return out;
}

export function pickOne<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}
