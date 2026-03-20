"use client";

import { useEffect, useState } from "react";
import { loadQuizProgress, saveQuizProgress } from "@/lib/game-persist";

export type PersistedQuizGame =
  | "stars"
  | "ipo"
  | "timeline"
  | "complexity";

export function usePersistedQuiz(
  dateKey: string,
  game: PersistedQuizGame,
  total: number,
) {
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const maxI = Math.max(0, total - 1);
    const saved = loadQuizProgress(dateKey, game);
    if (saved) {
      setDone(saved.done);
      setI(Math.min(Math.max(0, saved.roundIndex), maxI));
    } else {
      setDone(false);
      setI(0);
    }
    setReady(true);
  }, [dateKey, game, total]);

  useEffect(() => {
    if (!ready) return;
    saveQuizProgress(dateKey, game, { roundIndex: i, done });
  }, [ready, dateKey, game, i, done]);

  return { i, setI, done, setDone, ready };
}
