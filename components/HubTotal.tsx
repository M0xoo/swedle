"use client";

import { useEffect, useState } from "react";
import { readScore } from "@/lib/score";

const GAMES = ["stars", "ipo", "complexity", "timeline"] as const;

export function HubTotal({ dateKey }: { dateKey: string }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    function refresh() {
      const t = GAMES.reduce((a, g) => a + readScore(dateKey, g), 0);
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
      <span className="text-[var(--muted2)]"> / 20</span>
    </span>
  );
}
