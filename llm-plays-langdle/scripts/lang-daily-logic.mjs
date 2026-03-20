/**
 * Mirrors swedle lib/games/language + lib/seed for the same daily pick & feedback,
 * without TypeScript or @/ imports (loads JSON from repo root).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LANGUAGES = JSON.parse(
  readFileSync(join(repoRoot, "data", "languages.json"), "utf8"),
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
  const seed = hashString(`swedle-v1|${dateKey}|${salt}`);
  return mulberry32(seed);
}

function pickOne(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function languageById(id) {
  return LANGUAGES.find((l) => l.id === id);
}

function setEqual(a, b) {
  const sa = new Set(a);
  if (sa.size !== b.length) return false;
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

function platformOverlap(a, b) {
  const sa = new Set(a);
  let n = 0;
  for (const x of b) if (sa.has(x)) n++;
  return n;
}

function paradigmFeedback(secret, guess) {
  if (secret.paradigm === guess.paradigm) return "green";
  const s = new Set(secret.paradigms);
  for (const p of guess.paradigms) {
    if (s.has(p)) return "orange";
  }
  return "gray";
}

function openSourceFeedback(secret, guess) {
  return secret.openSource === guess.openSource ? "green" : "gray";
}

function executionFeedback(secret, guess) {
  if (secret.execution === guess.execution) return "green";
  if (secret.execution === "hybrid" || guess.execution === "hybrid") {
    const pair = new Set([secret.execution, guess.execution]);
    if (pair.has("compiled") && pair.has("interpreted")) return "orange";
    if (pair.has("hybrid") && (pair.has("compiled") || pair.has("interpreted")))
      return "orange";
  }
  return "gray";
}

function platformsFeedback(secret, guess) {
  if (setEqual(secret.platforms, guess.platforms)) return "green";
  if (platformOverlap(secret.platforms, guess.platforms) > 0) return "orange";
  return "gray";
}

function yearFeedback(secret, guess) {
  const d = Math.abs(secret.year - guess.year);
  if (d === 0) return "green";
  if (d <= 5) return "orange";
  return "gray";
}

export function getDailyLanguage(dateKey) {
  const rng = createRng(dateKey, "lang");
  return pickOne(rng, LANGUAGES);
}

/** Sorted id+name list for LLM prompts and UI replay. */
export function getLanguageDirectory() {
  return LANGUAGES.map((l) => ({ id: l.id, name: l.name })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function evaluateLanguageGuess(secret, guessId) {
  const guess = languageById(guessId);
  if (!guess) return null;
  const cells = {
    paradigm: paradigmFeedback(secret, guess),
    openSource: openSourceFeedback(secret, guess),
    execution: executionFeedback(secret, guess),
    platforms: platformsFeedback(secret, guess),
    year: yearFeedback(secret, guess),
  };
  const solved = guess.id === secret.id;
  let yearHint = null;
  if (secret.year !== guess.year) {
    yearHint = secret.year > guess.year ? "up" : "down";
  }
  return { guess, cells, yearHint, solved };
}

/**
 * Build a short win sequence: N decoy wrong guesses + correct answer (same daily as production).
 */
export function buildLangGuessPlan(dateKey, wrongBeforeWin = 3) {
  const secret = getDailyLanguage(dateKey);
  const rng = createRng(dateKey, "llm-guess-order");
  const others = LANGUAGES.filter((l) => l.id !== secret.id);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const n = Math.min(wrongBeforeWin, others.length);
  const wrongs = others.slice(0, n);
  const sequence = [...wrongs, secret];
  return {
    dateKey,
    secret,
    guesses: sequence,
    wrongNames: wrongs.map((l) => l.name),
  };
}
