/**
 * Dev helper: print how `getDailyLanguage` varies by dateKey (mirrors lib/seed + lib/games/language).
 * Run: node scripts/check-lang-picks.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGUAGES = JSON.parse(
  readFileSync(join(root, "data", "languages.json"), "utf8"),
);

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(dateKey, salt = "") {
  return mulberry32(hashString(`swedle-v1|${dateKey}|${salt}`));
}

function pickOne(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function pick(dateKey) {
  return pickOne(createRng(dateKey, "lang"), LANGUAGES);
}

const n = LANGUAGES.length;
const counts = {};
for (let i = 0; i < 365; i++) {
  const d = new Date(Date.UTC(2026, 0, 1 + i));
  const dk = d.toISOString().slice(0, 10);
  const id = pick(dk).id;
  counts[id] = (counts[id] ?? 0) + 1;
}

console.log(`pool: ${n}`);
console.log(`unique picks in 2026: ${Object.keys(counts).length}`);
console.log(`csharp days in 2026: ${counts.csharp ?? 0}`);
for (const dk of ["2026-01-01", "2026-01-02", "2026-03-20", "2025-12-31"]) {
  console.log(`${dk} -> ${pick(dk).id}`);
}
