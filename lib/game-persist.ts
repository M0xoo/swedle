import type { LangGuessResult } from "@/lib/games/language";

const QUIZ_V = 1;
const LANG_V = 1;

function quizKey(dateKey: string, game: string) {
  return `swedle:quiz:v${QUIZ_V}:${dateKey}:${game}`;
}

function langKey(dateKey: string) {
  return `swedle:lang:v${LANG_V}:${dateKey}`;
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
