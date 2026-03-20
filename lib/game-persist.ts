import type { LangGuessResult } from "@/lib/games/language";
import type { SnippetGuessResult } from "@/lib/games/reveal";

const QUIZ_V = 1;
const LANG_V = 1;
const REVEAL_V = 1;

function quizKey(dateKey: string, game: string) {
  return `swedle:quiz:v${QUIZ_V}:${dateKey}:${game}`;
}

function langKey(dateKey: string) {
  return `swedle:lang:v${LANG_V}:${dateKey}`;
}

function revealKey(dateKey: string) {
  return `swedle:reveal:v${REVEAL_V}:${dateKey}`;
}

type QuizPayload = {
  v: number;
  roundIndex: number;
  done: boolean;
};

type LangPayload = {
  v: number;
  rows: LangGuessResult[];
};

type RevealPayload = {
  v: number;
  rows: SnippetGuessResult[];
};

export function loadQuizProgress(
  dateKey: string,
  game: string,
): { roundIndex: number; done: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(quizKey(dateKey, game));
    if (!raw) return null;
    const p = JSON.parse(raw) as QuizPayload;
    if (
      p.v !== QUIZ_V ||
      typeof p.roundIndex !== "number" ||
      typeof p.done !== "boolean"
    ) {
      return null;
    }
    return { roundIndex: p.roundIndex, done: p.done };
  } catch {
    return null;
  }
}

export function saveQuizProgress(
  dateKey: string,
  game: string,
  data: { roundIndex: number; done: boolean },
) {
  if (typeof window === "undefined") return;
  const payload: QuizPayload = {
    v: QUIZ_V,
    roundIndex: data.roundIndex,
    done: data.done,
  };
  localStorage.setItem(quizKey(dateKey, game), JSON.stringify(payload));
}

export function loadLangProgress(dateKey: string): LangGuessResult[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(langKey(dateKey));
    if (!raw) return null;
    const p = JSON.parse(raw) as LangPayload;
    if (p.v !== LANG_V || !Array.isArray(p.rows)) return null;
    return p.rows;
  } catch {
    return null;
  }
}

export function saveLangProgress(dateKey: string, rows: LangGuessResult[]) {
  if (typeof window === "undefined") return;
  const payload: LangPayload = { v: LANG_V, rows };
  localStorage.setItem(langKey(dateKey), JSON.stringify(payload));
}

export function loadRevealProgress(dateKey: string): SnippetGuessResult[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(revealKey(dateKey));
    if (!raw) return null;
    const p = JSON.parse(raw) as RevealPayload;
    if (p.v !== REVEAL_V || !Array.isArray(p.rows)) return null;
    return p.rows;
  } catch {
    return null;
  }
}

export function saveRevealProgress(
  dateKey: string,
  rows: SnippetGuessResult[],
) {
  if (typeof window === "undefined") return;
  const payload: RevealPayload = { v: REVEAL_V, rows };
  localStorage.setItem(revealKey(dateKey), JSON.stringify(payload));
}
