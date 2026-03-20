"use server";

import { languageById } from "@/lib/data";
import { getDailyComplexity } from "@/lib/games/complexity";
import {
  evaluateLanguageGuess,
  getDailyLanguage,
} from "@/lib/games/language";
import { getDailyIpoQuiz } from "@/lib/games/ipos";
import { getDailyStarBattle } from "@/lib/games/stars";
import { getDailyTimeline } from "@/lib/games/timeline";
import {
  evaluateRevealGuess,
  getDailyRevealSnippet,
} from "@/lib/games/reveal";

export async function submitLanguageGuess(dateKey: string, guessId: string) {
  const secret = getDailyLanguage(dateKey);
  return evaluateLanguageGuess(secret, guessId);
}

export async function submitRevealGuess(dateKey: string, guessId: string) {
  const s = getDailyRevealSnippet(dateKey);
  return evaluateRevealGuess(s.languageId, guessId);
}

export async function getRevealAnswer(dateKey: string) {
  const s = getDailyRevealSnippet(dateKey);
  const lang = languageById(s.languageId);
  return { id: s.languageId, name: lang?.name ?? s.languageId };
}

export async function getLangAnswer(dateKey: string) {
  const secret = getDailyLanguage(dateKey);
  return { id: secret.id, name: secret.name };
}

export async function submitStarPick(
  dateKey: string,
  roundIndex: number,
  side: "left" | "right",
) {
  const rounds = getDailyStarBattle(dateKey);
  const r = rounds[roundIndex];
  if (!r) return { ok: false as const, correct: false };
  const picked = side === "left" ? r.left : r.right;
  const correct = picked.id === r.winner.id;
  const winningSide = r.winner.id === r.left.id ? ("left" as const) : ("right" as const);
  return { ok: true as const, correct, winningSide };
}

export async function submitIpoPick(
  dateKey: string,
  roundIndex: number,
  side: "left" | "right",
) {
  const rounds = getDailyIpoQuiz(dateKey);
  const r = rounds[roundIndex];
  if (!r) return { ok: false as const, correct: false };
  const picked = side === "left" ? r.left : r.right;
  const correct = picked.id === r.winner.id;
  const winningSide = r.winner.id === r.left.id ? ("left" as const) : ("right" as const);
  return { ok: true as const, correct, winningSide };
}

export async function submitComplexityAnswer(
  dateKey: string,
  roundIndex: number,
  choiceIndex: 0 | 1 | 2,
) {
  const qs = getDailyComplexity(dateKey);
  const q = qs[roundIndex];
  if (!q) return { ok: false as const, correct: false };
  const correct = choiceIndex === q.answerIndex;
  return { ok: true as const, correct, answerIndex: q.answerIndex };
}

export async function submitTimelinePick(
  dateKey: string,
  roundIndex: number,
  side: "left" | "right",
) {
  const items = getDailyTimeline(dateKey);
  const t = items[roundIndex];
  if (!t) return { ok: false as const, correct: false };
  const picked = side === "left" ? t.left : t.right;
  const correct = picked.id === t.winner.id;
  const winningSide = t.winner.id === t.left.id ? ("left" as const) : ("right" as const);
  return { ok: true as const, correct, winningSide };
}
