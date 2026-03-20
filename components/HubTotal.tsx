"use client";

import { useEffect, useState } from "react";
import {
  QUIZ_HUB_POINTS_MAX,
  QUIZ_SCORE_GAMES,
  readScore,
} from "@/lib/score";

export function HubTotal({ dateKey }: { dateKey: string }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    function refresh() {
      const t = QUIZ_SCORE_GAMES.reduce(
        (a, g) => a + readScore(dateKey, g),
        0,
      );
      setN(t);
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [dateKey]);

  return (
    <span className="font-mono-ui text-[var(--accent-bright)]">
      {n}
      <span className="text-[var(--muted2)]"> / {QUIZ_HUB_POINTS_MAX}</span>
    </span>
  );
}
